/**
 * `lib/photos/s3.ts`'s presigned URLs — pure local SigV4 maths. Dummy static
 * credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) are enough for the
 * SDK's default credential provider chain to resolve synchronously, with no
 * network call and no real AWS account.
 */

import { beforeAll, describe, expect, it } from "vitest";

const PHOTO_ID = "11111111-1111-1111-1111-111111111111";
const BUCKET_HOST = "five-crowns-photos.s3.ap-southeast-2.amazonaws.com";

beforeAll(() => {
  process.env.AWS_ACCESS_KEY_ID = "AKIDEXAMPLE";
  process.env.AWS_SECRET_ACCESS_KEY = "x";
  process.env.AWS_REGION = "ap-southeast-2";
  process.env.PHOTOS_BUCKET = "five-crowns-photos";
});

function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

function decodePolicy(base64Policy: string): { expiration: string; conditions: unknown[] } {
  return JSON.parse(Buffer.from(base64Policy, "base64").toString("utf8"));
}

describe("s3PhotoStorage — presigned GET", () => {
  it("points at photos/{photoId}/{original,model}.jpg on the configured bucket", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();

    const original = await storage.presignGet(PHOTO_ID, "original");
    const model = await storage.presignGet(PHOTO_ID, "model");

    const originalUrl = new URL(original.url);
    expect(originalUrl.hostname).toBe(BUCKET_HOST);
    expect(originalUrl.pathname).toBe(`/photos/${PHOTO_ID}/original.jpg`);
    expect(new URL(model.url).pathname).toBe(`/photos/${PHOTO_ID}/model.jpg`);
  });

  it("⚠️ criterion 12: carries a five-minute expiry (X-Amz-Expires=300)", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { url } = await storage.presignGet(PHOTO_ID, "original");
    expect(paramsOf(url).get("X-Amz-Expires")).toBe("300");
  });

  it("⚠️ security review LOW 3: the response is told it's image/jpeg (response-content-type)", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { url } = await storage.presignGet(PHOTO_ID, "model");
    expect(paramsOf(url).get("response-content-type")).toBe("image/jpeg");
  });
});

describe("s3PhotoStorage — presigned POST (security review MEDIUM 1)", () => {
  it("carries the exact key as a field, and Content-Type: image/jpeg (the shape the front end posts as multipart/form-data)", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { url, fields } = await storage.presignPost(PHOTO_ID, "model");

    expect(url).toBe(`https://${BUCKET_HOST}/`);
    expect(fields.key).toBe(`photos/${PHOTO_ID}/model.jpg`);
    expect(fields.bucket).toBe("five-crowns-photos");
    expect(fields["Content-Type"]).toBe("image/jpeg");
    // Every field is a string, ready to drop straight into a FormData.
    for (const value of Object.values(fields)) {
      expect(typeof value).toBe("string");
    }
  });

  it("policy conditions: the exact key, 1–8,000,000 bytes, and Content-Type: image/jpeg", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { fields } = await storage.presignPost(PHOTO_ID, "original");

    const policy = decodePolicy(fields.Policy!);
    expect(policy.conditions).toContainEqual(["eq", "$key", `photos/${PHOTO_ID}/original.jpg`]);
    expect(policy.conditions).toContainEqual(["content-length-range", 1, 8_000_000]);
    expect(policy.conditions).toContainEqual(["eq", "$Content-Type", "image/jpeg"]);
  });

  it("⚠️ criterion 12: expires five minutes from now", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const before = Date.now();
    const { fields } = await storage.presignPost(PHOTO_ID, "original");
    const policy = decodePolicy(fields.Policy!);

    const expiresAt = new Date(policy.expiration).getTime();
    const seconds = (expiresAt - before) / 1000;
    expect(seconds).toBeGreaterThan(295);
    expect(seconds).toBeLessThanOrEqual(305);
  });
});
