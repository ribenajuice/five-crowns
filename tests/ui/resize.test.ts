import { describe, expect, it } from "vitest";

import { computeDownscaleDimensions } from "@/lib/ui/resize";
import { MODEL_MAX_LONG_EDGE, ORIGINAL_MAX_LONG_EDGE } from "@/lib/ui/constants";

describe("computeDownscaleDimensions", () => {
  it("never upscales — a photo already inside the cap is returned as-is", () => {
    expect(computeDownscaleDimensions(800, 600, ORIGINAL_MAX_LONG_EDGE)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("caps the long edge at 3000px for the original, preserving aspect ratio", () => {
    const result = computeDownscaleDimensions(6000, 4000, ORIGINAL_MAX_LONG_EDGE);
    expect(result.width).toBe(3000);
    expect(result.height).toBe(2000);
  });

  it("caps the long edge at 1568px for the model image", () => {
    const result = computeDownscaleDimensions(4032, 3024, MODEL_MAX_LONG_EDGE);
    expect(Math.max(result.width, result.height)).toBe(MODEL_MAX_LONG_EDGE);
    // Aspect ratio preserved within a rounding pixel.
    expect(result.width / result.height).toBeCloseTo(4032 / 3024, 2);
  });

  it("treats a portrait photo's long edge as height", () => {
    const result = computeDownscaleDimensions(3024, 4032, MODEL_MAX_LONG_EDGE);
    expect(result.height).toBe(MODEL_MAX_LONG_EDGE);
    expect(result.width).toBeLessThan(MODEL_MAX_LONG_EDGE);
  });

  it("never produces a zero-pixel dimension for an extreme aspect ratio", () => {
    const result = computeDownscaleDimensions(10000, 5, MODEL_MAX_LONG_EDGE);
    expect(result.width).toBe(MODEL_MAX_LONG_EDGE);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("rejects non-positive dimensions", () => {
    expect(() => computeDownscaleDimensions(0, 100, 1000)).toThrow();
    expect(() => computeDownscaleDimensions(100, -1, 1000)).toThrow();
  });
});
