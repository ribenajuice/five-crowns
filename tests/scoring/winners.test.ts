import { describe, expect, it } from "vitest";

import {
  determineWinners,
  finalScore,
  isSharedWin,
  winningScore,
} from "@/lib/scoring";
import {
  FIXTURE_SHEETS,
  TIE_FINAL_SCORES,
  TIE_WINNERS,
} from "../fixtures/sheets";

function standings(sheet: (typeof FIXTURE_SHEETS)[number]) {
  return sheet.columns.map((column) => ({
    playerId: column.player,
    score: finalScore(column.runningTotals)!,
  }));
}

describe("determineWinners — the two verified fixture grids", () => {
  for (const sheet of FIXTURE_SHEETS) {
    it(`${sheet.file}: lowest total wins`, () => {
      expect(determineWinners(standings(sheet))).toEqual(sheet.winners);
      expect(winningScore(standings(sheet))).toBe(sheet.winningScore);
      expect(isSharedWin(standings(sheet))).toBe(false);
    });
  }
});

describe("determineWinners — ties are shared", () => {
  it("returns BOTH players on a two-way tie, never one", () => {
    const winners = determineWinners(TIE_FINAL_SCORES);
    expect(winners).toEqual(TIE_WINNERS);
    expect(winners).toHaveLength(2);
    expect(isSharedWin(TIE_FINAL_SCORES)).toBe(true);
  });

  it("returns every player when the whole table ties", () => {
    const all = [
      { playerId: "Player A", score: 90 },
      { playerId: "Player B", score: 90 },
      { playerId: "Player C", score: 90 },
    ];
    expect(determineWinners(all)).toHaveLength(3);
  });

  it("always returns an array, so no caller can assume a single winner", () => {
    expect(Array.isArray(determineWinners(TIE_FINAL_SCORES))).toBe(true);
    expect(
      Array.isArray(determineWinners([{ playerId: "Player A", score: 1 }])),
    ).toBe(true);
  });

  it("keeps winners in the sheet's column order", () => {
    const reversed = [...TIE_FINAL_SCORES].reverse();
    expect(determineWinners(reversed)).toEqual([...TIE_WINNERS].reverse());
  });
});

describe("determineWinners — round winners fall out of the same rule", () => {
  it("shares a hand between everyone who scored the lowest", () => {
    // Hand 2 of sheet 1: 4, 3, 0, 0. Two players go out clean; both take it.
    const hand = [
      { playerId: "Player A", score: 4 },
      { playerId: "Player B", score: 3 },
      { playerId: "Player C", score: 0 },
      { playerId: "Player D", score: 0 },
    ];
    expect(determineWinners(hand)).toEqual(["Player C", "Player D"]);
  });
});

describe("determineWinners — degenerate input", () => {
  it("has no winner when nobody played", () => {
    expect(determineWinners([])).toEqual([]);
    expect(winningScore([])).toBeNull();
  });

  it("ignores an incomplete column: it cannot win and cannot lose", () => {
    const partial = [
      { playerId: "Player A", score: Number.NaN },
      { playerId: "Player B", score: 109 },
    ];
    expect(determineWinners(partial)).toEqual(["Player B"]);
  });

  it("has no winner when every score is unusable", () => {
    expect(
      determineWinners([{ playerId: "Player A", score: Number.NaN }]),
    ).toEqual([]);
  });
});
