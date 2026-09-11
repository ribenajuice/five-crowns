/**
 * The local photo driver — development and QA, never production.
 *
 * Files live under the gitignored `.data/photos/{photoId}/{variant}.jpg`, and
 * are served through the dev-only routes at `app/api/dev-photos/...`, whose
 * URLs are HMAC-signed with a five-minute expiry (see `local-url.ts`) so
 * criteria 9 and 12 (object existence, presigned-GET expiry) are testable with
 * no AWS account. Selected by `storage.ts` when `PHOTOS_STORAGE=local` or
 * `PHOTOS_BUCKET` is unset — see `lib/config/README.md` § Local development.
 */

import "server-only";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { signLocalPhotoUrl } from "./local-url";
import { PRESIGN_EXPIRY_SECONDS, type PhotoStorage, type PhotoVariant } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data", "photos");

function filePath(photoId: string, variant: PhotoVariant): string {
  // photoId is always our own crypto.randomUUID(), never client path input, so
  // there is nothing here to traverse.
  return path.join(DATA_DIR, photoId, `${variant}.jpg`);
}

async function signedUrl(
  photoId: string,
  variant: PhotoVariant,
  method: "GET" | "PUT",
): Promise<{ url: string; expiresAt: string }> {
  const expiresAtMs = Date.now() + PRESIGN_EXPIRY_SECONDS * 1000;
  const exp = Math.floor(expiresAtMs / 1000);
  const sig = await signLocalPhotoUrl({ photoId, variant, method, exp });
  const url = `/api/dev-photos/${encodeURIComponent(photoId)}/${variant}.jpg?exp=${exp}&sig=${sig}`;
  return { url, expiresAt: new Date(expiresAtMs).toISOString() };
}

export function localPhotoStorage(): PhotoStorage {
  return {
    presignPut: (photoId, variant) => signedUrl(photoId, variant, "PUT"),
    presignGet: (photoId, variant) => signedUrl(photoId, variant, "GET"),
    async objectExists(photoId, variant) {
      try {
        const info = await stat(filePath(photoId, variant));
        return info.isFile();
      } catch {
        return false;
      }
    },
  };
}

/** Used only by the dev-photos route handler itself. */
export async function readLocalPhoto(
  photoId: string,
  variant: PhotoVariant,
): Promise<Buffer | null> {
  try {
    return await readFile(filePath(photoId, variant));
  } catch {
    return null;
  }
}

/** Used only by the dev-photos route handler itself. */
export async function writeLocalPhoto(
  photoId: string,
  variant: PhotoVariant,
  data: Buffer,
): Promise<void> {
  await mkdir(path.join(DATA_DIR, photoId), { recursive: true });
  await writeFile(filePath(photoId, variant), data);
}
