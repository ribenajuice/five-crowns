/**
 * Which photo driver is in effect.
 *
 * ⚠️ **Local development and QA must never touch the real bucket.** The local
 * driver is selected whenever `PHOTOS_STORAGE=local` is set explicitly, or
 * `PHOTOS_BUCKET` is simply absent — which is the normal state of a developer's
 * machine, where there is no bucket to point at.
 */

import "server-only";

import { localPhotoStorage } from "./local";
import { s3PhotoStorage } from "./s3";
import type { PhotoStorage } from "./types";

export type PhotoStorageMode = "local" | "s3";

export function photoStorageMode(
  env: NodeJS.ProcessEnv = process.env,
): PhotoStorageMode {
  if (env.PHOTOS_STORAGE === "local") return "local";
  if (env.PHOTOS_STORAGE === "s3") return "s3";
  return env.PHOTOS_BUCKET ? "s3" : "local";
}

let cached: PhotoStorage | undefined;
let cachedMode: PhotoStorageMode | undefined;

export function getPhotoStorage(): PhotoStorage {
  const mode = photoStorageMode();
  if (!cached || cachedMode !== mode) {
    cached = mode === "local" ? localPhotoStorage() : s3PhotoStorage();
    cachedMode = mode;
  }
  return cached;
}

/** Tests only — the mode can change between cases. */
export function resetPhotoStorage(): void {
  cached = undefined;
  cachedMode = undefined;
}

/**
 * ⚠️ **The one thing standing between the dev-photos routes and being callable
 * in production.** True only when the local driver is actually selected *and*
 * this process is not a deployed Lambda. Both conditions, always — see
 * `app/api/dev-photos/[photoId]/[variant]/route.ts`.
 */
export function localDevPhotosAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return photoStorageMode(env) === "local" && !env.AWS_LAMBDA_FUNCTION_NAME;
}
