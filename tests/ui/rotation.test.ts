import { describe, expect, it } from "vitest";

import {
  addRotation,
  nextRotation,
  orientationToTransform,
  rotationSwapsDimensions,
  type Rotation,
} from "@/lib/ui/rotation";

describe("orientationToTransform", () => {
  it("orientation 1 needs no correction", () => {
    expect(orientationToTransform(1)).toEqual({ rotate: 0, flip: false });
  });

  it("orientation 6 (sheet-02's case) needs a 90° rotation", () => {
    expect(orientationToTransform(6)).toEqual({ rotate: 90, flip: false });
  });

  it("orientation 3 needs a 180° rotation", () => {
    expect(orientationToTransform(3)).toEqual({ rotate: 180, flip: false });
  });

  it("orientation 8 needs a 270° rotation", () => {
    expect(orientationToTransform(8)).toEqual({ rotate: 270, flip: false });
  });

  it("mirrored orientations (2, 4, 5, 7) flip as well as rotate", () => {
    expect(orientationToTransform(2)).toEqual({ rotate: 0, flip: true });
    expect(orientationToTransform(4)).toEqual({ rotate: 180, flip: true });
    expect(orientationToTransform(5)).toEqual({ rotate: 270, flip: true });
    expect(orientationToTransform(7)).toEqual({ rotate: 90, flip: true });
  });

  it("falls back to upright for an out-of-range value", () => {
    expect(orientationToTransform(99)).toEqual({ rotate: 0, flip: false });
  });
});

describe("nextRotation — RotateControl, one tap per quarter turn", () => {
  it("cycles 0 → 90 → 180 → 270 → 0, four taps returning to the start (criterion 8)", () => {
    let rotation: Rotation = 0;
    const seen: Rotation[] = [];
    for (let tap = 0; tap < 4; tap += 1) {
      rotation = nextRotation(rotation);
      seen.push(rotation);
    }
    expect(seen).toEqual([90, 180, 270, 0]);
  });
});

describe("addRotation", () => {
  it("composes the EXIF correction with the founder's own taps", () => {
    expect(addRotation(90, 90)).toBe(180);
    expect(addRotation(270, 180)).toBe(90);
    expect(addRotation(0, 0)).toBe(0);
  });
});

describe("rotationSwapsDimensions", () => {
  it("is true only for 90 and 270", () => {
    expect(rotationSwapsDimensions(0)).toBe(false);
    expect(rotationSwapsDimensions(90)).toBe(true);
    expect(rotationSwapsDimensions(180)).toBe(false);
    expect(rotationSwapsDimensions(270)).toBe(true);
  });
});
