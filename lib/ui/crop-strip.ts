/**
 * Crop-to-strip maths for `PhotoStrip` and `CellEditor`.
 *
 * `docs/DESIGN-SYSTEM.md`: a column's `crop` (normalised `{x,y,width,height}`
 * over the upright photo) is scaled so `height ÷ 11` equals the grid's row
 * pitch — paper line 7 sits beside screen line 7 (PRD criterion 14). Pure and
 * dependency-free: the geometry is computed here, components just apply it as
 * CSS.
 */

import type { Dimensions } from "./resize";

export interface NormalisedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropStripGeometry {
  /** Photo pixels → strip display pixels. */
  scale: number;
  /** The whole photo, rendered at `scale`, before it's clipped to the strip. */
  photoDisplayWidth: number;
  photoDisplayHeight: number;
  /** Translate the full photo by this much so the crop's corner sits at (0,0). */
  offsetX: number;
  offsetY: number;
  /** The strip's own box — what the container is sized to. */
  stripWidth: number;
  stripHeight: number;
}

/**
 * The strip's geometry for a column with a crop already set.
 *
 * `stripHeight` is exactly `pitch * hands` by construction, so each of the
 * `hands` rows is exactly one `pitch` tall — {@link rowTop} follows from that
 * with no further reference to the crop.
 */
export function computeCropStripGeometry(
  crop: NormalisedCrop,
  photoWidth: number,
  photoHeight: number,
  pitch: number,
  hands: number = 11,
): CropStripGeometry {
  const cropHeightPx = crop.height * photoHeight;
  const scale = cropHeightPx > 0 ? (pitch * hands) / cropHeightPx : 1;
  const photoDisplayWidth = photoWidth * scale;
  const photoDisplayHeight = photoHeight * scale;

  return {
    scale,
    photoDisplayWidth,
    photoDisplayHeight,
    offsetX: -(crop.x * photoDisplayWidth),
    offsetY: -(crop.y * photoDisplayHeight),
    stripWidth: crop.width * photoDisplayWidth,
    stripHeight: pitch * hands,
  };
}

/** The top of a given 0-based row within the strip. */
export function rowTop(index: number, pitch: number): number {
  return index * pitch;
}

/** The vertical centre of a given 0-based row — what the cell editor scrolls to. */
export function rowCenter(index: number, pitch: number): number {
  return (index + 0.5) * pitch;
}

/**
 * Before a crop exists: the whole photo scaled to fit a container width
 * (PRD criterion 15 — the photo is never absent, even unclipped).
 */
export function wholePhotoFit(
  photoWidth: number,
  photoHeight: number,
  containerWidth: number,
): Dimensions {
  if (photoWidth <= 0 || photoHeight <= 0) {
    return { width: containerWidth, height: containerWidth };
  }
  const scale = containerWidth / photoWidth;
  return {
    width: Math.round(photoWidth * scale),
    height: Math.round(photoHeight * scale),
  };
}

/**
 * A faint band marking a row's approximate position on the *whole* photo,
 * used only while a crop hasn't been set yet (design system: "there's still
 * something to look at while the founder fixes it").
 */
export function rowBandTop(
  index: number,
  displayHeight: number,
  hands: number = 11,
): number {
  return (index / hands) * displayHeight;
}

export function rowBandHeight(displayHeight: number, hands: number = 11): number {
  return displayHeight / hands;
}
