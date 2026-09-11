/**
 * Downscale dimensions for the two exported JPEGs.
 *
 * `docs/ARCHITECTURE.md` § Flow 2, step 1: `original.jpg`'s long edge is
 * capped at 3000px, `model.jpg`'s at 1568px — never upscaled, and never
 * distorted (aspect ratio is always preserved). Pure and dependency-free.
 */

export interface Dimensions {
  width: number;
  height: number;
}

export function computeDownscaleDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): Dimensions {
  if (width <= 0 || height <= 0) {
    throw new RangeError("Width and height must be positive.");
  }
  if (maxLongEdge <= 0) {
    throw new RangeError("maxLongEdge must be positive.");
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
