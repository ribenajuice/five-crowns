import { describe, expect, it } from "vitest";

import {
  computeCropStripGeometry,
  rowBandHeight,
  rowBandTop,
  rowCenter,
  rowTop,
  wholePhotoFit,
} from "@/lib/ui/crop-strip";

describe("computeCropStripGeometry", () => {
  it("scales so the crop's height maps to exactly 11 row pitches (criterion 14)", () => {
    // A photo 1000×2000, a crop covering the middle third of its height.
    const geometry = computeCropStripGeometry(
      { x: 0.3, y: 0.4, width: 0.2, height: 0.3 },
      1000,
      2000,
      46,
    );
    expect(geometry.stripHeight).toBe(46 * 11);
    // crop.height(0.3) * photoHeight(2000) * scale === stripHeight
    expect(0.3 * 2000 * geometry.scale).toBeCloseTo(46 * 11, 6);
  });

  it("positions the crop's top-left corner at the strip's origin", () => {
    const geometry = computeCropStripGeometry(
      { x: 0.25, y: 0.1, width: 0.2, height: 0.5 },
      1000,
      1000,
      46,
    );
    // Translating the whole photo by (offsetX, offsetY) puts the crop corner at 0,0.
    const cropCornerX = 0.25 * geometry.photoDisplayWidth + geometry.offsetX;
    const cropCornerY = 0.1 * geometry.photoDisplayHeight + geometry.offsetY;
    expect(cropCornerX).toBeCloseTo(0, 6);
    expect(cropCornerY).toBeCloseTo(0, 6);
  });

  it("the strip width is the crop's share of the scaled photo width", () => {
    const geometry = computeCropStripGeometry(
      { x: 0, y: 0, width: 0.25, height: 1 },
      2000,
      1000,
      46,
    );
    expect(geometry.stripWidth).toBeCloseTo(0.25 * geometry.photoDisplayWidth, 6);
  });

  it("supports a different hand count without breaking the pitch relationship", () => {
    const geometry = computeCropStripGeometry(
      { x: 0, y: 0, width: 1, height: 1 },
      100,
      550,
      46,
      11,
    );
    expect(geometry.stripHeight).toBe(506);
  });
});

describe("rowTop / rowCenter", () => {
  it("each row is exactly one pitch below the last", () => {
    const pitch = 46;
    for (let i = 0; i < 11; i += 1) {
      expect(rowTop(i, pitch)).toBe(i * 46);
      expect(rowCenter(i, pitch)).toBe(i * 46 + 23);
    }
  });
});

describe("wholePhotoFit — before a crop is set (criterion 15: never blank)", () => {
  it("scales the whole photo to the container width, preserving aspect ratio", () => {
    const fit = wholePhotoFit(2000, 1000, 400);
    expect(fit.width).toBe(400);
    expect(fit.height).toBe(200);
  });

  it("falls back to a square-ish box for degenerate photo dimensions", () => {
    expect(wholePhotoFit(0, 0, 300)).toEqual({ width: 300, height: 300 });
  });
});

describe("rowBandTop / rowBandHeight — the fallback band on the unclipped photo", () => {
  it("divides the display height into 11 even bands", () => {
    const displayHeight = 1100;
    expect(rowBandHeight(displayHeight)).toBe(100);
    expect(rowBandTop(0, displayHeight)).toBe(0);
    expect(rowBandTop(10, displayHeight)).toBeCloseTo(1000, 6);
  });
});
