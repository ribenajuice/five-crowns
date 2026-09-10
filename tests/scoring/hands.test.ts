import { describe, expect, it } from "vitest";

import {
  accumulateHandScores,
  deriveHandScores,
  finalScore,
  HANDS_PER_GAME,
} from "@/lib/scoring";
import { FIXTURE_SHEETS, SHEET_01, SHEET_02 } from "../fixtures/sheets";

describe("deriveHandScores — the two verified fixture grids", () => {
  for (const sheet of FIXTURE_SHEETS) {
    describe(sheet.file, () => {
      for (const column of sheet.columns) {
        it(`derives ${column.player}'s eleven hands from the running totals`, () => {
          expect(column.runningTotals).toHaveLength(HANDS_PER_GAME);
          expect(deriveHandScores(column.runningTotals)).toEqual(
            column.handScores,
          );
        });

        it(`${column.player}'s final score is the last running total`, () => {
          expect(finalScore(column.runningTotals)).toBe(
            column.runningTotals[HANDS_PER_GAME - 1],
          );
        });

        it(`${column.player}'s hands sum back to their final score`, () => {
          const total = column.handScores.reduce((a, b) => a + b, 0);
          expect(total).toBe(finalScore(column.runningTotals));
        });
      }
    });
  }
});

describe("deriveHandScores — the cases that break naive validators", () => {
  it("reads Player D's six consecutive 64s as five zero-point hands, never an error", () => {
    const playerD = SHEET_01.columns.find((c) => c.player === "Player D")!;

    // Six identical values in a row, verified against the paper.
    expect(playerD.runningTotals.slice(2, 8)).toEqual([64, 64, 64, 64, 64, 64]);

    const hands = deriveHandScores(playerD.runningTotals);

    // PRD criterion 19, to the digit.
    expect(hands).toEqual([29, 0, 35, 0, 0, 0, 0, 0, 3, 0, 44]);
    expect(hands.slice(3, 8)).toEqual([0, 0, 0, 0, 0]);
  });

  it("reads Player B's 51-point single hand as 51, not as an error", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    const hands = deriveHandScores(playerB.runningTotals);

    // 54 - 3. A legitimate large delta; the counter-example that keeps every
    // "implausibly large jump" heuristic a warning rather than a rule.
    expect(hands[3]).toBe(51);
  });

  it("reads Player B's five consecutive 48s on sheet 2 as four zero-point hands", () => {
    const playerB = SHEET_02.columns.find((c) => c.player === "Player B")!;
    expect(playerB.runningTotals.slice(2, 7)).toEqual([48, 48, 48, 48, 48]);
    expect(deriveHandScores(playerB.runningTotals).slice(3, 7)).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("treats a column starting at 0 as ordinary", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    expect(playerB.runningTotals[0]).toBe(0);
    expect(deriveHandScores(playerB.runningTotals)[0]).toBe(0);
  });
});

describe("deriveHandScores — shape and gaps", () => {
  it("makes the first hand its own value", () => {
    expect(deriveHandScores([23])).toEqual([23]);
  });

  it("keeps the result the same length as the input, so the grid lines up", () => {
    expect(deriveHandScores([1, 2, 3, 4])).toHaveLength(4);
    expect(deriveHandScores([])).toEqual([]);
  });

  it("returns null for a hand touching an unread cell, never a guess", () => {
    expect(deriveHandScores([10, null, 40])).toEqual([10, null, null]);
    expect(deriveHandScores([null, 40])).toEqual([null, null]);
  });

  it("does not invent a hand for a column that is still empty", () => {
    expect(deriveHandScores([null, null, null])).toEqual([null, null, null]);
  });
});

describe("finalScore", () => {
  it("is null for an empty column", () => {
    expect(finalScore([])).toBeNull();
  });

  it("is null when the last cell is unread — a wrong total is worse than none", () => {
    expect(finalScore([10, 20, null])).toBeNull();
  });
});

describe("accumulateHandScores", () => {
  it("round-trips every fixture column back to its running totals", () => {
    for (const sheet of FIXTURE_SHEETS) {
      for (const column of sheet.columns) {
        expect(accumulateHandScores(column.handScores)).toEqual(
          column.runningTotals,
        );
      }
    }
  });
});
