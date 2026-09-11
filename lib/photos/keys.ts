/**
 * The S3 key layout. Stable forever — `docs/ARCHITECTURE.md` § Flow 2, Step 3.
 */

import type { PhotoVariant } from "./types";

export function photoKey(photoId: string, variant: PhotoVariant): string {
  return `photos/${photoId}/${variant}.jpg`;
}
