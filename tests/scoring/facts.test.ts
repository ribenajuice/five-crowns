/**
 * The fun facts pool's eight generators — PRD criteria 282–289.
 *
 * Each generator is exercised against hand-constructed rows, not the DB —
 * `tests/board/facts.test.ts` covers `getFunFacts()`'s own fetch-and-reshape
 * layer and its bounded query count. This file is purely about whether each
 * definition is *correct*: the exact run-length counting, the exact
 * chronological sequencing, the exact threshold boundaries.
 */

import { describe, expect, it } from "vitest";

import {
  collectiveTrivia,
  comebackNobodyAskedFor,
  currentDrought,
  flatliner,
  headToHead,
  overdue,
  OVERDUE_MIN_GAMES,
  randomOldNight,
  rivalryNeedle,
  RIVALRY_MIN_GAMES_TOGETHER,
  slump,
  SLUMP_THRESHOLD_RATIO,
  type ArchiveGame,
  type NightStory,
  type PairGames,
  type PlayerGameSummary,
} from "@/lib/scoring";

const PLAYER_A = "Player A";
const PLAYER_B = "Player B";
const PLAYER_C = "Player C";

/** A `PlayerGameSummary` with sensible defaults, overridden per test. */
function summary(overrides: Partial<PlayerGameSummary> & Pick<PlayerGameSummary, "gameId" | "playerId" | "playedOn">): PlayerGameSummary {
  return {
    displayName: overrides.playerId,
    createdAt: `${overrides.playedOn}T00:00:00.000Z`,
    won: false,
    finalScore: 0,
    hands: [],
    ...overrides,
  };
}

describe("flatliner — criterion 282", () => {
  it("counts the longest UNBROKEN run, not the total zero count", () => {
    // Hands 1,2 are zero (run of 2), hand 3 breaks it, hands 5,6,7 are zero (run of 3).
    // Total zero hands = 5, but the longest run is 3 — this is exactly the
    // distinction criterion 282 draws against "cleanest sheet" (231).
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        hands: [
          { hand: 1, score: 0 },
          { hand: 2, score: 0 },
          { hand: 3, score: 9 },
          { hand: 4, score: 4 },
          { hand: 5, score: 0 },
          { hand: 6, score: 0 },
          { hand: 7, score: 0 },
        ],
      }),
    ];
    const fact = flatliner(games);
    expect(fact).not.toBeNull();
    expect(fact!.runLength).toBe(3);
    expect(fact!.gameId).toBe("g1");
    expect(fact!.playerId).toBe(PLAYER_A);
  });

  it("a gap in hand numbers breaks a run, same as a missed game breaks a streak", () => {
    // round_score rows for hands 1 and 3 only (hand 2 missing) — not
    // contiguous, so this is two runs of 1, not one run of 2.
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        hands: [
          { hand: 1, score: 0 },
          { hand: 3, score: 0 },
        ],
      }),
    ];
    expect(flatliner(games)!.runLength).toBe(1);
  });

  it("finds the single longest run across the whole archive, not just one game", () => {
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        hands: [
          { hand: 1, score: 0 },
          { hand: 2, score: 0 },
        ],
      }),
      summary({
        gameId: "g2",
        playerId: PLAYER_B,
        playedOn: "2026-01-08",
        hands: [
          { hand: 1, score: 0 },
          { hand: 2, score: 0 },
          { hand: 3, score: 0 },
        ],
      }),
    ];
    const fact = flatliner(games)!;
    expect(fact.playerId).toBe(PLAYER_B);
    expect(fact.runLength).toBe(3);
  });

  it("ties on run length: the earliest game wins", () => {
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "later",
        playerId: PLAYER_A,
        playedOn: "2026-01-08",
        hands: [{ hand: 1, score: 0 }, { hand: 2, score: 0 }],
      }),
      summary({
        gameId: "earlier",
        playerId: PLAYER_B,
        playedOn: "2026-01-01",
        hands: [{ hand: 1, score: 0 }, { hand: 2, score: 0 }],
      }),
    ];
    expect(flatliner(games)!.gameId).toBe("earlier");
  });

  it("nobody has ever recorded a zero hand: null", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", hands: [{ hand: 1, score: 5 }] }),
    ];
    expect(flatliner(games)).toBeNull();
  });

  it("an empty archive has no flatliner", () => {
    expect(flatliner([])).toBeNull();
  });
});

