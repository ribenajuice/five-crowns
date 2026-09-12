"use client";

/**
 * The capture pipeline: file → EXIF-upright canvas → founder's rotation →
 * two exported JPEGs.
 *
 * `docs/ARCHITECTURE.md` § Flow 2, step 1. This is DOM orchestration (canvas,
 * `Image`, `Blob`) built on the pure maths in `exif.ts`, `rotation.ts` and
 * `resize.ts`, which is what's unit tested — there's no jsdom in this
 * project's vitest config, so canvas drawing itself isn't exercised by a test.
 */

import {
  JPEG_QUALITY_STEPS,
  MAX_UPLOAD_BYTES,
  MODEL_JPEG_QUALITY,
  MODEL_MAX_LONG_EDGE,
  ORIGINAL_JPEG_QUALITY,
  ORIGINAL_MAX_LONG_EDGE,
} from "./constants";
import { parseJpegOrientation } from "./exif";
import { computeDownscaleDimensions } from "./resize";
import { orientationToTransform, type Rotation } from "./rotation";

export interface LoadedPhoto {
  /** The EXIF-corrected image, upright, drawn once and reused for every export. */
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  return ctx;
}

/** Load a file, apply its EXIF orientation, and return the upright canvas. */
export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  const buffer = await file.arrayBuffer();
  const orientation = parseJpegOrientation(buffer);
  const transform = orientationToTransform(orientation);

  const bitmap = await createImageBitmap(
    new Blob([buffer], { type: file.type || "image/jpeg" }),
  );

  const swapped = transform.rotate === 90 || transform.rotate === 270;
  const width = swapped ? bitmap.height : bitmap.width;
  const height = swapped ? bitmap.width : bitmap.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = requireContext(canvas);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((transform.rotate * Math.PI) / 180);
  if (transform.flip) ctx.scale(-1, 1);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();
  bitmap.close();

  return { canvas, width, height };
}

/** Redraw a canvas rotated a further quarter turn — the founder's `RotateControl` tap. */
export function rotateCanvas(
  source: HTMLCanvasElement,
  degrees: Rotation,
): HTMLCanvasElement {
  if (degrees === 0) return source;

  const swapped = degrees === 90 || degrees === 270;
  const width = swapped ? source.height : source.width;
  const height = swapped ? source.width : source.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = requireContext(canvas);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();

  return canvas;
}

function scaledCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (width === source.width && height === source.height) return source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = requireContext(canvas);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode JPEG."))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Encode as a JPEG under the presigned upload's size cap. Starts at
 * `startQuality` and steps down through {@link JPEG_QUALITY_STEPS} — every
 * step at or below the start — until the blob fits or quality bottoms out.
 * `original.jpg` at 3000px/q0.9 is normally well inside 8 MB; this only ever
 * does real work on an unusually dense photo.
 */
async function encodeUnderCap(
  canvas: HTMLCanvasElement,
  startQuality: number,
  cap: number = MAX_UPLOAD_BYTES,
): Promise<Blob> {
  const steps = JPEG_QUALITY_STEPS.filter((q) => q <= startQuality);
  const qualities = steps.length > 0 && steps[0] === startQuality ? steps : [startQuality, ...steps];

  let last: Blob | null = null;
  for (const quality of qualities) {
    const blob = await canvasToJpegBlob(canvas, quality);
    last = blob;
    if (blob.size <= cap) return blob;
  }
  // Every step tried and still over cap (an extreme resolution) — return the
  // smallest we managed rather than fail the upload outright.
  return last!;
}

export interface ExportedPhoto {
  originalBlob: Blob;
  modelBlob: Blob;
  /** The upright, post-rotation dimensions — what the draft's crop maths uses. */
  width: number;
  height: number;
}

/** Produce `original.jpg` and `model.jpg` from the final, upright canvas. */
export async function exportPhoto(
  uprightCanvas: HTMLCanvasElement,
): Promise<ExportedPhoto> {
  const original = computeDownscaleDimensions(
    uprightCanvas.width,
    uprightCanvas.height,
    ORIGINAL_MAX_LONG_EDGE,
  );
  const model = computeDownscaleDimensions(
    uprightCanvas.width,
    uprightCanvas.height,
    MODEL_MAX_LONG_EDGE,
  );

  const originalBlob = await encodeUnderCap(
    scaledCanvas(uprightCanvas, original.width, original.height),
    ORIGINAL_JPEG_QUALITY,
  );
  const modelBlob = await encodeUnderCap(
    scaledCanvas(uprightCanvas, model.width, model.height),
    MODEL_JPEG_QUALITY,
  );

  return { originalBlob, modelBlob, width: original.width, height: original.height };
}
