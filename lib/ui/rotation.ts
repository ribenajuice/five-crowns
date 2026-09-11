/**
 * Rotation maths for the capture screen.
 *
 * Two separate rotations get composed: the EXIF orientation tag (read once,
 * silently corrected — PRD criterion 7) and the founder's own `RotateControl`
 * taps (one quarter turn each, PRD criterion 8). Both are pure lookups so they
 * can be unit tested without a canvas.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface OrientationTransform {
  /** Degrees to rotate clockwise to undo the camera's recorded orientation. */
  rotate: Rotation;
  /** Whether the image is mirrored and needs a horizontal flip first. */
  flip: boolean;
}

/** EXIF orientation value (1–8) → the transform that makes it upright. */
const ORIENTATION_TRANSFORMS: Record<number, OrientationTransform> = {
  1: { rotate: 0, flip: false },
  2: { rotate: 0, flip: true },
  3: { rotate: 180, flip: false },
  4: { rotate: 180, flip: true },
  5: { rotate: 90, flip: true },
  6: { rotate: 90, flip: false },
  7: { rotate: 270, flip: true },
  8: { rotate: 270, flip: false },
};

export function orientationToTransform(orientation: number): OrientationTransform {
  return ORIENTATION_TRANSFORMS[orientation] ?? ORIENTATION_TRANSFORMS[1]!;
}

/**
 * One tap of `RotateControl`: a quarter turn clockwise, wrapping at 360°.
 * Four taps return to where it started (PRD criterion 8).
 */
export function nextRotation(current: Rotation): Rotation {
  return (((current + 90) % 360) as Rotation);
}

/** Compose two rotations — the EXIF correction and the founder's own taps. */
export function addRotation(a: Rotation, b: Rotation): Rotation {
  return (((a + b) % 360) as Rotation);
}

/** Whether a rotation swaps width and height when applied. */
export function rotationSwapsDimensions(rotation: Rotation): boolean {
  return rotation === 90 || rotation === 270;
}
