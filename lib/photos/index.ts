/**
 * Photo storage: S3 in production, a local file driver in development and QA.
 *
 * ⚠️ Never imported by `lib/scoring` or `lib/config` — see their ESLint
 * `no-restricted-imports` rules. Consumers use {@link getPhotoStorage} and
 * {@link photoKey}; the two drivers are an implementation detail.
 */

export * from "./types";
export * from "./keys";
export {
  getPhotoStorage,
  localDevPhotosAllowed,
  photoStorageMode,
  resetPhotoStorage,
  type PhotoStorageMode,
} from "./storage";
