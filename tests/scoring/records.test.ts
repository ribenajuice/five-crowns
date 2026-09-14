/**
 * The board's four definitions — PRD criteria 175–178.
 */

import { describe, expect, it } from "vitest";

import {
  averageFinalScore,
  longestStreak,
  roundsWon,
  roundWinners,
  type GameHandScoreRow,
  type StreakGame,
} from "@/lib/scoring";
import { PLAYER_A, PLAYER_B, PLAYER_C, PLAYER_D, SHEET_01, SHEET_02 } from "../fixtures/sheets";

/** Expand one fixture sheet's `handScores` columns into `round_score`-shaped rows. */
function handRowsFor(sheet: typeof SHEET_01): { playerId: string; hand: number; score: number }[] {
  const rows: { playerId: string; hand: number; score: number }[] = [];
  for (const column of sheet.columns) {
    column.handScores.forEach((score, index) => {
      rows.push({ playerId: column.player, hand: index + 1, score });
    });
  }
  return rows;
}

describe("roundWinners — criterion 175", () => {
  it("SHEET_01 hand 2: a clean two-way tie at zero", () => {
    const winners = roundWinners(handRowsFor(SHEET_01));
    // handScores index 1 (hand 2): A=4, B=3, C=0, D=0.
    expect(winners.get(2)).toEqual([PLAYER_C, PLAYER_D]);
  });

  it("⚠️ SHEET_01 hand 10: three simultaneous zero-score holders", () => {
    const winners = roundWinners(handRowsFor(SHEET_01));
    // handScores index 9 (hand 10): A=0, B=0, C=3, D=0.
    const holders = winners.get(10);
    expect(holders).toEqual([PLAYER_A, PLAYER_B, PLAYER_D]);
    expect(holders).toHaveLength(3);
  });

  it("SHEET_01 hand 4: a single, unambiguous holder", () => {
    const winners = roundWinners(handRowsFor(SHEET_01));
    // handScores index 3 (hand 4): A=11, B=51, C=7, D=0.
    expect(winners.get(4)).toEqual([PLAYER_D]);
  });

  it("returns every hand present across both fixture games", () => {
    for (const sheet of [SHEET_01, SHEET_02]) {
      const winners = roundWinners(handRowsFor(sheet));
      expect(winners.size).toBe(11);
      for (const holders of winners.values()) {
        expect(holders.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("an empty game has no winners and does not crash", () => {
    expect(roundWinners([]).size).toBe(0);
  });
});

describe("roundsWon — criterion 176", () => {
  it("QA hand-count: sums SHEET_01's per-hand holders into a total per player", () => {
    const rows: GameHandScoreRow[] = handRowsFor(SHEET_01).map((r) => ({ ...r, gameId: "game-1" }));
    const { totalByPlayer } = roundsWon(rows);

    // Hand-counted by hand, from SHEET_01's handScores (fixtures/sheets.ts) —
    // matches fixtures/sheets/GROUND-TRUTH.md, the source QA hand-counts against:
    //   hand1: B(0) alone.                    hand2: C, D tie at 0.
    //   hand3: B(0) alone.                     hand4: D(0) alone.
    //   hand5: D(0) alone.                     hand6: D(0) alone.
    //   hand7: D(0) alone.                     hand8: B, D tie at 0.
    //   hand9: A(0) alone.                     hand10: A, B, D tie at 0.
    //   hand11: B, C tie at 0.
    // Totals: A=2 (h9,h10), B=5 (h1,h3,h8,h10,h11), C=2 (h2,h11), D=7 (h2,h4,h5,h6,h7,h8,h10).
    expect(totalByPlayer.get(PLAYER_A)).toBe(2);
    expect(totalByPlayer.get(PLAYER_B)).toBe(5);
    expect(totalByPlayer.get(PLAYER_C)).toBe(2);
    expect(totalByPlayer.get(PLAYER_D)).toBe(7);
    // Every hand is held by someone, and shared hands inflate the sum above 11.
    const sum = [...totalByPlayer.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(16);
  });

  it("a shared hand counts in full for every holder, not split between them", () => {
    const rows: GameHandScoreRow[] = [
      { gameId: "g1", playerId: PLAYER_A, hand: 1, score: 0 },
      { gameId: "g1", playerId: PLAYER_B, hand: 1, score: 0 },
      { gameId: "g1", playerId: PLAYER_C, hand: 1, score: 5 },
    ];
    const { totalByPlayer, byPlayerAndGame } = roundsWon(rows);
    expect(totalByPlayer.get(PLAYER_A)).toBe(1);
    expect(totalByPlayer.get(PLAYER_B)).toBe(1);
    expect(totalByPlayer.get(PLAYER_C)).toBeUndefined();
    expect(byPlayerAndGame.get(PLAYER_A)?.get("g1")).toBe(1);
    expect(byPlayerAndGame.get(PLAYER_B)?.get("g1")).toBe(1);
  });

  it("tallies across more than one game, interleaved in the input", () => {
    const rows: GameHandScoreRow[] = [
      { gameId: "g1", playerId: PLAYER_A, hand: 1, score: 0 },
      { gameId: "g2", playerId: PLAYER_A, hand: 1, score: 0 },
      { gameId: "g1", playerId: PLAYER_B, hand: 2, score: 3 },
      { gameId: "g2", playerId: PLAYER_A, hand: 2, score: 9 },
      { gameId: "g1", playerId: PLAYER_A, hand: 2, score: 1 },
    ];
    const { totalByPlayer, byPlayerAndGame } = roundsWon(rows);
    // g1 hand1: only A is in it, wins by default (0). g1 hand2: A(1) < B(3), A wins.
    // g2 hand1: only A is in it, wins by default (0). g2 hand2: only A is in it, wins by default (9).
    expect(totalByPlayer.get(PLAYER_A)).toBe(4);
    expect(byPlayerAndGame.get(PLAYER_A)?.get("g1")).toBe(2);
    expect(byPlayerAndGame.get(PLAYER_A)?.get("g2")).toBe(2);
  });

  it("an empty archive has no rounds won by anyone", () => {
    const { totalByPlayer, byPlayerAndGame } = roundsWon([]);
    expect(totalByPlayer.size).toBe(0);
    expect(byPlayerAndGame.size).toBe(0);
  });
});

describe("longestStreak — criterion 177", () => {
  it("the exact PRD example: wins 1, 2, 4, 5, misses game 3 entirely → streak of 4", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true },
      // g3 is absent entirely — this player was not in it.
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: true },
      { gameId: "g5", playedOn: "2026-01-29", createdAt: "2026-01-29T00:00:00Z", won: true },
    ];
    const streak = longestStreak(games);
    expect(streak.length).toBe(4);
    expect(streak.gameIds).toEqual(["g1", "g2", "g4", "g5"]);
  });

  it("the exact PRD example's second archive: played and lost game 3 → streak of 2", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true },
      { gameId: "g3", playedOn: "2026-01-15", createdAt: "2026-01-15T00:00:00Z", won: false },
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: true },
      { gameId: "g5", playedOn: "2026-01-29", createdAt: "2026-01-29T00:00:00Z", won: true },
    ];
    const streak = longestStreak(games);
    expect(streak.length).toBe(2);
    // The earliest of the two tied 2-length runs.
    expect(streak.gameIds).toEqual(["g1", "g2"]);
  });

  it("is the longest EVER, not the current run — a loss after the longest run doesn't erase it", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true },
      { gameId: "g3", playedOn: "2026-01-15", createdAt: "2026-01-15T00:00:00Z", won: true },
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: false },
    ];
    const streak = longestStreak(games);
    expect(streak.length).toBe(3);
    expect(streak.gameIds).toEqual(["g1", "g2", "g3"]);
  });

  it("a shared win extends a streak exactly like a solo win", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true }, // shared win
    ];
    expect(longestStreak(games).length).toBe(2);
  });

  it("a player who has never won has a streak of zero and an empty drill-through", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: false },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: false },
    ];
    expect(longestStreak(games)).toEqual({ length: 0, gameIds: [] });
  });

  it("re-sorts by playedOn then createdAt regardless of input order", () => {
    const games: StreakGame[] = [
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true },
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
    ];
    expect(longestStreak(games).gameIds).toEqual(["g1", "g2"]);
  });

  it("createdAt breaks a tie on the same playedOn date", () => {
    const games: StreakGame[] = [
      { gameId: "later", playedOn: "2026-01-01", createdAt: "2026-01-01T09:00:00Z", won: true },
      { gameId: "earlier", playedOn: "2026-01-01", createdAt: "2026-01-01T08:00:00Z", won: true },
    ];
    expect(longestStreak(games).gameIds).toEqual(["earlier", "later"]);
  });

  it("a single game played and won is a streak of one", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
    ];
    expect(longestStreak(games)).toEqual({ length: 1, gameIds: ["g1"] });
  });

  it("an empty games array has no streak", () => {
    expect(longestStreak([])).toEqual({ length: 0, gameIds: [] });
  });
});

