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
});

describe("s3PhotoStorage — presigned PUT", () => {
  it("points at photos/{photoId}/model.jpg on the configured bucket, five minutes out", async () => {
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { url } = await storage.presignPut(PHOTO_ID, "model");

    const parsed = new URL(url);
    expect(parsed.hostname).toBe(BUCKET_HOST);
    expect(parsed.pathname).toBe(`/photos/${PHOTO_ID}/model.jpg`);
    expect(paramsOf(url).get("X-Amz-Expires")).toBe("300");
  });

  it("⚠️ content-type is NOT among the signed headers — a library limitation, documented rather than hidden", async () => {
    // `S3RequestPresigner.prepareRequest`, inside `@aws-sdk/s3-request-presigner`
    // itself, unconditionally runs `unsignableHeaders.add("content-type")` for
    // every presigned request, with no option that overrides it. So while
    // `presignPut` puts `ContentType: "image/jpeg"` on the `PutObjectCommand` —
    // which becomes the object's stored content-type *if* the browser's PUT
    // sends that exact header — a PUT sent with a different `Content-Type` is
    // not refused by SigV4: `content-type` never appears in
    // `X-Amz-SignedHeaders`, so there is nothing for the signature to check it
    // against. `docs/ARCHITECTURE.md`'s "Content-Type: image/jpeg signed in"
    // is aspirational against this SDK version; flagged back to the architect
    // rather than asserted here as something it doesn't do.
    const { s3PhotoStorage } = await import("@/lib/photos/s3");
    const storage = s3PhotoStorage();
    const { url } = await storage.presignPut(PHOTO_ID, "original");

    const signedHeaders = paramsOf(url).get("X-Amz-SignedHeaders");
    expect(signedHeaders).toBe("host");
    expect(signedHeaders).not.toContain("content-type");
  });
});