describe("currentDrought — criterion 283", () => {
  it("counts games since the most recent win", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", won: true }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: false }),
      summary({ gameId: "g3", playerId: PLAYER_A, playedOn: "2026-01-15", won: false }),
    ];
    const fact = currentDrought(games);
    expect(fact).toEqual({ key: "currentDrought", playerId: PLAYER_A, displayName: PLAYER_A, gamesSinceWin: 2 });
  });

  it("⚠️ a player currently on a win is skipped entirely, never shown as 0", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", won: false }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: true }),
    ];
    expect(currentDrought(games)).toBeNull();
  });

  it("⚠️ a player who has never won at all is skipped — no anchor to count 'since'", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", won: false }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: false }),
    ];
    expect(currentDrought(games)).toBeNull();
  });

  it("⚠️ a player with zero games is skipped — trivially, since they contribute no rows", () => {
    // Only Player B has any rows at all; Player A (zero games) cannot appear.
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_B, playedOn: "2026-01-01", won: true }),
      summary({ gameId: "g2", playerId: PLAYER_B, playedOn: "2026-01-08", won: false }),
    ];
    const fact = currentDrought(games)!;
    expect(fact.playerId).toBe(PLAYER_B);
  });

  it("among several qualifying players, the longest current drought is reported", () => {
    const games: PlayerGameSummary[] = [
      // Player A: won, then 1 loss.
      summary({ gameId: "a1", playerId: PLAYER_A, playedOn: "2026-01-01", won: true }),
      summary({ gameId: "a2", playerId: PLAYER_A, playedOn: "2026-01-08", won: false }),
      // Player B: won, then 3 losses.
      summary({ gameId: "b1", playerId: PLAYER_B, playedOn: "2026-01-01", won: true }),
      summary({ gameId: "b2", playerId: PLAYER_B, playedOn: "2026-01-08", won: false }),
      summary({ gameId: "b3", playerId: PLAYER_B, playedOn: "2026-01-15", won: false }),
      summary({ gameId: "b4", playerId: PLAYER_B, playedOn: "2026-01-22", won: false }),
    ];
    const fact = currentDrought(games)!;
    expect(fact.playerId).toBe(PLAYER_B);
    expect(fact.gamesSinceWin).toBe(3);
  });

  it("counted in games, not calendar time — the dates jump by months but the drought is still 1", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", won: true }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-09-01", won: false }),
    ];
    expect(currentDrought(games)!.gamesSinceWin).toBe(1);
  });

  it("an empty archive has no current drought", () => {
    expect(currentDrought([])).toBeNull();
  });
});

