/**
 * The local photo driver and its dev-only routes — the only way criteria 9
 * (both objects exist, an unauthenticated GET is denied) and 12 (a presigned
 * URL expires in five minutes) can be exercised with no AWS account.
 */

import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ⚠️ No `.data/photos` cleanup in this file — see tests/games/save.test.ts,
// which explains why: vitest's `fileParallelism` runs test files
// concurrently, and a shared rm() would race another file's fixtures.
beforeEach(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "local-photo-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Matches `presignPost`'s `fields`, so a form can be built without a browser. */
function formFrom(fields: Record<string, string>, fileBytes: BlobPart): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.set("file", new Blob([fileBytes], { type: "image/jpeg" }), "photo.jpg");
  return form;
}

describe("photoStorageMode / localDevPhotosAllowed", () => {
  it("is local when PHOTOS_STORAGE=local, s3 when a bucket is set and not forced local", async () => {
    const { photoStorageMode } = await import("@/lib/photos/storage");
    expect(photoStorageMode({ PHOTOS_STORAGE: "local" } as unknown as NodeJS.ProcessEnv)).toBe("local");
    expect(photoStorageMode({} as unknown as NodeJS.ProcessEnv)).toBe("local");
    expect(
      photoStorageMode({ PHOTOS_BUCKET: "five-crowns-photos" } as unknown as NodeJS.ProcessEnv),
    ).toBe("s3");
  });

  it("⚠️ refuses the dev driver on a deployed Lambda, whatever PHOTOS_STORAGE says", async () => {
    const { localDevPhotosAllowed } = await import("@/lib/photos/storage");
    expect(
      localDevPhotosAllowed({
        PHOTOS_STORAGE: "local",
        AWS_LAMBDA_FUNCTION_NAME: "five-crowns-prod",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      localDevPhotosAllowed({ PHOTOS_STORAGE: "local" } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      localDevPhotosAllowed({ PHOTOS_BUCKET: "five-crowns-photos" } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

describe("the local driver, end to end through the dev-photos route", () => {
  it("POSTs a multipart upload, then GETs the same bytes back", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();

    const { url, fields } = await storage.presignPost(photoId, "original");
    const { POST, GET } = await import(
      "@/app/api/dev-photos/[photoId]/[variant]/route"
    );

    const bytes = new TextEncoder().encode("a real jpeg, honestly");
    const postResponse = await POST(
      new Request(`https://five-crowns.test${url}`, {
        method: "POST",
        body: formFrom(fields, bytes),
      }),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(postResponse.status).toBe(204);

    expect(await storage.objectExists(photoId, "original")).toBe(true);
    expect(await storage.objectExists(photoId, "model")).toBe(false);

    const getUrl = (await storage.presignGet(photoId, "original")).url;
    const getResponse = await GET(
      new Request(`https://five-crowns.test${getUrl}`),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(getResponse.status).toBe(200);
    expect(new Uint8Array(await getResponse.arrayBuffer())).toEqual(bytes);
  });

  it("⚠️ criterion 9: a GET with no signature at all is denied", async () => {
    const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
    const photoId = randomUUID();
    const response = await GET(
      new Request(`https://five-crowns.test/api/dev-photos/${photoId}/original.jpg`),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(response.status).toBe(403);
  });

  it("⚠️ security review LOW 5: a photoId that isn't a UUID 404s rather than 403ing", async () => {
    const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
    const response = await GET(
      new Request("https://five-crowns.test/api/dev-photos/not-a-uuid/original.jpg"),
      { params: Promise.resolve({ photoId: "not-a-uuid", variant: "original.jpg" }) },
    );
    expect(response.status).toBe(404);
  });

  it("⚠️ security review MEDIUM 1: refuses an upload whose Content-Type field isn't image/jpeg", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    const { url, fields } = await storage.presignPost(photoId, "model");
    const { POST } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");

    const response = await POST(
      new Request(`https://five-crowns.test${url}`, {
        method: "POST",
        body: formFrom({ ...fields, "Content-Type": "text/plain" }, new TextEncoder().encode("not a photo")),
      }),
      { params: Promise.resolve({ photoId, variant: "model.jpg" }) },
    );
    expect(response.status).toBe(415);
  });

  it("⚠️ security review MEDIUM 1: refuses an upload over the size cap", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    const { url, fields } = await storage.presignPost(photoId, "original");
    const { POST } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
    const { MAX_UPLOAD_BYTES } = await import("@/lib/photos/types");

    const response = await POST(
      new Request(`https://five-crowns.test${url}`, {
        method: "POST",
        body: formFrom(fields, new Uint8Array(MAX_UPLOAD_BYTES + 1)),
      }),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(response.status).toBe(400);
    expect(await storage.objectExists(photoId, "original")).toBe(false);
  });

  it("refuses an upload with a tampered signature field", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    const { url, fields } = await storage.presignPost(photoId, "original");
    const { POST } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");

    const response = await POST(
      new Request(`https://five-crowns.test${url}`, {
        method: "POST",
        body: formFrom({ ...fields, "x-fc-sig": "0".repeat(64) }, new TextEncoder().encode("bytes")),
      }),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(response.status).toBe(403);
  });

  it("⚠️ criterion 12: a link stops working after five minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00Z"));

    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    await import("@/lib/photos/local").then(({ writeLocalPhoto }) =>
      writeLocalPhoto(photoId, "original", Buffer.from("hello")),
    );

    const { url } = await storage.presignGet(photoId, "original");
    expect(new URL(url, "https://five-crowns.test").searchParams.get("exp")).toBe(
      String(Math.floor(new Date("2026-09-11T00:05:00Z").getTime() / 1000)),
    );

    const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");

    const stillGood = await GET(new Request(`https://five-crowns.test${url}`), {
      params: Promise.resolve({ photoId, variant: "original.jpg" }),
    });
    expect(stillGood.status).toBe(200);

    vi.setSystemTime(new Date("2026-09-11T00:05:01Z"));
    const expired = await GET(new Request(`https://five-crowns.test${url}`), {
      params: Promise.resolve({ photoId, variant: "original.jpg" }),
    });
    expect(expired.status).toBe(403);
  });

  it("refuses a GET signature that has been tampered with", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    await import("@/lib/photos/local").then(({ writeLocalPhoto }) =>
      writeLocalPhoto(photoId, "original", Buffer.from("hello")),
    );
    const { url } = await storage.presignGet(photoId, "original");
    const tampered = url.replace(/sig=[^&]+/, "sig=0000000000000000000000000000000000000000000000000000000000000000");

    const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
    const response = await GET(new Request(`https://five-crowns.test${tampered}`), {
      params: Promise.resolve({ photoId, variant: "original.jpg" }),
    });
    expect(response.status).toBe(403);
  });
});

describe("⚠️ impossible in production — refused unless the local driver AND no Lambda", () => {
  it("refuses even a validly signed URL when running on a deployed Lambda", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    await import("@/lib/photos/local").then(({ writeLocalPhoto }) =>
      writeLocalPhoto(photoId, "original", Buffer.from("hello")),
    );
    const { url } = await storage.presignGet(photoId, "original");

    process.env.AWS_LAMBDA_FUNCTION_NAME = "five-crowns-prod-web";
    try {
      const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
      const response = await GET(new Request(`https://five-crowns.test${url}`), {
        params: Promise.resolve({ photoId, variant: "original.jpg" }),
      });
      expect(response.status).toBe(404);
    } finally {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    }
  });

  it("refuses when the storage mode is s3, even with a validly signed URL and no Lambda", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    await import("@/lib/photos/local").then(({ writeLocalPhoto }) =>
      writeLocalPhoto(photoId, "original", Buffer.from("hello")),
    );
    const { url } = await storage.presignGet(photoId, "original");

    process.env.PHOTOS_STORAGE = "s3";
    process.env.PHOTOS_BUCKET = "five-crowns-photos";
    try {
      const { GET } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
      const response = await GET(new Request(`https://five-crowns.test${url}`), {
        params: Promise.resolve({ photoId, variant: "original.jpg" }),
      });
      expect(response.status).toBe(404);
    } finally {
      process.env.PHOTOS_STORAGE = "local";
      delete process.env.PHOTOS_BUCKET;
    }
  });

  it("refuses even a validly signed POST when running on a deployed Lambda", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = randomUUID();
    const { url, fields } = await storage.presignPost(photoId, "original");

    process.env.AWS_LAMBDA_FUNCTION_NAME = "five-crowns-prod-web";
    try {
      const { POST } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");
      const response = await POST(
        new Request(`https://five-crowns.test${url}`, {
          method: "POST",
          body: formFrom(fields, new TextEncoder().encode("bytes")),
        }),
        { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
      );
      expect(response.status).toBe(404);
      expect(await storage.objectExists(photoId, "original")).toBe(false);
    } finally {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    }
  });
});