describe("averageFinalScore — criterion 178", () => {
  it("rounds to one decimal place", () => {
    // 41 + 42 = 83 / 2 = 41.5 exactly.
    expect(averageFinalScore([41, 42])).toEqual({ average: 41.5, gamesPlayed: 2 });
  });

  it("rounds .05 up and .04 down (standard rounding, not truncation)", () => {
    // 10, 10, 10, 11 -> mean 10.25 -> rounds to 10.3 (nearest tenth).
    expect(averageFinalScore([10, 10, 10, 11])?.average).toBe(10.3);
    // 10, 10, 10, 10, 11 -> mean 10.2 -> stays 10.2.
    expect(averageFinalScore([10, 10, 10, 10, 11])?.average).toBe(10.2);
  });

  it("states the games-count denominator alongside the number", () => {
    const result = averageFinalScore([78, 109, 111]);
    expect(result).toEqual({ average: expect.any(Number), gamesPlayed: 3 });
  });

  it("a single-game player's average is exactly their one score", () => {
    expect(averageFinalScore([78])).toEqual({ average: 78, gamesPlayed: 1 });
  });

  it("is null, not zero, for a player with no games", () => {
    expect(averageFinalScore([])).toBeNull();
  });

  it("reads the same final scores the fixture sheets' winners were computed from", () => {
    const scoresBySheet = [SHEET_01, SHEET_02].map((sheet) =>
      sheet.columns.map((c) => c.runningTotals[c.runningTotals.length - 1]!),
    );
    expect(averageFinalScore(scoresBySheet[0]!)?.gamesPlayed).toBe(4);
    expect(averageFinalScore(scoresBySheet[1]!)?.gamesPlayed).toBe(5);
  });
});
