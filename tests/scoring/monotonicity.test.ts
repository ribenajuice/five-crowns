import { describe, expect, it } from "vitest";

import { checkMonotonicity, isMonotonic } from "@/lib/scoring";
import { FIXTURE_SHEETS, SHEET_01, SHEET_02 } from "../fixtures/sheets";

describe("checkMonotonicity — the two verified fixture grids", () => {
  for (const sheet of FIXTURE_SHEETS) {
    for (const column of sheet.columns) {
      it(`${sheet.file}: ${column.player}'s column climbs`, () => {
        const result = checkMonotonicity(column.runningTotals);
        expect(result.ok).toBe(true);
        expect(result.breaks).toEqual([]);
        expect(result.flaggedIndices).toEqual([]);
      });
    }
  }
});

describe("checkMonotonicity — repeats are normal, never a break", () => {
  it("passes Player D's six consecutive 64s with nothing flagged at all", () => {
    const playerD = SHEET_01.columns.find((c) => c.player === "Player D")!;
    const result = checkMonotonicity(playerD.runningTotals);

    // No warning, flag, dot, tint, icon or banner may hang off this column.
    expect(result.ok).toBe(true);
    expect(result.flaggedIndices).toHaveLength(0);
  });

  it("passes Player B's five consecutive 48s on sheet 2", () => {
    const playerB = SHEET_02.columns.find((c) => c.player === "Player B")!;
    expect(isMonotonic(playerB.runningTotals)).toBe(true);
  });

  it("passes a column that is entirely one repeated value", () => {
    expect(isMonotonic([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7])).toBe(true);
  });

  it("passes Player B's genuine 51-point jump", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    expect(isMonotonic(playerB.runningTotals)).toBe(true);
  });
});

describe("checkMonotonicity — the break it does catch", () => {
  it("flags BOTH cells of the offending pair, never just the lower one", () => {
    // PRD criterion 21: sheet-01 Player A row 6 edited from 100 to 70.
    const edited = [28, 32, 60, 71, 74, 70, 118, 123, 123, 123, 137];
    const result = checkMonotonicity(edited);

    expect(result.ok).toBe(false);
    expect(result.breaks).toEqual([
      { previousIndex: 4, index: 5, previous: 74, value: 70 },
    ]);
    // Either could be the misread; the app has no way to know which.
    expect(result.flaggedIndices).toEqual([4, 5]);
  });

  it("clears the flag when the original value is restored", () => {
    const restored = SHEET_01.columns[0]!.runningTotals;
    expect(checkMonotonicity(restored).ok).toBe(true);
  });

  it("reports every break in a column, not just the first", () => {
    const result = checkMonotonicity([10, 5, 20, 12]);
    expect(result.breaks).toHaveLength(2);
    expect(result.flaggedIndices).toEqual([0, 1, 2, 3]);
  });

  it("catches a drop across an unread cell", () => {
    // Whatever the middle cell turns out to be, it cannot be >= 10 and <= 5.
    const result = checkMonotonicity([10, null, 5]);
    expect(result.ok).toBe(false);
    expect(result.breaks).toEqual([
      { previousIndex: 0, index: 2, previous: 10, value: 5 },
    ]);
  });

  it("does not invent a break from unread cells alone", () => {
    expect(isMonotonic([null, null, null])).toBe(true);
    expect(isMonotonic([])).toBe(true);
    expect(isMonotonic([null, 10, null])).toBe(true);
  });
});

describe("checkMonotonicity — what it is honestly worth", () => {
  it("passes a misread that preserves the ordering, which is the normal case", () => {
    // Milestone 0 measured 0 of 9 misreads caught. 123 read as 128, sitting
    // between 118 and 137, is invisible here and this test says so.
    const misread = [28, 32, 60, 71, 74, 100, 118, 128, 123, 123, 137];
    expect(checkMonotonicity(misread).ok).toBe(false); // 123 < 128 — caught here

    // ...but move the misread to the last of the three equal values and it
    // slips through cleanly, with the wrong number saved.
    const slipped = [28, 32, 60, 71, 74, 100, 118, 123, 123, 128, 137];
    expect(checkMonotonicity(slipped).ok).toBe(true);
  });
});
