/**
 * The production photo driver: S3, private bucket, presigned URLs.
 *
 * ⚠️ Never used in local development or in tests — see `storage.ts`, which
 * only selects this driver when `PHOTOS_BUCKET` is set and `PHOTOS_STORAGE`
 * isn't forced to `local`.
 */

import "server-only";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { photoKey } from "./keys";
import { PRESIGN_EXPIRY_SECONDS, type PhotoStorage, type PhotoVariant } from "./types";

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
    async presignPut(photoId: string, variant: PhotoVariant) {
      const command = new PutObjectCommand({
        Bucket: bucketName(),
        Key: photoKey(photoId, variant),
        ContentType: "image/jpeg",
      });
      const url = await getSignedUrl(s3(), command, {
        expiresIn: PRESIGN_EXPIRY_SECONDS,
      });
      return { url, expiresAt: expiresAtIso() };
    },

    async presignGet(photoId: string, variant: PhotoVariant) {
      const command = new GetObjectCommand({
        Bucket: bucketName(),
        Key: photoKey(photoId, variant),
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
