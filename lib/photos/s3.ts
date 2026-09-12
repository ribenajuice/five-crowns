/**
 * The production photo driver: S3, private bucket, presigned URLs.
 *
 * ⚠️ Never used in local development or in tests — see `storage.ts`, which
 * only selects this driver when `PHOTOS_BUCKET` is set and `PHOTOS_STORAGE`
 * isn't forced to `local`.
 */

import "server-only";

import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { photoKey } from "./keys";
import {
  MAX_UPLOAD_BYTES,
  PRESIGN_EXPIRY_SECONDS,
  type PhotoStorage,
  type PhotoVariant,
} from "./types";

export class MissingPhotosBucketError extends Error {
  override name = "MissingPhotosBucketError";
  constructor() {
    super("PHOTOS_BUCKET is not set. It is non-secret config, set in sst.config.ts.");
  }
}

function bucketName(env: NodeJS.ProcessEnv = process.env): string {
  const bucket = env.PHOTOS_BUCKET;
  if (!bucket) throw new MissingPhotosBucketError();
  return bucket;
}

/** ap-southeast-2 (Sydney) unless AWS_REGION says otherwise. */
function region(env: NodeJS.ProcessEnv = process.env): string {
  return env.AWS_REGION ?? "ap-southeast-2";
}

let client: S3Client | undefined;
function s3(): S3Client {
  if (!client) client = new S3Client({ region: region() });
  return client;
}

function expiresAtIso(seconds: number = PRESIGN_EXPIRY_SECONDS): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? (error as { name?: unknown }).name : undefined;
  if (name === "NotFound" || name === "NoSuchKey") return true;
  const metadata =
    "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      : undefined;
  return metadata?.httpStatusCode === 404;
}

export function s3PhotoStorage(): PhotoStorage {
  return {
    /**
     * ⚠️ **Security review, MEDIUM 1.** A presigned PUT has no cap on size
     * (up to S3's own 5 GB limit) and can be re-sent as many times as the
     * signer's expiry allows. A presigned POST is bounded by an explicit,
     * signed policy — a wrong-shaped upload is refused by S3 itself, not by
     * this app after the fact.
     */
    async presignPost(photoId: string, variant: PhotoVariant) {
      const key = photoKey(photoId, variant);
      const { url, fields } = await createPresignedPost(s3(), {
        Bucket: bucketName(),
        Key: key,
        Conditions: [
          ["eq", "$key", key],
          ["content-length-range", 1, MAX_UPLOAD_BYTES],
          ["eq", "$Content-Type", "image/jpeg"],
        ],
        Fields: {
          "Content-Type": "image/jpeg",
        },
        Expires: PRESIGN_EXPIRY_SECONDS,
      });
      return { url, fields, expiresAt: expiresAtIso() };
    },

    async presignGet(photoId: string, variant: PhotoVariant) {
      const command = new GetObjectCommand({
        Bucket: bucketName(),
        Key: photoKey(photoId, variant),
        // ⚠️ Security review, LOW 3. Content-type isn't part of the signed
        // request (S3's presigner marks it unsignable unconditionally — see
        // tests/photos/s3-signing.test.ts), so this at least makes the
        // *response* honest: whatever the object's stored metadata says, the
        // browser is told it's an image/jpeg, not whatever a mismatched
        // upload might have left behind.
        ResponseContentType: "image/jpeg",
      });
      const url = await getSignedUrl(s3(), command, {
        expiresIn: PRESIGN_EXPIRY_SECONDS,
      });
      return { url, expiresAt: expiresAtIso() };
    },

    async objectExists(photoId: string, variant: PhotoVariant) {
      try {
        await s3().send(
          new HeadObjectCommand({
            Bucket: bucketName(),
            Key: photoKey(photoId, variant),
          }),
        );
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
  };
}
