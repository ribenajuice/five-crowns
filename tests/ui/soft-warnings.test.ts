import { describe, expect, it } from "vitest";

import { deriveHandScores } from "@/lib/scoring";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";
import { LARGE_HAND_THRESHOLD, detectLargeHandWarnings } from "@/lib/ui/soft-warnings";

describe("detectLargeHandWarnings", () => {
  it("flags sheet-01 Player B's genuine 51-point hand and nothing else in that column (criterion 27)", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    const hands = deriveHandScores(playerB.runningTotals);
    const hits = detectLargeHandWarnings(hands);

    expect(hits).toEqual([{ index: 3, points: 51 }]);
  });

  it("never flags anything in sheet-01 Player D's column, repeats or otherwise (criterion 19)", () => {
    // Criterion 19 requires *no* warning of any kind on this column — including
    // its real 44-point final hand, which is why the threshold sits above it.
    const playerD = SHEET_01.columns.find((c) => c.player === "Player D")!;
    const hands = deriveHandScores(playerD.runningTotals);
    expect(detectLargeHandWarnings(hands)).toEqual([]);
  });

  it("never flags sheet-02 Player B's five repeated 48s (criterion 20)", () => {
    const playerB = SHEET_02.columns.find((c) => c.player === "Player B")!;
    const hands = deriveHandScores(playerB.runningTotals);
    expect(detectLargeHandWarnings(hands)).toEqual([]);
  });

  it("ignores null (unread) hands rather than warning on them", () => {
    expect(detectLargeHandWarnings([null, 5, null])).toEqual([]);
  });

  it("the threshold is configurable, and defaults to LARGE_HAND_THRESHOLD", () => {
    expect(detectLargeHandWarnings([44, 45, 46])).toEqual([
      { index: 1, points: 45 },
      { index: 2, points: 46 },
    ]);
    expect(LARGE_HAND_THRESHOLD).toBe(45);
  });
});
