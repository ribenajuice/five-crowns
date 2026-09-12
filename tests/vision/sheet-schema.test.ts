import { describe, expect, it } from "vitest";

import { sheetColumnReadingSchema, sheetTranscriptionSchema } from "@/lib/vision/sheet-schema";

describe("sheetTranscriptionSchema", () => {
  it("accepts a well-formed response with a null name and null cells", () => {
    const result = sheetTranscriptionSchema.safeParse({
      columns: [
        {
          name: null,
          name_confidence: "low",
          running_totals: [23, 23, 27, null, 37, 44, 57, 71, 75, 78, 78],
          least_confident_index: 3,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("does not require exactly eleven values — that's a hard check elsewhere, not a schema failure", () => {
    const result = sheetColumnReadingSchema.safeParse({
      name: "Player D",
      name_confidence: "high",
      running_totals: [1, 2, 3],
      least_confident_index: null,
    });
    expect(result.success).toBe(true);
  });

  it("does not enforce a numeric range on running_totals — sanitised at merge time instead", () => {
    const result = sheetColumnReadingSchema.safeParse({
      name: "Player D",
      name_confidence: "high",
      running_totals: [-5, 12000],
      least_confident_index: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-enum name_confidence", () => {
    const result = sheetColumnReadingSchema.safeParse({
      name: "Player D",
      name_confidence: "certain",
      running_totals: [],
      least_confident_index: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a running_totals entry that isn't a number or null", () => {
    const result = sheetColumnReadingSchema.safeParse({
      name: "Player D",
      name_confidence: "high",
      running_totals: ["64"],
      least_confident_index: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero columns — an empty response is schema-valid, just grid-invalid later", () => {
    const result = sheetTranscriptionSchema.safeParse({ columns: [] });
    expect(result.success).toBe(true);
  });
});