describe("comebackNobodyAskedFor — criterion 284", () => {
  it("a worst hand followed by a win: the disaster and the redemption, named plainly", () => {
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [{ hand: 4, score: 51 }],
      }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: true }),
    ];
    const fact = comebackNobodyAskedFor(games);
    expect(fact).toEqual({
      key: "comeback",
      playerId: PLAYER_A,
      displayName: PLAYER_A,
      worstGameId: "g1",
      worstPlayedOn: "2026-01-01",
      hand: 4,
      score: 51,
      nextGameId: "g2",
      nextPlayedOn: "2026-01-08",
    });
  });

  it("⚠️ the worst hand's next game was a LOSS: correctly skipped", () => {
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [{ hand: 4, score: 51 }],
      }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: false }),
    ];
    expect(comebackNobodyAskedFor(games)).toBeNull();
  });

  it("the worst hand was in the player's very last game: no next game, skipped", () => {
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [{ hand: 4, score: 51 }],
      }),
    ];
    expect(comebackNobodyAskedFor(games)).toBeNull();
  });

  it("only the single worst hand ever is considered, not every bad hand", () => {
    // Two bad hands: 51 (not followed by a win) and 30 (followed by a win).
    // Since 51 is the single worst, and its own next game is a loss, this
    // player contributes nothing — the 30-then-win pair is never considered.
    const games: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [{ hand: 4, score: 51 }],
      }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: false }),
      summary({
        gameId: "g3",
        playerId: PLAYER_A,
        playedOn: "2026-01-15",
        won: false,
        hands: [{ hand: 6, score: 30 }],
      }),
      summary({ gameId: "g4", playerId: PLAYER_A, playedOn: "2026-01-22", won: true }),
    ];
    expect(comebackNobodyAskedFor(games)).toBeNull();
  });

  it("among several qualifying players, the most dramatic (highest-scoring) disaster is reported", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "a1", playerId: PLAYER_A, playedOn: "2026-01-01", won: false, hands: [{ hand: 4, score: 30 }] }),
      summary({ gameId: "a2", playerId: PLAYER_A, playedOn: "2026-01-08", won: true }),
      summary({ gameId: "b1", playerId: PLAYER_B, playedOn: "2026-01-01", won: false, hands: [{ hand: 4, score: 64 }] }),
      summary({ gameId: "b2", playerId: PLAYER_B, playedOn: "2026-01-08", won: true }),
    ];
    const fact = comebackNobodyAskedFor(games)!;
    expect(fact.playerId).toBe(PLAYER_B);
    expect(fact.score).toBe(64);
  });

  it("an empty archive has no comeback", () => {
    expect(comebackNobodyAskedFor([])).toBeNull();
  });

  it("⚠️ regression: two hands tied for worst within the SAME game deterministically report the lowest hand number, regardless of row order", () => {
    // Hands 4 and 9 both score 51 in the same game — a real tie
    // `compareOldestFirst` alone can't break, since both hands share the same
    // `playedOn`/`createdAt` (they're the same game row). Hand 4 must win,
    // every time, no matter which order the two hands appear in `hands`.
    const gamesHand4First: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [
          { hand: 4, score: 51 },
          { hand: 9, score: 51 },
        ],
      }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: true }),
    ];
    const gamesHand9First: PlayerGameSummary[] = [
      summary({
        gameId: "g1",
        playerId: PLAYER_A,
        playedOn: "2026-01-01",
        won: false,
        hands: [
          { hand: 9, score: 51 },
          { hand: 4, score: 51 },
        ],
      }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", won: true }),
    ];

    for (let i = 0; i < 5; i++) {
      expect(comebackNobodyAskedFor(gamesHand4First)?.hand).toBe(4);
      expect(comebackNobodyAskedFor(gamesHand9First)?.hand).toBe(4);
    }
  });
});

