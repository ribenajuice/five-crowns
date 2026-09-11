/**
 * Client-side constants for the capture and review flow.
 *
 * `docs/ARCHITECTURE.md` § Flow 2, step 1: two JPEGs are produced in the
 * browser before anything uploads — a permanent `original.jpg` and a smaller
 * `model.jpg` sized for the vision call. Stage 2 never calls the model, but
 * the same two objects are still produced and stored, because a Stage 2 game
 * must be re-transcribable later without re-photographing.
 */

import { MAX_UPLOAD_BYTES as SERVER_MAX_UPLOAD_BYTES } from "@/lib/photos/types";

/** `original.jpg`: long edge capped at 3000px, quality 0.9. */
export const ORIGINAL_MAX_LONG_EDGE = 3000;
export const ORIGINAL_JPEG_QUALITY = 0.9;

/** `model.jpg`: long edge 1568px, quality 0.85. */
export const MODEL_MAX_LONG_EDGE = 1568;
export const MODEL_JPEG_QUALITY = 0.85;

/**
 * The security review's cap on a presigned upload's body (`lib/photos/types.ts`,
 * the same value the S3 policy condition enforces server-side). `original.jpg`
 * at 3000px/q0.9 is normally well under this; the export pipeline steps
 * quality down if it isn't. A small safety margin under the server's own
 * number, so a multipart request that's a few hundred bytes of form overhead
 * heavier than the raw JPEG never gets rejected right at the policy edge.
 */
export const MAX_UPLOAD_BYTES = SERVER_MAX_UPLOAD_BYTES - 50_000;
export const JPEG_QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4] as const;

/** PUT /api/drafts/{id}, debounced (PRD criterion 28). */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

/** The grid's row pitch, matching `--pitch` in app/globals.css. */
export const REVIEW_ROW_PITCH_PX = 46;
