/**
 * The board's four definitions — PRD criteria 175–178.
 */

import { describe, expect, it } from "vitest";

import {
  averageFinalScore,
  bestGameEver,
  biggestHammering,
  biggestSingleHandDisasters,
  catastrophe,
  cleanestSheet,
  clutchComebackInstances,
  currentLastPlaceStreak,
  handsBledOn,
  headToHead,
  homeAdvantage,
  longestDrought,
  longestStreak,
  looksLikeCheating,
  metronome,
  mostClutchComeback,
  nemesis,
  perHandMeans,
  roundsWon,
  roundWinners,
  secondPlace,
  venueBreakdown,
  winningMargin,
  worstGameEver,
  zeroHandCountsByPlayerGame,
  type CheatingCandidate,
  type ClutchCandidate,
  type FinalScoreInstance,
  type GameHandScoreRow,
  type HammeringInstance,
  type HeadToHeadGame,
  type HomeAdvantageCandidate,
  type LastPlaceGame,
  type MetronomeCandidate,
  type NemesisCandidate,
  type SingleHandInstance,
  type StreakGame,
  type VenueParticipation,
} from "@/lib/scoring";
import {
  PLAYER_A,
  PLAYER_B,
  PLAYER_C,
  PLAYER_D,
  SHEET_01,
  SHEET_02,
  type FixtureSheet,
} from "../fixtures/sheets";

/** Every `round_score`-shaped row for one fixture sheet, tagged with a `gameId`. */
function singleHandInstancesFor(sheet: FixtureSheet, gameId: string): SingleHandInstance[] {
  const rows: SingleHandInstance[] = [];
  for (const column of sheet.columns) {
    column.handScores.forEach((score, index) => {
      rows.push({ playerId: column.player, gameId, hand: index + 1, score });
    });
  }
  return rows;
}

/** Every player's final score for one fixture sheet, tagged with a `gameId`. */
function finalScoreInstancesFor(sheet: FixtureSheet, gameId: string): FinalScoreInstance[] {
  return sheet.columns.map((column) => ({
    playerId: column.player,
    gameId,
    score: column.runningTotals[column.runningTotals.length - 1]!,
  }));
}

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

describe("secondPlace and winningMargin — criteria 214–215", () => {
  it("a normal game: one winner, one clear second", () => {
    const scores = [
      { playerId: PLAYER_A, score: 100 },
      { playerId: PLAYER_B, score: 110 },
      { playerId: PLAYER_C, score: 130 },
    ];
    expect(secondPlace(scores)).toEqual({ score: 110, playerIds: [PLAYER_B] });
    expect(winningMargin(scores)).toBe(10);
  });

  it("⚠️ two players tie the win, one player behind them — second place is not skipped because the win was shared", () => {
    const scores = [
      { playerId: PLAYER_A, score: 100 },
      { playerId: PLAYER_B, score: 100 },
      { playerId: PLAYER_C, score: 110 },
    ];
    expect(secondPlace(scores)).toEqual({ score: 110, playerIds: [PLAYER_C] });
    expect(winningMargin(scores)).toBe(10);
  });

  it("⚠️ two players tie on second place behind a single winner — both are second, in full", () => {
    const scores = [
      { playerId: PLAYER_A, score: 100 },
      { playerId: PLAYER_B, score: 110 },
      { playerId: PLAYER_C, score: 110 },
    ];
    const second = secondPlace(scores);
    expect(second?.score).toBe(110);
    expect(second?.playerIds.sort()).toEqual([PLAYER_B, PLAYER_C].sort());
    expect(winningMargin(scores)).toBe(10);
  });

  it("a two-player game: the loser is automatically second", () => {
    const scores = [
      { playerId: PLAYER_A, score: 90 },
      { playerId: PLAYER_B, score: 120 },
    ];
    expect(secondPlace(scores)).toEqual({ score: 120, playerIds: [PLAYER_B] });
    expect(winningMargin(scores)).toBe(30);
  });

  it("a two-player game that ties has no second place", () => {
    const scores = [
      { playerId: PLAYER_A, score: 90 },
      { playerId: PLAYER_B, score: 90 },
    ];
    expect(secondPlace(scores)).toBeNull();
    expect(winningMargin(scores)).toBeNull();
  });

  it("⚠️ every player finished level: one distinct score, everybody won, no second place at all", () => {
    const scores = [
      { playerId: PLAYER_A, score: 75 },
      { playerId: PLAYER_B, score: 75 },
      { playerId: PLAYER_C, score: 75 },
      { playerId: PLAYER_D, score: 75 },
    ];
    expect(secondPlace(scores)).toBeNull();
    expect(winningMargin(scores)).toBeNull();
  });

  it("a winner is never also a second place in the same game", () => {
    const scores = [
      { playerId: PLAYER_A, score: 50 },
      { playerId: PLAYER_B, score: 80 },
    ];
    const second = secondPlace(scores);
    expect(second?.playerIds).not.toContain(PLAYER_A);
  });

  it("an empty game has no second place and no margin", () => {
    expect(secondPlace([])).toBeNull();
    expect(winningMargin([])).toBeNull();
  });

  it("⚠️ QA hand-count against fixtures/sheets/GROUND-TRUTH.md — criterion 216's own worked example", () => {
    // SHEET_01: Player C wins outright on 78. The next-lowest final score is
    // Player B's 109 (Player A 137, Player D 111 are both further behind) —
    // GROUND-TRUTH.md's own table, hand-counted, names Player B as the sheet's
    // clear second place. This is the fixture-sheet check criterion 216 asks
    // for, the same way criterion 176's "most rounds won" is hand-counted
    // against SHEET_01 above — nearlyMan (`lib/board/queries.ts`) is bound to
    // this exact function (criterion 214) and must never re-derive its own.
    const scores = SHEET_01.columns.map((c) => ({
      playerId: c.player,
      score: c.runningTotals[c.runningTotals.length - 1]!,
    }));
    const second = secondPlace(scores);
    expect(second).toEqual({ score: 109, playerIds: [PLAYER_B] });
    expect(winningMargin(scores)).toBe(109 - 78);

    // SHEET_02: Player B wins outright on 71 (GROUND-TRUTH.md's "Caitlyn
    // (71)"). The next-lowest final score is Player C's 144, ahead of Player
    // E (154), Player A (222) and Player D (240).
    const scores2 = SHEET_02.columns.map((c) => ({
      playerId: c.player,
      score: c.runningTotals[c.runningTotals.length - 1]!,
    }));
    const second2 = secondPlace(scores2);
    expect(second2).toEqual({ score: 144, playerIds: [PLAYER_C] });
  });
});

