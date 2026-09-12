import { describe, expect, it } from "vitest";

import { visibleReadHintIndex } from "@/lib/ui/read-hints";

const NONE = new Set<number>();

describe("visibleReadHintIndex (docs/DESIGN-SYSTEM.md § ReadHint)", () => {
  it("is null when the model had nothing to say about this column", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: null,
        errIndices: NONE,
        unreadIndices: NONE,
        warnIndices: NONE,
      }),
    ).toBeNull();
  });

  it("shows the hint when nothing else is flagged at that cell", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: 4,
        errIndices: NONE,
        unreadIndices: NONE,
        warnIndices: NONE,
      }),
    ).toBe(4);
  });

  it("is suppressed by a real monotonicity flag on the same cell", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: 4,
        errIndices: new Set([4]),
        unreadIndices: NONE,
        warnIndices: NONE,
      }),
    ).toBeNull();
  });

  it("is suppressed by an unread cell", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: 4,
        errIndices: NONE,
        unreadIndices: new Set([4]),
        warnIndices: NONE,
      }),
    ).toBeNull();
  });

  it("is suppressed by a soft warning — at most one of the three signals per cell", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: 4,
        errIndices: NONE,
        unreadIndices: NONE,
        warnIndices: new Set([4]),
      }),
    ).toBeNull();
  });

  it("an issue elsewhere in the column doesn't suppress this cell's hint", () => {
    expect(
      visibleReadHintIndex({
        leastConfidentIndex: 4,
        errIndices: new Set([2, 3]),
        unreadIndices: new Set([9]),
        warnIndices: new Set([0]),
      }),
    ).toBe(4);
  });
});
