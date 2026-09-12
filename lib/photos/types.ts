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

/**
 * A presigned S3 POST (the security review's fix for MEDIUM 1: an open-ended
 * presigned PUT accepts up to 5 GB and can be replayed for its whole expiry
 * window). The browser POSTs `multipart/form-data`: every `fields` entry,
 * then the file last as `file`. Every value in `fields` is a string, ready to
 * drop straight into a `FormData`.
 */
export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
  /** ISO timestamp, five minutes out (PRD criterion 12). */
  expiresAt: string;
}

export interface PhotoStorage {
  /**
   * A 5-minute presigned POST, policy-constrained to this exact key, 1–
   * {@link MAX_UPLOAD_BYTES} bytes, and `Content-Type: image/jpeg`.
   */
  presignPost(photoId: string, variant: PhotoVariant): Promise<PresignedPost>;
  /** A 5-minute presigned GET. */
  presignGet(photoId: string, variant: PhotoVariant): Promise<PresignedUrl>;
  /** Whether the object actually exists — `HeadObject` in S3, `stat` locally. */
  objectExists(photoId: string, variant: PhotoVariant): Promise<boolean>;
}

/** Five minutes — the expiry the PRD requires for every presigned photo URL. */
export const PRESIGN_EXPIRY_SECONDS = 5 * 60;

/**
 * The upload policy's `content-length-range` upper bound. A downscaled
 * `model.jpg` and a 3000px-capped `original.jpg` are both a few MB at most
 * (`docs/ARCHITECTURE.md` § Flow 2); 8 MB is generous headroom, not a target.
 */
export const MAX_UPLOAD_BYTES = 8_000_000;