describe("longestDrought — criterion 212 (the streak rule, negated)", () => {
  it("the PRD's own inverted construction: loses games 1, 2, 4, 5, misses game 3 entirely → drought of 4", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: false },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: false },
      // g3 is absent entirely — this player was not in it.
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: false },
      { gameId: "g5", playedOn: "2026-01-29", createdAt: "2026-01-29T00:00:00Z", won: false },
    ];
    const drought = longestDrought(games);
    expect(drought.length).toBe(4);
    expect(drought.gameIds).toEqual(["g1", "g2", "g4", "g5"]);
  });

  it("the inverted second archive: played and won game 3 → drought of 2", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: false },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: false },
      { gameId: "g3", playedOn: "2026-01-15", createdAt: "2026-01-15T00:00:00Z", won: true },
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: false },
      { gameId: "g5", playedOn: "2026-01-29", createdAt: "2026-01-29T00:00:00Z", won: false },
    ];
    const drought = longestDrought(games);
    expect(drought.length).toBe(2);
    expect(drought.gameIds).toEqual(["g1", "g2"]);
  });

  it("is the longest EVER, not the current run", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: false },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: false },
      { gameId: "g3", playedOn: "2026-01-15", createdAt: "2026-01-15T00:00:00Z", won: false },
      { gameId: "g4", playedOn: "2026-01-22", createdAt: "2026-01-22T00:00:00Z", won: true },
    ];
    const drought = longestDrought(games);
    expect(drought.length).toBe(3);
    expect(drought.gameIds).toEqual(["g1", "g2", "g3"]);
  });

  it("a shared win ends a drought exactly as a solo win does", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: false },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true }, // shared win
      { gameId: "g3", playedOn: "2026-01-15", createdAt: "2026-01-15T00:00:00Z", won: false },
    ];
    expect(longestDrought(games).length).toBe(1);
  });

  it("a player who has won every game has a drought of zero", () => {
    const games: StreakGame[] = [
      { gameId: "g1", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00Z", won: true },
      { gameId: "g2", playedOn: "2026-01-08", createdAt: "2026-01-08T00:00:00Z", won: true },
    ];
    expect(longestDrought(games)).toEqual({ length: 0, gameIds: [] });
  });

  it("an empty games array has no drought", () => {
    expect(longestDrought([])).toEqual({ length: 0, gameIds: [] });
  });
});

describe("currentLastPlaceStreak — criteria 300–301 ('getting absolutely wrecked')", () => {
  function g(gameId: string, playedOn: string, finishedLast: boolean): LastPlaceGame {
    return { gameId, playedOn, createdAt: `${playedOn}T00:00:00Z`, finishedLast };
  }

  it("counts back from the most recent game until one game breaks it", () => {
    const games = [
      g("g1", "2026-01-01", true),
      g("g2", "2026-01-08", false),
      g("g3", "2026-01-15", true),
      g("g4", "2026-01-22", true),
      g("g5", "2026-01-29", true),
    ];
    const streak = currentLastPlaceStreak(games);
    expect(streak).toEqual({ length: 3, gameIds: ["g3", "g4", "g5"] });
  });

  it("⚠️ is the CURRENT run, not the longest ever — a longer, older run doesn't win", () => {
    const games = [
      g("g1", "2026-01-01", true),
      g("g2", "2026-01-08", true),
      g("g3", "2026-01-15", true),
      g("g4", "2026-01-22", true), // four in a row, ended by g5
      g("g5", "2026-01-29", false),
      g("g6", "2026-02-05", true),
      g("g7", "2026-02-12", true), // only two in a row, but it's the trailing one
    ];
    expect(currentLastPlaceStreak(games)).toEqual({ length: 2, gameIds: ["g6", "g7"] });
  });

  it("⚠️ a run of exactly one game does not qualify — null, not a length-1 result", () => {
    const games = [g("g1", "2026-01-01", true), g("g2", "2026-01-08", false), g("g3", "2026-01-15", true)];
    expect(currentLastPlaceStreak(games)).toBeNull();
  });

  it("a player whose most recent game was NOT a last has no current run at all", () => {
    const games = [g("g1", "2026-01-01", true), g("g2", "2026-01-08", true), g("g3", "2026-01-15", false)];
    expect(currentLastPlaceStreak(games)).toBeNull();
  });

  it("a player who has never finished last has no current run", () => {
    const games = [g("g1", "2026-01-01", false), g("g2", "2026-01-08", false)];
    expect(currentLastPlaceStreak(games)).toBeNull();
  });

  it("a shared last extends the run exactly like a solo last — the caller decides `finishedLast`, this function just reads it", () => {
    // A shared last is simply `finishedLast: true` on more than one row of the
    // same game across different players — this function only ever sees one
    // player's own rows, so there's nothing further for it to do with the
    // sharing itself; it reads no differently from two solo lasts in a row.
    const games = [g("g1", "2026-01-01", true), g("g2", "2026-01-08", true)];
    expect(currentLastPlaceStreak(games)).toEqual({ length: 2, gameIds: ["g1", "g2"] });
  });

  it("re-sorts by playedOn then createdAt regardless of input order", () => {
    const games = [g("g2", "2026-01-08", true), g("g1", "2026-01-01", true)];
    expect(currentLastPlaceStreak(games)).toEqual({ length: 2, gameIds: ["g1", "g2"] });
  });

  it("createdAt breaks a tie on the same playedOn date", () => {
    const games: LastPlaceGame[] = [
      { gameId: "later", playedOn: "2026-01-01", createdAt: "2026-01-01T09:00:00Z", finishedLast: true },
      { gameId: "earlier", playedOn: "2026-01-01", createdAt: "2026-01-01T08:00:00Z", finishedLast: true },
    ];
    expect(currentLastPlaceStreak(games)).toEqual({ length: 2, gameIds: ["earlier", "later"] });
  });

  it("an empty games array has no current run", () => {
    expect(currentLastPlaceStreak([])).toBeNull();
  });
});

