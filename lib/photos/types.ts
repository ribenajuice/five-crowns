/**
 * The photo storage abstraction.
 *
 * Two implementations behind one interface: `s3.ts` for production, `local.ts`
 * for development and QA, so neither touches AWS. Selected by `storage.ts`.
 */

export type PhotoVariant = "original" | "model";

export interface PresignedUrl {
  url: string;
  /** ISO timestamp, five minutes out (PRD criterion 12). */
  expiresAt: string;
}

export interface PhotoStorage {
  /** A 5-minute presigned PUT, `Content-Type: image/jpeg` signed in. */
  presignPut(photoId: string, variant: PhotoVariant): Promise<PresignedUrl>;
  /** A 5-minute presigned GET. */
  presignGet(photoId: string, variant: PhotoVariant): Promise<PresignedUrl>;
  /** Whether the object actually exists — `HeadObject` in S3, `stat` locally. */
  objectExists(photoId: string, variant: PhotoVariant): Promise<boolean>;
}

/** Five minutes — the expiry the PRD requires for every presigned photo URL. */
export const PRESIGN_EXPIRY_SECONDS = 5 * 60;
