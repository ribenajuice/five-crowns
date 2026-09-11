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
  it("PUTs an object, then GETs the same bytes back", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = `photo-${randomUUID()}`;

    const putUrl = (await storage.presignPut(photoId, "original")).url;
    const { PUT, GET } = await import(
      "@/app/api/dev-photos/[photoId]/[variant]/route"
    );

    const bytes = new TextEncoder().encode("a real jpeg, honestly");
    const putResponse = await PUT(
      new Request(`https://five-crowns.test${putUrl}`, {
        method: "PUT",
        headers: { "content-type": "image/jpeg" },
        body: bytes,
      }),
      { params: Promise.resolve({ photoId, variant: "original.jpg" }) },
    );
    expect(putResponse.status).toBe(200);

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
    const response = await GET(
      new Request(`https://five-crowns.test/api/dev-photos/anything/original.jpg`),
      { params: Promise.resolve({ photoId: "anything", variant: "original.jpg" }) },
    );
    expect(response.status).toBe(403);
  });

  it("refuses a PUT whose body isn't declared image/jpeg", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = `photo-${randomUUID()}`;
    const putUrl = (await storage.presignPut(photoId, "model")).url;
    const { PUT } = await import("@/app/api/dev-photos/[photoId]/[variant]/route");

    const response = await PUT(
      new Request(`https://five-crowns.test${putUrl}`, {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "not a photo",
      }),
      { params: Promise.resolve({ photoId, variant: "model.jpg" }) },
    );
    expect(response.status).toBe(415);
  });

  it("⚠️ criterion 12: a link stops working after five minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00Z"));

    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = `photo-${randomUUID()}`;
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

  it("refuses a signature that has been tampered with", async () => {
    const { getPhotoStorage, resetPhotoStorage } = await import("@/lib/photos/storage");
    resetPhotoStorage();
    const storage = getPhotoStorage();
    const photoId = `photo-${randomUUID()}`;
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
    const photoId = `photo-${randomUUID()}`;
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
    const photoId = `photo-${randomUUID()}`;
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
});