describe("headToHead — criterion 197 (symmetric, one function)", () => {
  it("a solo win each way, over two shared games", () => {
    const games: HeadToHeadGame[] = [
      { gameId: "g1", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g2", aWon: false, bWon: true, aScore: 90, bScore: 50 },
    ];
    const h2h = headToHead(games);
    expect(h2h.gamesTogether).toBe(2);
    expect(h2h.a).toEqual({ wins: 1, winRate: 0.5, above: 1, aboveRate: 0.5 });
    expect(h2h.b).toEqual({ wins: 1, winRate: 0.5, above: 1, aboveRate: 0.5 });
  });

  it("⚠️ a shared win between A and B counts in full for both", () => {
    const games: HeadToHeadGame[] = [
      { gameId: "g1", aWon: true, bWon: true, aScore: 50, bScore: 50 },
    ];
    const h2h = headToHead(games);
    expect(h2h.a.wins).toBe(1);
    expect(h2h.b.wins).toBe(1);
    // A level final score is neither above nor below (criterion 198).
    expect(h2h.a.above).toBe(0);
    expect(h2h.b.above).toBe(0);
  });

  it("⚠️ a third player's win counts in gamesTogether and in neither win column", () => {
    const games: HeadToHeadGame[] = [
      // Neither A nor B won this game (a third player did) — both aWon/bWon are false —
      // but A still finished above B on final score.
      { gameId: "g1", aWon: false, bWon: false, aScore: 60, bScore: 90 },
    ];
    const h2h = headToHead(games);
    expect(h2h.gamesTogether).toBe(1);
    expect(h2h.a.wins).toBe(0);
    expect(h2h.b.wins).toBe(0);
    expect(h2h.a.above).toBe(1);
    expect(h2h.a.aboveRate).toBe(1);
    expect(h2h.b.above).toBe(0);
  });

  it("⚠️ symmetric: swapping A and B in every game mirrors the result exactly", () => {
    const games: HeadToHeadGame[] = [
      { gameId: "g1", aWon: true, bWon: false, aScore: 40, bScore: 90 },
      { gameId: "g2", aWon: false, bWon: false, aScore: 60, bScore: 55 },
      { gameId: "g3", aWon: true, bWon: true, aScore: 30, bScore: 30 },
    ];
    const mirrored: HeadToHeadGame[] = games.map((g) => ({
      gameId: g.gameId,
      aWon: g.bWon,
      bWon: g.aWon,
      aScore: g.bScore,
      bScore: g.aScore,
    }));
    const forward = headToHead(games);
    const backward = headToHead(mirrored);
    expect(backward.a).toEqual(forward.b);
    expect(backward.b).toEqual(forward.a);
    expect(backward.gamesTogether).toBe(forward.gamesTogether);
  });

  it("an empty shared history has no games together and no rates", () => {
    const h2h = headToHead([]);
    expect(h2h.gamesTogether).toBe(0);
    expect(h2h.a).toEqual({ wins: 0, winRate: 0, above: 0, aboveRate: 0 });
  });
});

describe("nemesis — criteria 199–201", () => {
  it("a clear holder: the single opponent with the highest above-rate", () => {
    const candidates: NemesisCandidate[] = [
      { playerId: "p-sam", displayName: "Sam", aboveRate: 8 / 9, gamesTogether: 9 },
      { playerId: "p-jo", displayName: "Jo", aboveRate: 0.5, gamesTogether: 4 },
    ];
    const result = nemesis(candidates);
    expect(result.holders.map((h) => h.playerId)).toEqual(["p-sam"]);
    expect(result.aboveRatePercent).toBeCloseTo(88.9, 1);
  });

  it("a tie: joint holders, alphabetical, no games-played tie-break", () => {
    const candidates: NemesisCandidate[] = [
      { playerId: "p-zoe", displayName: "Zoe", aboveRate: 2 / 3, gamesTogether: 3 },
      { playerId: "p-amy", displayName: "Amy", aboveRate: 2 / 3, gamesTogether: 30 },
    ];
    const result = nemesis(candidates);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Zoe"]);
    expect(result.aboveRatePercent).toBeCloseTo(66.7, 1);
  });

  it("⚠️ nobody qualifies: every candidate is at a zero above-rate", () => {
    const candidates: NemesisCandidate[] = [
      { playerId: "p-sam", displayName: "Sam", aboveRate: 0, gamesTogether: 5 },
      { playerId: "p-jo", displayName: "Jo", aboveRate: 0, gamesTogether: 2 },
    ];
    expect(nemesis(candidates)).toEqual({ holders: [], aboveRatePercent: null });
  });

  it("a player with no shared games at all has no candidates and no nemesis", () => {
    expect(nemesis([])).toEqual({ holders: [], aboveRatePercent: null });
  });

  it("an opponent who has never once finished above P never holds the title, even alone", () => {
    const candidates: NemesisCandidate[] = [
      { playerId: "p-sam", displayName: "Sam", aboveRate: 0, gamesTogether: 12 },
    ];
    expect(nemesis(candidates)).toEqual({ holders: [], aboveRatePercent: null });
  });

  it("⚠️ rounds to one decimal place BEFORE comparing — two genuinely different raw above-rates that display identically are joint holders, not a hidden single winner", () => {
    // 6/31 = 19.3548…%, 7/36 = 19.4444…% — different raw fractions (neither a
    // multiple of the other), but both round to the same displayed 19.4%.
    const a = 6 / 31; // 19.35...%
    const b = 7 / 36; // 19.44...%
    expect(a).not.toBe(b); // genuinely distinct raw fractions, the whole point of this case
    expect(Math.round(a * 1000) / 10).toBe(Math.round(b * 1000) / 10); // both round to 19.4

    const candidates: NemesisCandidate[] = [
      { playerId: "p-zed", displayName: "Zed", aboveRate: a, gamesTogether: 31 },
      { playerId: "p-amy", displayName: "Amy", aboveRate: b, gamesTogether: 36 },
    ];
    const result = nemesis(candidates);
    // A naive "strictly highest raw aboveRate wins" implementation would crown
    // only Amy (the larger raw fraction) here — this is exactly the invisible,
    // sub-decimal tie-break criterion 199 forbids. Both must be joint holders,
    // because on screen both read "19.4%".
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Zed"]);
    expect(result.aboveRatePercent).toBeCloseTo(19.4, 1);
  });
});

describe("venueBreakdown — criterion 250 (one shared function, two rendering contexts)", () => {
  it("groups by (venue, player): a player's own participations yield one row per venue", () => {
    const rows: VenueParticipation[] = [
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-1", finalScore: 40, won: true },
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-1", finalScore: 60, won: false },
      { locationId: "loc-b", locationName: "Bo's", playerId: "p-1", finalScore: 50, won: true },
      { locationId: null, locationName: null, playerId: "p-1", finalScore: 70, won: false },
    ];
    const result = venueBreakdown(rows);
    expect(result).toHaveLength(3);

    const atA = result.find((r) => r.locationId === "loc-a")!;
    expect(atA.gamesPlayed).toBe(2);
    expect(atA.wins).toBe(1);
    expect(atA.winRate).toBeCloseTo(0.5, 5);
    expect(atA.average).toBe(50);

    const noLocation = result.find((r) => r.locationId === null)!;
    expect(noLocation.gamesPlayed).toBe(1);
    expect(noLocation.wins).toBe(0);
  });

  it("groups by (venue, player): one venue's own participations yield one row per player", () => {
    const rows: VenueParticipation[] = [
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-1", finalScore: 40, won: true },
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-2", finalScore: 60, won: false },
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-1", finalScore: 30, won: true },
    ];
    const result = venueBreakdown(rows);
    expect(result).toHaveLength(2);
    const p1 = result.find((r) => r.playerId === "p-1")!;
    expect(p1.gamesPlayed).toBe(2);
    expect(p1.wins).toBe(2);
    expect(p1.average).toBe(35);
  });

  it("never determines a winner itself — a `won` of false is simply not tallied", () => {
    const rows: VenueParticipation[] = [
      { locationId: "loc-a", locationName: "Alex's", playerId: "p-1", finalScore: 100, won: false },
    ];
    const result = venueBreakdown(rows);
    expect(result[0]!.wins).toBe(0);
    expect(result[0]!.winRate).toBe(0);
  });
});

describe("homeAdvantage — criteria 253–254", () => {
  function candidate(overrides: Partial<HomeAdvantageCandidate>): HomeAdvantageCandidate {
    return {
      playerId: "p-sam",
      displayName: "Sam",
      locationId: "loc-e",
      locationName: "Player E's",
      hereWins: 0,
      hereGames: 0,
      elsewhereWins: 0,
      elsewhereGames: 0,
      ...overrides,
    };
  }

  it("QA's own worked example: 3 of 4 at one venue, 1 of 8 elsewhere", () => {
    const candidates: HomeAdvantageCandidate[] = [
      candidate({ hereWins: 3, hereGames: 4, elsewhereWins: 1, elsewhereGames: 8 }),
    ];
    const result = homeAdvantage(candidates);
    expect(result.holders).toHaveLength(1);
    const holder = result.holders[0]!;
    expect(holder.here).toEqual({ wins: 3, games: 4, ratePercent: 75 });
    expect(holder.elsewhere).toEqual({ wins: 1, games: 8, ratePercent: 12.5 });
    expect(holder.gapPercentagePoints).toBeCloseTo(62.5, 1);
    expect(result.gapPercentagePoints).toBeCloseTo(62.5, 1);
  });

  it("⚠️ a player with no games at any other known venue contributes no pair at all", () => {
    const candidates: HomeAdvantageCandidate[] = [
      candidate({ hereWins: 4, hereGames: 4, elsewhereWins: 0, elsewhereGames: 0 }),
    ];
    expect(homeAdvantage(candidates)).toEqual({ holders: [], gapPercentagePoints: null });
  });

  it("⚠️ a gap of zero or less never holds the record, at any sample size", () => {
    const candidates: HomeAdvantageCandidate[] = [
      candidate({ hereWins: 2, hereGames: 4, elsewhereWins: 2, elsewhereGames: 4 }), // gap 0
      candidate({
        playerId: "p-jo",
        displayName: "Jo",
        hereWins: 1,
        hereGames: 4,
        elsewhereWins: 5,
        elsewhereGames: 5,
      }), // gap negative
    ];
    expect(homeAdvantage(candidates)).toEqual({ holders: [], gapPercentagePoints: null });
  });

  it("⚠️ a one-game venue is shown holding it, unhedged", () => {
    const candidates: HomeAdvantageCandidate[] = [
      candidate({ hereWins: 1, hereGames: 1, elsewhereWins: 0, elsewhereGames: 3 }),
    ];
    const result = homeAdvantage(candidates);
    expect(result.holders).toHaveLength(1);
    expect(result.holders[0]!.here).toEqual({ wins: 1, games: 1, ratePercent: 100 });
    expect(result.holders[0]!.elsewhere).toEqual({ wins: 0, games: 3, ratePercent: 0 });
    expect(result.holders[0]!.gapPercentagePoints).toBe(100);
  });

  it("joint holders: every (player, venue) pair on the highest gap, alphabetical by player then venue", () => {
    const candidates: HomeAdvantageCandidate[] = [
      candidate({
        playerId: "p-zoe",
        displayName: "Zoe",
        locationId: "loc-z",
        locationName: "Zoe's",
        hereWins: 4,
        hereGames: 4,
        elsewhereWins: 0,
        elsewhereGames: 4,
      }),
      candidate({
        playerId: "p-amy",
        displayName: "Amy",
        locationId: "loc-a",
        locationName: "Amy's",
        hereWins: 4,
        hereGames: 4,
        elsewhereWins: 0,
        elsewhereGames: 4,
      }),
      // The same player twice, at two different venues — both above may tie.
      candidate({
        playerId: "p-amy",
        displayName: "Amy",
        locationId: "loc-b",
        locationName: "Bo's",
        hereWins: 2,
        hereGames: 4,
        elsewhereWins: 1,
        elsewhereGames: 4,
      }),
    ];
    const result = homeAdvantage(candidates);
    expect(result.holders.map((h) => `${h.displayName}/${h.locationName}`)).toEqual([
      "Amy/Amy's",
      "Zoe/Zoe's",
    ]);
  });

  it("⚠️ ties are judged on the gap as displayed, to one decimal place", () => {
    // 6/31 - 0 and 7/36 - 0, both rounding to the same displayed gap, mirroring
    // nemesis's own sub-decimal tie-break test above.
    const a = 6 / 31;
    const b = 7 / 36;
    expect(Math.round(a * 1000) / 10).toBe(Math.round(b * 1000) / 10);

    const candidates: HomeAdvantageCandidate[] = [
      candidate({
        playerId: "p-zed",
        displayName: "Zed",
        hereWins: Math.round(a * 31),
        hereGames: 31,
        elsewhereWins: 0,
        elsewhereGames: 5,
      }),
      candidate({
        playerId: "p-amy",
        displayName: "Amy",
        hereWins: Math.round(b * 36),
        hereGames: 36,
        elsewhereWins: 0,
        elsewhereGames: 5,
      }),
    ];
    const result = homeAdvantage(candidates);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Zed"]);
  });

  it("no candidates at all: the no-holder case", () => {
    expect(homeAdvantage([])).toEqual({ holders: [], gapPercentagePoints: null });
  });
});

describe("looksLikeCheating — criteria 297–299 (open question 15, option C)", () => {
  function candidate(overrides: Partial<CheatingCandidate>): CheatingCandidate {
    return {
      playerId: "p-sam",
      displayName: "Sam",
      gamesPlayed: 0,
      wins: 0,
      otherWins: 0,
      otherGames: 0,
      ...overrides,
    };
  }

  it("QA's own worked example: a heavy winner who plays rarely, against opponents who otherwise win constantly", () => {
    // Sam: 4 wins in 5 games. The other seats in those same 5 games (3
    // opponents each): 15 other-seat-games, only 1 other win.
    const candidates: CheatingCandidate[] = [
      candidate({ gamesPlayed: 5, wins: 4, otherWins: 1, otherGames: 15 }),
    ];
    const result = looksLikeCheating(candidates);
    expect(result.holders).toHaveLength(1);
    const holder = result.holders[0]!;
    expect(holder.own).toEqual({ wins: 4, games: 5, ratePercent: 80 });
    expect(holder.others).toEqual({ wins: 1, games: 15, ratePercent: 6.7 });
    expect(holder.gapPercentagePoints).toBeCloseTo(73.3, 1);
    expect(result.gapPercentagePoints).toBeCloseTo(73.3, 1);
  });

  it("⚠️ no 'gap must be positive' floor — the largest gap wins even when every candidate's own gap is negative", () => {
    const candidates: CheatingCandidate[] = [
      candidate({ playerId: "p-amy", displayName: "Amy", gamesPlayed: 4, wins: 0, otherWins: 6, otherGames: 12 }),
      candidate({ playerId: "p-bo", displayName: "Bo", gamesPlayed: 4, wins: 1, otherWins: 9, otherGames: 12 }),
    ];
    const result = looksLikeCheating(candidates);
    // Amy: 0% - 50% = -50. Bo: 25% - 75% = -50. A genuine tie, both negative.
    expect(result.gapPercentagePoints).toBe(-50);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Bo"]);
  });

  it("⚠️ a small archive can produce a 100%-against-0% gap, rendered plainly", () => {
    const candidates: CheatingCandidate[] = [candidate({ gamesPlayed: 1, wins: 1, otherWins: 0, otherGames: 2 })];
    const result = looksLikeCheating(candidates);
    expect(result.holders[0]!.own.ratePercent).toBe(100);
    expect(result.holders[0]!.others.ratePercent).toBe(0);
    expect(result.holders[0]!.gapPercentagePoints).toBe(100);
  });

  it("a shared win is a full win on both sides of the gap", () => {
    // Sam and one opponent share the win in every one of 2 games (2-player
    // table): Sam's own rate is 2/2, the other seat's rate is also 2/2 —
    // gap 0, not a false advantage for either side.
    const candidates: CheatingCandidate[] = [candidate({ gamesPlayed: 2, wins: 2, otherWins: 2, otherGames: 2 })];
    expect(looksLikeCheating(candidates).gapPercentagePoints).toBe(0);
  });

  it("joint holders: every player tied for the largest gap, alphabetical", () => {
    const candidates: CheatingCandidate[] = [
      candidate({ playerId: "p-zoe", displayName: "Zoe", gamesPlayed: 4, wins: 4, otherWins: 0, otherGames: 12 }),
      candidate({ playerId: "p-amy", displayName: "Amy", gamesPlayed: 4, wins: 4, otherWins: 0, otherGames: 12 }),
    ];
    const result = looksLikeCheating(candidates);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Zoe"]);
  });

  it("a player with no games, or a defensive zero-other-games candidate, contributes no pair", () => {
    const candidates: CheatingCandidate[] = [
      candidate({ gamesPlayed: 0, wins: 0, otherWins: 0, otherGames: 0 }),
      candidate({ playerId: "p-jo", displayName: "Jo", gamesPlayed: 3, wins: 1, otherWins: 0, otherGames: 0 }),
    ];
    expect(looksLikeCheating(candidates)).toEqual({ holders: [], gapPercentagePoints: null });
  });

  it("no candidates at all: the no-holder case", () => {
    expect(looksLikeCheating([])).toEqual({ holders: [], gapPercentagePoints: null });
  });
});

describe("metronome — criteria 307–309", () => {
  function candidate(overrides: Partial<MetronomeCandidate>): MetronomeCandidate {
    return { playerId: "p-sam", displayName: "Sam", finalScores: [], ...overrides };
  }

  it("the smallest range wins — the opposite direction from every other gap on the board", () => {
    const candidates: MetronomeCandidate[] = [
      candidate({ finalScores: [50, 90, 70] }), // range 40
      candidate({ playerId: "p-jo", displayName: "Jo", finalScores: [60, 65] }), // range 5
    ];
    const result = metronome(candidates);
    expect(result.range).toBe(5);
    expect(result.holders).toEqual([
      { playerId: "p-jo", displayName: "Jo", gamesPlayed: 2, range: 5, highest: 65, lowest: 60 },
    ]);
  });

  it("⚠️ a spread needs two observations — a single-game player contributes no candidate, not a range of zero", () => {
    const candidates: MetronomeCandidate[] = [candidate({ finalScores: [78] })];
    expect(metronome(candidates)).toEqual({ range: null, holders: [] });
  });

  it("⚠️ no minimum-games floor — a two-game player can and will hold the record over a twenty-game one", () => {
    const candidates: MetronomeCandidate[] = [
      candidate({ playerId: "p-veteran", displayName: "Veteran", finalScores: Array.from({ length: 20 }, (_, i) => 40 + i) }), // range 19
      candidate({ playerId: "p-newbie", displayName: "Newbie", finalScores: [55, 58] }), // range 3
    ];
    const result = metronome(candidates);
    expect(result.range).toBe(3);
    expect(result.holders[0]!.displayName).toBe("Newbie");
    expect(result.holders[0]!.gamesPlayed).toBe(2);
  });

  it("states both ends of the range alongside the game count (criterion 309)", () => {
    const candidates: MetronomeCandidate[] = [candidate({ finalScores: [100, 40, 70, 55] })];
    const holder = metronome(candidates).holders[0]!;
    expect(holder).toEqual({
      playerId: "p-sam",
      displayName: "Sam",
      gamesPlayed: 4,
      range: 60,
      highest: 100,
      lowest: 40,
    });
  });

  it("joint holders: every player tied for the smallest range, alphabetical", () => {
    const candidates: MetronomeCandidate[] = [
      candidate({ playerId: "p-zoe", displayName: "Zoe", finalScores: [50, 60] }), // range 10
      candidate({ playerId: "p-amy", displayName: "Amy", finalScores: [70, 80] }), // range 10
    ];
    const result = metronome(candidates);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Amy", "Zoe"]);
  });

  it("a range of exactly zero (every score identical) is a real, valid holder", () => {
    const candidates: MetronomeCandidate[] = [candidate({ finalScores: [60, 60, 60] })];
    expect(metronome(candidates).range).toBe(0);
  });

  it("no candidates at all: the no-holder case", () => {
    expect(metronome([])).toEqual({ range: null, holders: [] });
  });
});

describe("perHandMeans — criterion 225", () => {
  it("SHEET_01 hand 1: the mean across all four players", () => {
    // Hand 1 running totals equal the handScores themselves: 28, 0, 23, 29.
    const means = perHandMeans(singleHandInstancesFor(SHEET_01, "g1"));
    const hand1 = means.find((m) => m.hand === 1)!;
    expect(hand1.label).toBe("3s");
    expect(hand1.mean).toBe((28 + 0 + 23 + 29) / 4); // 20.0, exact
  });

  it("SHEET_01 hand 2: a mean that needs rounding to one decimal", () => {
    // Hand 2: A=4, B=3, C=0, D=0 → 7/4 = 1.75 → 1.8.
    const means = perHandMeans(singleHandInstancesFor(SHEET_01, "g1"));
    expect(means.find((m) => m.hand === 2)!.mean).toBe(1.8);
  });

  it("only hands actually present appear, same convention as roundWinners", () => {
    const means = perHandMeans([{ hand: 5, score: 10 }]);
    expect(means).toEqual([{ hand: 5, label: "7s", mean: 10 }]);
  });

  it("an empty input returns no hands and does not crash", () => {
    expect(perHandMeans([])).toEqual([]);
  });

  it("serves both scopes the PRD asks for: one player's rows, or every row in the archive", () => {
    // One player's own hand profile: Player D's SHEET_01 rows only. With one
    // game, each hand's "mean" is simply that hand's own score.
    const playerDRows = singleHandInstancesFor(SHEET_01, "g1").filter((r) => r.playerId === PLAYER_D);
    const profile = perHandMeans(playerDRows);
    expect(profile.find((m) => m.hand === 11)!.mean).toBe(44);

    // The whole archive: every row from both fixture games.
    const archiveRows = [...singleHandInstancesFor(SHEET_01, "g1"), ...singleHandInstancesFor(SHEET_02, "g2")];
    const trend = perHandMeans(archiveRows);
    expect(trend).toHaveLength(11);
  });
});

describe("handsBledOn — criterion 226", () => {
  it("Player D's own worst hand, over their one recorded game, is Kings", () => {
    const playerDRows = singleHandInstancesFor(SHEET_01, "g1").filter((r) => r.playerId === PLAYER_D);
    const profile = perHandMeans(playerDRows);
    const bled = handsBledOn(profile);
    expect(bled).toEqual({ mean: 44, hands: ["Kings"] });
  });

  it("⚠️ ties are joint and every tied hand is named", () => {
    const means = [
      { hand: 9, label: "Jacks" as const, mean: 50 },
      { hand: 10, label: "Queens" as const, mean: 30 },
      { hand: 11, label: "Kings" as const, mean: 50 },
    ];
    const bled = handsBledOn(means);
    expect(bled).toEqual({ mean: 50, hands: ["Jacks", "Kings"] });
  });

  it("a player with no hand data at all has no worst hand (the defensive no-rows case)", () => {
    expect(handsBledOn([])).toBeNull();
  });
});

describe("bestGameEver / worstGameEver — criteria 228–229, verified against fixtures/sheets/GROUND-TRUTH.md", () => {
  const archive = [...finalScoreInstancesFor(SHEET_01, "g1"), ...finalScoreInstancesFor(SHEET_02, "g2")];

  it("best game ever: the lowest final score across both fixture games is Player B's 71 (SHEET_02)", () => {
    const best = bestGameEver(archive);
    expect(best).toEqual({
      score: 71,
      instances: [{ playerId: PLAYER_B, gameId: "g2", score: 71 }],
    });
  });

  it("worst game ever: the highest final score across both fixture games is Player D's 240 (SHEET_02)", () => {
    const worst = worstGameEver(archive);
    expect(worst).toEqual({
      score: 240,
      instances: [{ playerId: PLAYER_D, gameId: "g2", score: 240 }],
    });
  });

  it("⚠️ the same player posting the record in two different games is listed as two instances", () => {
    const instances: FinalScoreInstance[] = [
      { playerId: PLAYER_A, gameId: "g1", score: 50 },
      { playerId: PLAYER_A, gameId: "g2", score: 50 },
      { playerId: PLAYER_B, gameId: "g3", score: 90 },
    ];
    const best = bestGameEver(instances);
    expect(best!.score).toBe(50);
    expect(best!.instances).toHaveLength(2);
    expect(best!.instances.map((i) => i.gameId).sort()).toEqual(["g1", "g2"]);
  });

  it("two different players tied in the same game are both instances of that one game", () => {
    const instances: FinalScoreInstance[] = [
      { playerId: PLAYER_A, gameId: "g1", score: 40 },
      { playerId: PLAYER_B, gameId: "g1", score: 40 },
      { playerId: PLAYER_C, gameId: "g1", score: 90 },
    ];
    const best = bestGameEver(instances);
    expect(best!.instances.map((i) => i.playerId).sort()).toEqual([PLAYER_A, PLAYER_B]);
  });

  it("an empty archive has no best or worst game", () => {
    expect(bestGameEver([])).toBeNull();
    expect(worstGameEver([])).toBeNull();
  });
});

describe("catastrophe — criterion 230, verified against fixtures/sheets/GROUND-TRUTH.md", () => {
  it("the single biggest round_score in either fixture game is Player D's 55 (SHEET_02, 8s)", () => {
    const archive = [...singleHandInstancesFor(SHEET_01, "g1"), ...singleHandInstancesFor(SHEET_02, "g2")];
    const result = catastrophe(archive);
    expect(result).toEqual({
      score: 55,
      instances: [{ playerId: PLAYER_D, gameId: "g2", hand: 6, score: 55 }],
    });
  });

  it("⚠️ the same player twice, once per hand, is two instances", () => {
    const instances: SingleHandInstance[] = [
      { playerId: PLAYER_A, gameId: "g1", hand: 4, score: 60 },
      { playerId: PLAYER_A, gameId: "g1", hand: 9, score: 60 },
      { playerId: PLAYER_B, gameId: "g1", hand: 2, score: 30 },
    ];
    const result = catastrophe(instances);
    expect(result!.score).toBe(60);
    expect(result!.instances).toHaveLength(2);
    expect(result!.instances.map((i) => i.hand).sort()).toEqual([4, 9]);
  });

  it("an empty archive has no catastrophe", () => {
    expect(catastrophe([])).toBeNull();
  });
});

describe("biggestSingleHandDisasters — criterion 240", () => {
  it("returns the top N, sorted highest first", () => {
    const instances: SingleHandInstance[] = [10, 40, 25, 5].map((score, i) => ({
      playerId: PLAYER_A,
      gameId: "g1",
      hand: i + 1,
      score,
    }));
    const top = biggestSingleHandDisasters(instances, 2);
    expect(top.map((i) => i.score)).toEqual([40, 25]);
  });

  it("⚠️ ties at the cutoff are all kept — the list runs past `limit`", () => {
    const instances: SingleHandInstance[] = [10, 9, 9, 9, 5].map((score, i) => ({
      playerId: PLAYER_A,
      gameId: "g1",
      hand: i + 1,
      score,
    }));
    const top = biggestSingleHandDisasters(instances, 3);
    // sorted: 10, 9, 9, 9, 5 — the cutoff score (3rd place) is 9, and every 9 stays.
    expect(top.map((i) => i.score)).toEqual([10, 9, 9, 9]);
  });

  it("an archive with fewer hands than the limit returns what exists, not padded", () => {
    const instances: SingleHandInstance[] = [{ playerId: PLAYER_A, gameId: "g1", hand: 1, score: 10 }];
    expect(biggestSingleHandDisasters(instances, 10)).toHaveLength(1);
  });

  it("an empty archive returns an empty list", () => {
    expect(biggestSingleHandDisasters([], 10)).toEqual([]);
  });
});

describe("zeroHandCountsByPlayerGame / cleanestSheet — criterion 231, verified against fixtures/sheets/GROUND-TRUTH.md", () => {
  it("Player D's SHEET_01 sheet — six consecutive 64s — reads as 7 zero-point hands in that one game", () => {
    // Hand 2 (29→29) is also a zero, on top of the five inside the run of
    // 64s (hands 4–8) and hand 10 (67→67) — 7 in total, hand-counted against
    // GROUND-TRUTH.md's own derived-scores table.
    const counts = zeroHandCountsByPlayerGame(singleHandInstancesFor(SHEET_01, "g1"));
    const playerD = counts.find((c) => c.playerId === PLAYER_D)!;
    expect(playerD.count).toBe(7);
  });

  it("cleanest sheet crowns Player D's 7-zero SHEET_01 game across the whole archive", () => {
    const archive = [...singleHandInstancesFor(SHEET_01, "g1"), ...singleHandInstancesFor(SHEET_02, "g2")];
    const counts = zeroHandCountsByPlayerGame(archive);
    const result = cleanestSheet(counts);
    expect(result).toEqual({
      count: 7,
      instances: [{ playerId: PLAYER_D, gameId: "g1", count: 7 }],
    });
  });

  it("⚠️ not a career total (decision 18): the same player's zeros in two different games never sum", () => {
    const instances: SingleHandInstance[] = [
      // Player A: 4 zeros in g1, 4 zeros in g2 — 8 combined, but never in the
      // same game, so neither game reaches Player B's single-game 5.
      ...[1, 2, 3, 4].map((hand) => ({ playerId: PLAYER_A, gameId: "g1", hand, score: 0 })),
      ...[5, 6, 7, 8].map((hand) => ({ playerId: PLAYER_A, gameId: "g2", hand, score: 0 })),
      ...[1, 2, 3, 4, 5].map((hand) => ({ playerId: PLAYER_B, gameId: "g3", hand, score: 0 })),
    ];
    const counts = zeroHandCountsByPlayerGame(instances);
    expect(counts.find((c) => c.playerId === PLAYER_A && c.gameId === "g1")!.count).toBe(4);
    expect(counts.find((c) => c.playerId === PLAYER_A && c.gameId === "g2")!.count).toBe(4);
    const result = cleanestSheet(counts);
    expect(result).toEqual({ count: 5, instances: [{ playerId: PLAYER_B, gameId: "g3", count: 5 }] });
  });

  it("a score of exactly 0 counts; anything else doesn't", () => {
    const counts = zeroHandCountsByPlayerGame([
      { playerId: PLAYER_A, gameId: "g1", hand: 1, score: 0 },
      { playerId: PLAYER_A, gameId: "g1", hand: 2, score: 1 },
    ]);
    expect(counts).toEqual([{ playerId: PLAYER_A, gameId: "g1", count: 1 }]);
  });

  it("an empty archive has no cleanest sheet", () => {
    expect(cleanestSheet([])).toBeNull();
  });
});

describe("biggestHammering — criterion 232, imports Stage 2's winningMargin/secondPlace verbatim", () => {
  it("SHEET_01 vs SHEET_02's own margins: SHEET_02's 73 beats SHEET_01's 31", () => {
    // SHEET_01: winner Player C (78), second place Player B (109) → margin 31.
    // SHEET_02: winner Player B (71), second place Player C (144) → margin 73.
    const sheet1Scores = SHEET_01.columns.map((c) => ({
      playerId: c.player,
      score: c.runningTotals[c.runningTotals.length - 1]!,
    }));
    const sheet2Scores = SHEET_02.columns.map((c) => ({
      playerId: c.player,
      score: c.runningTotals[c.runningTotals.length - 1]!,
    }));
    expect(winningMargin(sheet1Scores)).toBe(31);
    expect(winningMargin(sheet2Scores)).toBe(73);

    const instances: HammeringInstance[] = [
      { gameId: "g1", margin: winningMargin(sheet1Scores)!, winnerIds: ["Player C"] },
      { gameId: "g2", margin: winningMargin(sheet2Scores)!, winnerIds: ["Player B"] },
    ];
    const result = biggestHammering(instances);
    expect(result).toEqual({
      margin: 73,
      instances: [{ gameId: "g2", margin: 73, winnerIds: ["Player B"] }],
    });
  });

  it("⚠️ a shared win's instance names every co-winner against the one margin", () => {
    const instances: HammeringInstance[] = [
      { gameId: "g1", margin: 20, winnerIds: [PLAYER_A, PLAYER_B] },
      { gameId: "g2", margin: 10, winnerIds: [PLAYER_C] },
    ];
    const result = biggestHammering(instances);
    expect(result!.margin).toBe(20);
    expect(result!.instances[0]!.winnerIds).toEqual([PLAYER_A, PLAYER_B]);
  });

  it("two games tied on the margin are both instances, each with its own winner(s)", () => {
    const instances: HammeringInstance[] = [
      { gameId: "g1", margin: 30, winnerIds: [PLAYER_A] },
      { gameId: "g2", margin: 30, winnerIds: [PLAYER_B] },
    ];
    const result = biggestHammering(instances);
    expect(result!.instances.map((i) => i.gameId).sort()).toEqual(["g1", "g2"]);
  });

  it("⚠️ defines nothing of its own: a game with no second place is simply never in `instances`", () => {
    // An all-level game's `winningMargin` is `null` (Stage 2, criterion 215) —
    // this module's caller (`lib/board/queries.ts`) never pushes it into
    // `instances` at all, which this test asserts by construction: an empty
    // `instances` array (the all-level game's own contribution) contributes
    // nothing, exactly like an archive with no games.
    const allLevelScores = [
      { playerId: PLAYER_A, score: 75 },
      { playerId: PLAYER_B, score: 75 },
      { playerId: PLAYER_C, score: 75 },
    ];
    expect(winningMargin(allLevelScores)).toBeNull();
    expect(biggestHammering([])).toBeNull();
  });
});

describe("clutchComebackInstances / mostClutchComeback — criteria 304–306", () => {
  function row(playerId: string, gameId: string, runningTotalAtClutchHand: number, wonOutright: boolean): ClutchCandidate {
    return { playerId, gameId, runningTotalAtClutchHand, wonOutright };
  }

  it("the founder's own formula: deficit at hand 9 against that game's own lowest, still won outright", () => {
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g2", 90, true), // 30 behind the leader at hand 9, but still won outright
      row(PLAYER_B, "g2", 60, false), // the leader at hand 9
    ];
    const instances = clutchComebackInstances(candidates);
    expect(instances).toEqual([{ playerId: PLAYER_A, gameId: "g2", deficit: 30 }]);
    expect(mostClutchComeback(instances)).toEqual({ deficit: 30, instances });
  });

  it("the game's own leader at hand 9, who then wins outright, contributes no instance — they were never behind", () => {
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g1", 60, true), // leader at hand 9 (the game's own lowest) and the outright winner
      row(PLAYER_B, "g1", 90, false),
    ];
    expect(clutchComebackInstances(candidates)).toEqual([]);
  });

  it("⚠️ a deficit of zero is not a comeback — level with the leader at hand 9 is excluded", () => {
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g1", 50, true),
      row(PLAYER_B, "g1", 50, false), // tied with the winner at hand 9, but B didn't win the game
    ];
    expect(clutchComebackInstances(candidates)).toEqual([]);
  });

  it("⚠️ AMENDED 2026-09-15 (open question 18): a shared win does NOT count, the named exception to kickoff decision 1", () => {
    // The player furthest behind at hand 9 finishes level at the top —
    // `wonOutright: false` for both, since the caller (lib/board/queries.ts)
    // computes it from `winnerIds.length === 1`. No comeback record at all
    // for this game.
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g1", 90, false), // 30 behind at hand 9, but only shares the win
      row(PLAYER_B, "g1", 60, false), // the leader at hand 9, also shares the win
    ];
    expect(clutchComebackInstances(candidates)).toEqual([]);
    expect(mostClutchComeback(clutchComebackInstances(candidates))).toBeNull();
  });

  it("⚠️ the card is held by the next largest deficit that ended in an outright win, once the tied-win game is excluded", () => {
    const candidates: ClutchCandidate[] = [
      // g1: a 40-point deficit overturned, but only into a shared win — excluded.
      row(PLAYER_A, "g1", 100, false),
      row(PLAYER_B, "g1", 60, false),
      // g2: a smaller, 20-point deficit, overturned into a real outright win.
      row(PLAYER_C, "g2", 80, true),
      row(PLAYER_D, "g2", 60, false),
    ];
    const instances = clutchComebackInstances(candidates);
    expect(mostClutchComeback(instances)).toEqual({
      deficit: 20,
      instances: [{ playerId: PLAYER_C, gameId: "g2", deficit: 20 }],
    });
  });

  it("joint holders: two different games, each won outright by a different player, tied on the same deficit", () => {
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g1", 80, true),
      row(PLAYER_B, "g1", 60, false),
      row(PLAYER_C, "g2", 90, true),
      row(PLAYER_D, "g2", 70, false),
    ];
    const instances = clutchComebackInstances(candidates);
    const result = mostClutchComeback(instances);
    expect(result!.deficit).toBe(20);
    expect(result!.instances.map((i) => i.gameId).sort()).toEqual(["g1", "g2"]);
    expect(result!.instances.map((i) => i.playerId).sort()).toEqual([PLAYER_A, PLAYER_C].sort());
  });

  it("a game's own outright winner who was never behind contributes no instance at all", () => {
    const candidates: ClutchCandidate[] = [
      row(PLAYER_A, "g1", 40, true), // already the leader at hand 9
      row(PLAYER_B, "g1", 70, false),
      row(PLAYER_C, "g1", 90, false),
    ];
    expect(clutchComebackInstances(candidates)).toEqual([]);
  });

  it("no comeback has ever happened: the no-holder case", () => {
    expect(mostClutchComeback([])).toBeNull();
  });

  it("⚠️ QA gap fix (criterion 319): the LARGER of two distinct, both-legitimate (outright-won) deficits wins — closes a mutation-testing hole where inverting mostClutchComeback's own extreme-selection direction passed every other test in this file unnoticed, because every other multi-instance case here is either a single instance or a tie", () => {
    const candidates: ClutchCandidate[] = [
      // g1: a modest 15-point deficit, overturned into a real outright win.
      row(PLAYER_A, "g1", 75, true),
      row(PLAYER_B, "g1", 60, false),
      // g2: a much larger 50-point deficit, also overturned outright.
      row(PLAYER_C, "g2", 110, true),
      row(PLAYER_D, "g2", 60, false),
    ];
    const instances = clutchComebackInstances(candidates);
    expect(mostClutchComeback(instances)).toEqual({
      deficit: 50,
      instances: [{ playerId: PLAYER_C, gameId: "g2", deficit: 50 }],
    });
  });
});