describe("slump — criterion 285", () => {
  it("⚠️ documents and enforces the exact threshold: exactly 20% worse does NOT qualify", () => {
    // Oldest → newest: 40, 120, 120, 120. All-time average = 400/4 = 100.
    // Last-3 average = 360/3 = 120 = exactly 100 * (1 + 0.2). The boundary
    // itself is not "worse than" the threshold, only "worse than or equal to" —
    // so this must not fire.
    expect(SLUMP_THRESHOLD_RATIO).toBe(0.2);
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 40 }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 120 }),
      summary({ gameId: "g3", playerId: PLAYER_A, playedOn: "2026-01-15", finalScore: 120 }),
      summary({ gameId: "g4", playerId: PLAYER_A, playedOn: "2026-01-22", finalScore: 120 }),
    ];
    expect(slump(games)).toBeNull();
  });

  it("clearly over the threshold: qualifies, naming both averages", () => {
    // Oldest → newest: 20, 130, 130, 130. All-time average = 410/4 = 102.5.
    // Last-3 average = 390/3 = 130 — (130-102.5)/102.5 ≈ 26.8%, comfortably over 20%.
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 20 }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 130 }),
      summary({ gameId: "g3", playerId: PLAYER_A, playedOn: "2026-01-15", finalScore: 130 }),
      summary({ gameId: "g4", playerId: PLAYER_A, playedOn: "2026-01-22", finalScore: 130 }),
    ];
    const fact = slump(games);
    expect(fact).toEqual({
      key: "slump",
      playerId: PLAYER_A,
      displayName: PLAYER_A,
      allTimeAverage: 102.5,
      recentAverage: 130,
      gamesPlayed: 4,
    });
  });

  it("a player with exactly 3 games can never qualify — their 'last 3' is their whole history", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 40 }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 200 }),
      summary({ gameId: "g3", playerId: PLAYER_A, playedOn: "2026-01-15", finalScore: 200 }),
    ];
    expect(slump(games)).toBeNull();
  });

  it("fewer than 3 games: skipped outright", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 40 }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 300 }),
    ];
    expect(slump(games)).toBeNull();
  });

  it("among several qualifying players, the deepest slump (proportionally) is reported", () => {
    const games: PlayerGameSummary[] = [
      // Player A: 26.8% worse (from the case above).
      summary({ gameId: "a1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 20 }),
      summary({ gameId: "a2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 130 }),
      summary({ gameId: "a3", playerId: PLAYER_A, playedOn: "2026-01-15", finalScore: 130 }),
      summary({ gameId: "a4", playerId: PLAYER_A, playedOn: "2026-01-22", finalScore: 130 }),
      // Player B: all-time average 100, last-3 average 200 — 100% worse.
      summary({ gameId: "b1", playerId: PLAYER_B, playedOn: "2026-01-01", finalScore: 0 }),
      summary({ gameId: "b2", playerId: PLAYER_B, playedOn: "2026-01-08", finalScore: 200 }),
      summary({ gameId: "b3", playerId: PLAYER_B, playedOn: "2026-01-15", finalScore: 200 }),
      summary({ gameId: "b4", playerId: PLAYER_B, playedOn: "2026-01-22", finalScore: 200 }),
    ];
    expect(slump(games)!.playerId).toBe(PLAYER_B);
  });

  it("nobody currently qualifies: null", () => {
    const games: PlayerGameSummary[] = [
      summary({ gameId: "g1", playerId: PLAYER_A, playedOn: "2026-01-01", finalScore: 100 }),
      summary({ gameId: "g2", playerId: PLAYER_A, playedOn: "2026-01-08", finalScore: 100 }),
      summary({ gameId: "g3", playerId: PLAYER_A, playedOn: "2026-01-15", finalScore: 100 }),
      summary({ gameId: "g4", playerId: PLAYER_A, playedOn: "2026-01-22", finalScore: 100 }),
    ];
    expect(slump(games)).toBeNull();
  });

  it("an empty archive has no slump", () => {
    expect(slump([])).toBeNull();
  });
});

describe("rivalryNeedle — criterion 286 (reuses headToHead, never a second implementation)", () => {
  it("matches headToHead's own output exactly for a qualifying pair", () => {
    const games = [
      { gameId: "g1", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g2", aWon: true, bWon: false, aScore: 40, bScore: 95 },
      { gameId: "g3", aWon: true, bWon: false, aScore: 45, bScore: 100 },
    ];
    const pair: PairGames = { aId: PLAYER_A, aDisplayName: PLAYER_A, bId: PLAYER_B, bDisplayName: PLAYER_B, games };
    const expected = headToHead(games);

    const fact = rivalryNeedle([pair])!;
    expect(fact.dominantPlayerId).toBe(PLAYER_A);
    expect(fact.aboveRate).toBe(expected.a.aboveRate);
    expect(fact.gamesTogether).toBe(expected.gamesTogether);
  });

  it("a pair below the 3-games floor is excluded", () => {
    expect(RIVALRY_MIN_GAMES_TOGETHER).toBe(3);
    const games = [
      { gameId: "g1", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g2", aWon: true, bWon: false, aScore: 40, bScore: 95 },
    ];
    const pair: PairGames = { aId: PLAYER_A, aDisplayName: PLAYER_A, bId: PLAYER_B, bDisplayName: PLAYER_B, games };
    expect(rivalryNeedle([pair])).toBeNull();
  });

  it("⚠️ a pair who have only ever tied has no needle to point at, even with enough games together", () => {
    const games = [
      { gameId: "g1", aWon: true, bWon: true, aScore: 50, bScore: 50 },
      { gameId: "g2", aWon: true, bWon: true, aScore: 60, bScore: 60 },
      { gameId: "g3", aWon: true, bWon: true, aScore: 70, bScore: 70 },
    ];
    const pair: PairGames = { aId: PLAYER_A, aDisplayName: PLAYER_A, bId: PLAYER_B, bDisplayName: PLAYER_B, games };
    expect(rivalryNeedle([pair])).toBeNull();
  });

  it("among several qualifying pairs, the most lopsided (highest above-rate) is reported", () => {
    // A/B: A above 2 of 3 (66.7%). A/C: A above 3 of 3 (100%) — more lopsided.
    const abGames = [
      { gameId: "g1", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g2", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g3", aWon: false, bWon: true, aScore: 90, bScore: 50 },
    ];
    const acGames = [
      { gameId: "g4", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g5", aWon: true, bWon: false, aScore: 50, bScore: 90 },
      { gameId: "g6", aWon: true, bWon: false, aScore: 50, bScore: 90 },
    ];
    const pairs: PairGames[] = [
      { aId: PLAYER_A, aDisplayName: PLAYER_A, bId: PLAYER_B, bDisplayName: PLAYER_B, games: abGames },
      { aId: PLAYER_A, aDisplayName: PLAYER_A, bId: PLAYER_C, bDisplayName: PLAYER_C, games: acGames },
    ];
    const fact = rivalryNeedle(pairs)!;
    expect(fact.dominantPlayerId).toBe(PLAYER_A);
    expect(fact.opponentPlayerId).toBe(PLAYER_C);
    expect(fact.aboveRate).toBe(1);
  });

  it("an empty archive has no rivalry needle", () => {
    expect(rivalryNeedle([])).toBeNull();
  });
});

describe("overdue — criterion 287", () => {
  it("⚠️ the chosen threshold, exact boundary: 4 games since is not overdue, 5 is", () => {
    expect(OVERDUE_MIN_GAMES).toBe(5);

    function gamesWithTrailingLosses(trailingCount: number): ArchiveGame[] {
      const games: ArchiveGame[] = [
        { gameId: "shared", playedOn: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z", isSharedWin: true },
      ];
      for (let i = 0; i < trailingCount; i++) {
        games.push({
          gameId: `solo-${i}`,
          playedOn: `2026-02-${String(i + 1).padStart(2, "0")}`,
          createdAt: `2026-02-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
          isSharedWin: false,
        });
      }
      return games;
    }

    expect(overdue(gamesWithTrailingLosses(4))).toBeNull();
    expect(overdue(gamesWithTrailingLosses(5))).toEqual({ key: "overdue", gamesSinceSharedWin: 5 });
  });

  it("no shared win has ever happened: null, regardless of archive size", () => {
    const games: ArchiveGame[] = Array.from({ length: 10 }, (_, i) => ({
      gameId: `g${i}`,
      playedOn: `2026-01-${String(i + 1).padStart(2, "0")}`,
      createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      isSharedWin: false,
    }));
    expect(overdue(games)).toBeNull();
  });

  it("an empty archive has no 'overdue' — nothing to be overdue about", () => {
    expect(overdue([])).toBeNull();
  });
});

describe("randomOldNight — criterion 288", () => {
  const story: NightStory = {
    gameId: "g1",
    playedOn: "2026-01-01",
    locationName: "The Local",
    rosterName: "Amy & Bo",
    players: [
      { displayName: "Amy", finalScore: 50 },
      { displayName: "Bo", finalScore: 90 },
    ],
    winners: ["Amy"],
    winningScore: 50,
  };

  it("restates the game's full story, unconditionally", () => {
    const fact = randomOldNight([story], () => 0);
    expect(fact).toEqual({ key: "randomOldNight", ...story });
  });

  it("the random function picks the index — 0 picks the first, near-1 picks the last", () => {
    const stories: NightStory[] = [
      { ...story, gameId: "g1" },
      { ...story, gameId: "g2" },
      { ...story, gameId: "g3" },
    ];
    expect(randomOldNight(stories, () => 0)!.gameId).toBe("g1");
    expect(randomOldNight(stories, () => 0.999999)!.gameId).toBe("g3");
    expect(randomOldNight(stories, () => 0.5)!.gameId).toBe("g2");
  });

  it("is available the moment a single game exists — no condition beyond non-empty", () => {
    expect(randomOldNight([story])).not.toBeNull();
  });

  it("an empty archive has no random old night", () => {
    expect(randomOldNight([])).toBeNull();
  });
});

describe("collectiveTrivia — criterion 289", () => {
  it("hands = games × 11, always", () => {
    expect(collectiveTrivia(1)).toEqual({ key: "collectiveTrivia", totalGames: 1, totalHands: 11 });
    expect(collectiveTrivia(7)).toEqual({ key: "collectiveTrivia", totalGames: 7, totalHands: 77 });
  });

  it("available from the first saved game", () => {
    expect(collectiveTrivia(1)).not.toBeNull();
  });

  it("an empty archive has no collective trivia", () => {
    expect(collectiveTrivia(0)).toBeNull();
  });
});
