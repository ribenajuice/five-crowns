/**
 * The board's four definitions — PRD criteria 175–178.
 */

import { describe, expect, it } from "vitest";

import {
  averageFinalScore,
  headToHead,
  longestDrought,
  longestStreak,
  nemesis,
  roundsWon,
  roundWinners,
  secondPlace,
  winningMargin,
  type GameHandScoreRow,
  type HeadToHeadGame,
  type NemesisCandidate,
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
