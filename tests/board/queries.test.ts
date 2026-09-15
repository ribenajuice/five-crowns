/**
 * `getBoard()` — PRD criteria 179–191, 196.
 *
 * Covers: every one of the five Stage 1 records over ordinary archives, joint
 * holders (alphabetical, every record type including the stalwart tie),
 * drought-adjacent players (played, never won), an all-shared-wins archive,
 * a streak spanning a roster change, the early-days boundary at 9/10 games,
 * nothing-cached against a delete and a merge (M2 features), and a bounded
 * query-count proof at 10 games vs. 60 (criterion 190).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";
import { createGameSeeder } from "../helpers/board";

// ---------------------------------------------------------------------------
// Query-count instrumentation (criterion 190). Wraps the real `getDb()` in a
// proxy that counts every `.select(...)` call — the one entry point every
// drizzle read query starts with — so `getBoard()`'s own claim ("three
// queries, full stop") is checked, not just asserted in a comment. `vi.mock`
// is hoisted above these `let`s by vitest but the factory only runs when
// something first imports "@/lib/db", which happens after this module's own
// top-level code has already run — the same pattern `tests/games/save.test.ts`
// uses for its `randomUUID` queue.
// ---------------------------------------------------------------------------
let selectCallCount = 0;

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getDb: () => {
      const real = actual.getDb();
      return new Proxy(real, {
        get(target, prop, _receiver) {
          if (prop === "select") selectCallCount++;
          const value = Reflect.get(target as object, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
});

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "board-queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

describe("getBoard — empty archive (criterion 191)", () => {
  it("renders the empty state, not a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    expect(board.empty).toBe(true);
  });
});

describe("getBoard — a single-game archive", () => {
  it("every record has exactly one candidate and nothing crashes", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    expect(board.empty).toBe(false);
    if (board.empty) throw new Error("unreachable");

    expect(board.archiveGameCount).toBe(1);
    expect(board.earlyDays).toBe(true);

    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.holders.map((h) => h.displayName)).toEqual(["Amy"]);
    expect(mostWins.value).toBe(1);
    expect(mostWins.games).toHaveLength(1);

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.holders.map((h) => h.displayName)).toEqual(["Amy"]);
    expect(streak.value).toBe(1);

    const stalwart = board.records.find((r) => r.key === "stalwart")!;
    // Every player has played exactly one game — everyone ties the stalwart.
    expect(stalwart.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Bo", "Cy"]);
    expect(stalwart.value).toBe(1);

    const average = board.records.find((r) => r.key === "lowestAverageScore")!;
    expect(average.holders.map((h) => h.displayName)).toEqual(["Amy"]);
    expect(average.value).toBe(50);
  });
});

describe("getBoard — most wins, an ordinary multi-game archive", () => {
  it("crowns the player with the most solo wins", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 70 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.holders).toHaveLength(1);
    expect(mostWins.holders[0]!.displayName).toBe("Amy");
    expect(mostWins.value).toBe(2);
    // Amy's own game count, not the archive's.
    expect(mostWins.holders[0]!.gamesPlayed).toBe(3);
    // Newest-first (criterion 186), and only the two games Amy actually won.
    expect(mostWins.games.map((g) => g.playedOn)).toEqual(["2026-01-08", "2026-01-01"]);
  });
});

describe("getBoard — joint holders, alphabetical, every record type (criteria 181, 196)", () => {
  it("lists both holders alphabetically for most wins, the streak, the average and the stalwart", async () => {
    // "Zoe" is seeded before "Abby" on purpose: insertion order must not leak
    // into holder order anywhere.
    const players = await createPlayers(["Zoe", "Abby"]);
    const seedGame = createGameSeeder();
    // Two games, tied every time: identical win counts, identical streaks,
    // identical averages, identical games-played counts.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Zoe"]!, finalScore: 50 },
        { playerId: players["Abby"]!, finalScore: 50 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Zoe"]!, finalScore: 60 },
        { playerId: players["Abby"]!, finalScore: 60 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    for (const key of ["mostWins", "mostWinsInARow", "lowestAverageScore", "stalwart"] as const) {
      const record = board.records.find((r) => r.key === key)!;
      expect(record.holders.map((h) => h.displayName)).toEqual(["Abby", "Zoe"]);
    }
  });

  it("⚠️ the stalwart tie case: two players on the same max games-played, one of them on fewer wins", async () => {
    const players = await createPlayers(["Zoe", "Abby", "Cy"]);
    const seedGame = createGameSeeder();
    // Zoe and Abby each play 3 games; Cy plays only 1 — Cy cannot be the stalwart.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Zoe"]!, finalScore: 50 },
        { playerId: players["Abby"]!, finalScore: 80 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Zoe"]!, finalScore: 50 },
        { playerId: players["Abby"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Zoe"]!, finalScore: 90 },
        { playerId: players["Abby"]!, finalScore: 40 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const stalwart = board.records.find((r) => r.key === "stalwart")!;
    expect(stalwart.value).toBe(3);
    expect(stalwart.holders.map((h) => h.displayName)).toEqual(["Abby", "Zoe"]);
  });

  it("most rounds won: joint holders each get their own per-game annotation", async () => {
    const players = await createPlayers(["Zoe", "Abby"]);
    const seedGame = createGameSeeder();
    // One hand each, tied at zero every time — a shared hand every game.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Zoe"]!, finalScore: 0, handScores: [0] },
        { playerId: players["Abby"]!, finalScore: 0, handScores: [0] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const mostRoundsWon = board.records.find((r) => r.key === "mostRoundsWon")!;
    expect(mostRoundsWon.value).toBe(1);
    expect(mostRoundsWon.holders.map((h) => h.displayName)).toEqual(["Abby", "Zoe"]);
    expect(mostRoundsWon.games).toHaveLength(1);
    const annotations = mostRoundsWon.games[0]!.roundsWonByHolder!;
    expect(annotations.map((a) => a.displayName).sort()).toEqual(["Abby", "Zoe"]);
    for (const a of annotations) expect(a.rounds).toBe(1);
  });
});

describe("getBoard — a drought-adjacent player: played, never won", () => {
  it("is never a mostWins/streak holder but doesn't break anyone else's numbers", async () => {
    const players = await createPlayers(["Winner", "Never Wins"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08", "2026-01-15"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Winner"]!, finalScore: 50 },
          { playerId: players["Never Wins"]!, finalScore: 80 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.holders.map((h) => h.displayName)).toEqual(["Winner"]);

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.holders.map((h) => h.displayName)).toEqual(["Winner"]);

    // Lowest average and most rounds won still compute for "Never Wins" without crashing —
    // they just don't happen to hold either (Winner is lower on both here).
    const average = board.records.find((r) => r.key === "lowestAverageScore")!;
    expect(average.holders.map((h) => h.displayName)).toEqual(["Winner"]);
    expect(average.value).toBe(50);

    const stalwart = board.records.find((r) => r.key === "stalwart")!;
    expect(stalwart.holders.map((h) => h.displayName).sort()).toEqual(["Never Wins", "Winner"]);
  });
});

describe("getBoard — every game a shared win", () => {
  it("most wins can plausibly return everyone", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: 50 },
          { playerId: players["Bo"]!, finalScore: 50 },
          { playerId: players["Cy"]!, finalScore: 50 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Bo", "Cy"]);
    expect(mostWins.value).toBe(2);

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Bo", "Cy"]);
    expect(streak.value).toBe(2);
  });
});

describe("getBoard — a streak spans a roster change", () => {
  it("is about the individual player's own games; who else was there is irrelevant", async () => {
    const players = await createPlayers(["Amy", "Guest One", "Guest Two"]);
    const seedGame = createGameSeeder();
    // Amy wins against Guest One, then wins again in a completely different
    // roster against Guest Two — still two different games, still her own
    // consecutive run.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Guest One"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 30 },
        { playerId: players["Guest Two"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.holders.map((h) => h.displayName)).toEqual(["Amy"]);
    expect(streak.value).toBe(2);
    expect(streak.games.map((g) => g.playedOn)).toEqual(["2026-01-01", "2026-01-08"]);
  });
});

describe("getBoard — streak drill-through ordering and joint-streak annotation", () => {
  it("is ordered oldest → newest, the one exception to newest-first", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 30 },
        { playerId: players["Bo"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.games.map((g) => g.playedOn)).toEqual(["2026-01-01", "2026-01-08"]);
  });

  it("annotates a row with whose streak it is when joint holders' qualifying games differ", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    // Amy's 2-game streak: games 1–2. Bo's separate 2-game streak: games 3–4.
    // Both length 2, no games in common — every row needs its owner named.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 10 },
        { playerId: players["Bo"]!, finalScore: 90 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-02",
      players: [
        { playerId: players["Amy"]!, finalScore: 10 },
        { playerId: players["Bo"]!, finalScore: 90 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-03",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 10 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-04",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 10 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const streak = board.records.find((r) => r.key === "mostWinsInARow")!;
    expect(streak.holders.map((h) => h.displayName)).toEqual(["Amy", "Bo"]);
    expect(streak.value).toBe(2);
    expect(streak.games.map((g) => g.playedOn)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(streak.games.map((g) => g.streakOwner)).toEqual(["Amy", "Amy", "Bo", "Bo"]);
  });
});

describe("getBoard — the early-days line boundary (criterion 183)", () => {
  it("is present at 9 games and absent at 10", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();

    for (let i = 0; i < 9; i++) {
      await seedGame({
        playedOn: `2026-01-${String(i + 1).padStart(2, "0")}`,
        players: [
          { playerId: players["Amy"]!, finalScore: 50 },
          { playerId: players["Bo"]!, finalScore: 80 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    let board = await getBoard();
    if (board.empty) throw new Error("unreachable");
    expect(board.archiveGameCount).toBe(9);
    expect(board.earlyDays).toBe(true);

    await seedGame({
      playedOn: "2026-01-10",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    board = await getBoard();
    if (board.empty) throw new Error("unreachable");
    expect(board.archiveGameCount).toBe(10);
    expect(board.earlyDays).toBe(false);
  });
});

describe("getBoard — nothing is cached (criterion 189)", () => {
  it("reflects a deleted game on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    expect(before.archiveGameCount).toBe(1);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getBoard();
    expect(after.empty).toBe(true);
  });

  it("reflects a player merge on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo", "Amy Alt"]);
    const seedGame = createGameSeeder();
    // Amy wins once; her "Amy Alt" duplicate wins once — pre-merge, no single player has 2 wins.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy Alt"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    const beforeMostWins = before.records.find((r) => r.key === "mostWins")!;
    expect(beforeMostWins.value).toBe(1);

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    const afterMostWins = after.records.find((r) => r.key === "mostWins")!;
    expect(afterMostWins.holders.map((h) => h.displayName)).toEqual(["Amy"]);
    expect(afterMostWins.value).toBe(2);
  });
});

describe("getBoard — the query count does not grow with the archive (criterion 190)", () => {
  async function countQueriesAt(gameCount: number): Promise<number> {
    const players = await createPlayers(["Amy", "Bo", "Cy", "Dee"]);
    const seedGame = createGameSeeder();
    for (let i = 0; i < gameCount; i++) {
      const day = String((i % 27) + 1).padStart(2, "0");
      const month = String(Math.floor(i / 27) + 1).padStart(2, "0");
      await seedGame({
        playedOn: `2026-${month}-${day}`,
        players: [
          { playerId: players["Amy"]!, finalScore: 40 + i, handScores: [4 + i, 6, 5, 3, 4, 3, 2, 3, 4, 3, (40 + i) - (4 + i + 6 + 5 + 3 + 4 + 3 + 2 + 3 + 4 + 3)] },
          { playerId: players["Bo"]!, finalScore: 80 + i },
          { playerId: players["Cy"]!, finalScore: 90 + i },
          { playerId: players["Dee"]!, finalScore: 100 + i },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    selectCallCount = 0;
    const board = await getBoard();
    expect(board.empty).toBe(false);
    return selectCallCount;
  }

  it("issues the same number of queries at 10 games and at 60", async () => {
    const queriesAt10 = await countQueriesAt(10);

    await teardownTestDb();
    await setupTestDb();
    const queriesAt60 = await countQueriesAt(60);

    expect(queriesAt10).toBeGreaterThan(0);
    expect(queriesAt60).toBe(queriesAt10);
  });

  /**
   * QA gap fix (criterion 315): criterion 315 asks for the query count to be
   * compared "at 10 games and at 60 **and at 4 players and at 8**" — the test
   * above only ever varies the game count at a fixed 4 players.  M4 second
   * slice's four stats are the first records that fan out *per other seat in
   * a game* ("looks like cheating"'s `otherWins`/`otherGames`, "the
   * metronome"'s per-player final-score arrays), which is exactly the shape a
   * per-player loop query could hide in without this ever catching it.
   */
  async function countQueriesAtPlayerCount(playerCount: number): Promise<number> {
    const names = Array.from({ length: playerCount }, (_, i) => `Player${i}`);
    const players = await createPlayers(names);
    const seedGame = createGameSeeder();
    for (let i = 0; i < 10; i++) {
      const day = String((i % 27) + 1).padStart(2, "0");
      await seedGame({
        playedOn: `2026-01-${day}`,
        players: names.map((name, seat) => ({
          playerId: players[name]!,
          finalScore: 40 + i + seat * 5,
        })),
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    selectCallCount = 0;
    const board = await getBoard();
    expect(board.empty).toBe(false);
    return selectCallCount;
  }

  it("issues the same number of queries at 4 players and at 8", async () => {
    const queriesAt4 = await countQueriesAtPlayerCount(4);

    await teardownTestDb();
    await setupTestDb();
    const queriesAt8 = await countQueriesAtPlayerCount(8);

    expect(queriesAt4).toBeGreaterThan(0);
    expect(queriesAt8).toBe(queriesAt4);
  });
});

describe("getBoard — every game counts towards every number (criterion 188)", () => {
  it("a game with no location counts the same as one with a location", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
      // No locationName — the game has no location, deliberately.
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.archiveGameCount).toBe(1);
    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.games[0]!.locationName).toBeNull();
  });
});

describe("getBoard — the drought (criterion 213)", () => {
  it("crowns the player with the longest run of games played without a win", async () => {
    const players = await createPlayers(["Winner", "Loser"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08", "2026-01-15"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Winner"]!, finalScore: 50 },
          { playerId: players["Loser"]!, finalScore: 80 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const drought = board.records.find((r) => r.key === "drought")!;
    expect(drought.holders.map((h) => h.displayName)).toEqual(["Loser"]);
    expect(drought.value).toBe(3);
    expect(drought.games).toHaveLength(3);
    // Oldest → newest, the same exception to newest-first the streak uses.
    expect(drought.games.map((g) => g.playedOn)).toEqual(["2026-01-01", "2026-01-08", "2026-01-15"]);
  });

  it("a winner never appears in the drought, even at length zero", async () => {
    const players = await createPlayers(["Winner", "Loser"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Winner"]!, finalScore: 50 },
        { playerId: players["Loser"]!, finalScore: 80 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const drought = board.records.find((r) => r.key === "drought")!;
    expect(drought.holders.map((h) => h.displayName)).toEqual(["Loser"]);
    expect(drought.value).toBe(1);
  });

  it("joint holders, alphabetical", async () => {
    const players = await createPlayers(["Zoe", "Abby", "Winner"]);
    const seedGame = createGameSeeder();
    // Zoe and Abby each lose two games in a row; Winner takes both.
    for (const playedOn of ["2026-01-01", "2026-01-08"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Zoe"]!, finalScore: 80 },
          { playerId: players["Abby"]!, finalScore: 90 },
          { playerId: players["Winner"]!, finalScore: 50 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const drought = board.records.find((r) => r.key === "drought")!;
    expect(drought.value).toBe(2);
    expect(drought.holders.map((h) => h.displayName)).toEqual(["Abby", "Zoe"]);
  });
});

describe("getBoard — the nearly man (criterion 216)", () => {
  it("crowns the player with the most second places", async () => {
    const players = await createPlayers(["Winner", "Runner Up", "Last"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Winner"]!, finalScore: 50 },
          { playerId: players["Runner Up"]!, finalScore: 80 },
          { playerId: players["Last"]!, finalScore: 120 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const nearlyMan = board.records.find((r) => r.key === "nearlyMan")!;
    expect(nearlyMan.holders.map((h) => h.displayName)).toEqual(["Runner Up"]);
    expect(nearlyMan.value).toBe(2);
    expect(nearlyMan.games).toHaveLength(2);
  });

  it("⚠️ second place is not skipped because the win was shared", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 100 },
        { playerId: players["Bo"]!, finalScore: 100 },
        { playerId: players["Cy"]!, finalScore: 110 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const nearlyMan = board.records.find((r) => r.key === "nearlyMan")!;
    expect(nearlyMan.holders.map((h) => h.displayName)).toEqual(["Cy"]);
    expect(nearlyMan.value).toBe(1);
  });

  it("a shared second place counts in full for each holder", async () => {
    const players = await createPlayers(["Zoe", "Abby", "Winner"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Winner"]!, finalScore: 50 },
        { playerId: players["Zoe"]!, finalScore: 90 },
        { playerId: players["Abby"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const nearlyMan = board.records.find((r) => r.key === "nearlyMan")!;
    expect(nearlyMan.value).toBe(1);
    expect(nearlyMan.holders.map((h) => h.displayName)).toEqual(["Abby", "Zoe"]);
  });
});

describe("getBoard — both new rows survive an archive where nobody holds them (criterion 217)", () => {
  it("the single degenerate game where everyone finished level: neither the drought nor the nearly man has a holder", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 75 },
        { playerId: players["Bo"]!, finalScore: 75 },
        { playerId: players["Cy"]!, finalScore: 75 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const drought = board.records.find((r) => r.key === "drought")!;
    expect(drought).toEqual({ key: "drought", value: null, holders: [], games: [] });

    const nearlyMan = board.records.find((r) => r.key === "nearlyMan")!;
    expect(nearlyMan).toEqual({ key: "nearlyMan", value: null, holders: [], games: [] });

    // Neither record ever shows 0 with a name beside it — both are absent instead.
    expect(drought.holders).toHaveLength(0);
    expect(nearlyMan.holders).toHaveLength(0);
  });
});

describe("getBoard — Stage 2 adds no query of its own (criterion 219)", () => {
  it("still issues the same bounded query count now the board carries seven records", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08", "2026-01-15"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: 50 },
          { playerId: players["Bo"]!, finalScore: 80 },
          { playerId: players["Cy"]!, finalScore: 110 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    selectCallCount = 0;
    const board = await getBoard();
    expect(board.empty).toBe(false);
    expect(selectCallCount).toBe(3);
    if (board.empty) throw new Error("unreachable");
    expect(board.records).toHaveLength(8);
    expect(board.records.map((r) => r.key)).toEqual([
      "mostWins",
      "mostWinsInARow",
      "lowestAverageScore",
      "mostRoundsWon",
      "stalwart",
      "drought",
      "nearlyMan",
      "gettingWrecked",
    ]);
  });
});

describe("getBoard — the no-holder branch (criterion 185)", () => {
  it("⚠️ is defensive code, not a reachable production state: a game with zero round_score rows " +
    "(never possible for a real saved game — the save handler always writes all 11 hands) still " +
    "renders most-rounds-won as a proper no-holder record instead of crashing", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
      // No `handScores` on either player — no round_score rows exist for this game at all.
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const mostRoundsWon = board.records.find((r) => r.key === "mostRoundsWon")!;
    expect(mostRoundsWon).toEqual({ key: "mostRoundsWon", value: null, holders: [], games: [] });

    // Every other record is unaffected — the no-holder state is per-record, not board-wide.
    const mostWins = board.records.find((r) => r.key === "mostWins")!;
    expect(mostWins.holders.map((h) => h.displayName)).toEqual(["Amy"]);
  });
});

/* ======================================================================
 * Stage 3 — the five single-event records (criteria 228–235).
 * ====================================================================== */

describe("getBoard — best/worst game ever (criteria 228–229, 233)", () => {
  it("crowns the archive's own lowest and highest final scores, each with a date, no game count", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 100 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const best = board.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    expect(best.value).toBe(40);
    expect(best.holders).toEqual([
      { playerId: players["Bo"], displayName: "Bo", gameId: expect.any(String), playedOn: "2026-01-08" },
    ]);
    expect(best.games).toHaveLength(1);
    expect(best.games[0]!.playedOn).toBe("2026-01-08");
    expect(best.games[0]!.singleEventValue).toBe(40);

    const worst = board.singleEventRecords.find((r) => r.key === "worstGameEver")!;
    expect(worst.value).toBe(100);
    expect(worst.holders.map((h) => h.displayName)).toEqual(["Cy"]);
    expect(worst.holders[0]!.playedOn).toBe("2026-01-08");
  });

  it("⚠️ criterion 228: the same player posting the record in two different games is listed as two instances, each with its own date", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const best = board.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    expect(best.value).toBe(40);
    expect(best.holders).toHaveLength(2);
    expect(best.holders.every((h) => h.displayName === "Amy")).toBe(true);
    expect(best.holders.map((h) => h.playedOn).sort()).toEqual(["2026-01-01", "2026-01-08"]);
    expect(best.games).toHaveLength(2);
  });

  it("two different players tied in the same game are both holders of that one game", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const best = board.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    expect(best.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Bo"]);
    // Alphabetical (criterion 228).
    expect(best.holders.map((h) => h.displayName)).toEqual(["Amy", "Bo"]);
    expect(best.games).toHaveLength(1);
  });
});

describe("getBoard — the catastrophe (criterion 230)", () => {
  it("crowns the single biggest round_score, naming the player, the hand and the date", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        // Hand 6 (8s) is a 120-point disaster.
        { playerId: players["Amy"]!, finalScore: 120, handScores: [0, 0, 0, 0, 0, 120, 0, 0, 0, 0, 0] },
        { playerId: players["Bo"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const catastrophe = board.singleEventRecords.find((r) => r.key === "catastrophe")!;
    expect(catastrophe.value).toBe(120);
    expect(catastrophe.holders).toEqual([
      { playerId: players["Amy"], displayName: "Amy", gameId: expect.any(String), playedOn: "2026-02-01", hand: "8s" },
    ]);
    expect(catastrophe.games[0]!.singleEventValue).toBe(120);
    expect(catastrophe.games[0]!.singleEventHand).toBe("8s");
  });

  it("⚠️ the same player twice, once per hand, is two instances", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 120, handScores: [60, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0] },
        { playerId: players["Bo"]!, finalScore: 30, handScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const catastrophe = board.singleEventRecords.find((r) => r.key === "catastrophe")!;
    expect(catastrophe.value).toBe(60);
    expect(catastrophe.holders).toHaveLength(2);
    expect(catastrophe.holders.map((h) => h.hand).sort()).toEqual(["3s", "Jacks"]);
    // ⚠️ Bug fix: both instances are in the same one game, but they're two
    // genuinely different single-hand events — the drill-through's games
    // list keeps both rows, one per hand, rather than silently collapsing
    // them into one (the games list is still deduplicated by game *and*
    // hand together, so a game with no hand at all — every other
    // single-event record — still gets exactly one row, criterion 234).
    expect(catastrophe.games).toHaveLength(2);
    expect(catastrophe.games.map((g) => g.singleEventHand)).toEqual(["3s", "Jacks"]);
    expect(catastrophe.games.every((g) => g.singleEventValue === 60)).toBe(true);
  });

  it("⚠️ bug regression: two hands, same game, same tied top score — the games list keeps both, deterministically, across repeated calls", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Two different players each post the archive's own top single-hand
    // score in two different hands of the same game — a tie that used to
    // collapse to one row (or the other) depending on unordered `round_score`
    // rows, rather than showing both.
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 100, handScores: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { playerId: players["Bo"]!, finalScore: 100, handScores: [0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");

    for (let attempt = 0; attempt < 5; attempt++) {
      const board = await getBoard();
      if (board.empty) throw new Error("unreachable");
      const catastrophe = board.singleEventRecords.find((r) => r.key === "catastrophe")!;
      expect(catastrophe.value).toBe(100);
      expect(catastrophe.holders).toHaveLength(2);
      // Both games rows survive, deterministically ordered the same way
      // every time — never one dropped, never flip-flopping across calls.
      expect(catastrophe.games).toHaveLength(2);
      expect(catastrophe.games.map((g) => g.singleEventHand)).toEqual(["3s", "Jacks"]);
      expect(catastrophe.games.every((g) => g.id === catastrophe.games[0]!.id)).toBe(true);
    }
  });
});

describe("getBoard — cleanest sheet (criterion 231)", () => {
  it("⚠️ QA's own case: a player who scores nine zeros reads '9', not a career total", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-03-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 25, handScores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 15] },
        { playerId: players["Bo"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const cleanest = board.singleEventRecords.find((r) => r.key === "cleanestSheet")!;
    expect(cleanest.value).toBe(9);
    expect(cleanest.holders).toEqual([
      { playerId: players["Amy"], displayName: "Amy", gameId: expect.any(String), playedOn: "2026-03-01" },
    ]);
  });

  it("⚠️ not a career total (decision 18): the same player's zeros in two different games never sum", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Amy: 4 zeros in game 1, 4 zeros in game 2 — 8 combined across her whole
    // career, but neither single game reaches Bo's 5-zero game 1 on its own.
    await seedGame({
      playedOn: "2026-03-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 35, handScores: [0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5] },
        { playerId: players["Bo"]!, finalScore: 54, handScores: [0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9] },
      ],
    });
    await seedGame({
      playedOn: "2026-03-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 42, handScores: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 6] },
        { playerId: players["Bo"]!, finalScore: 11, handScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const cleanest = board.singleEventRecords.find((r) => r.key === "cleanestSheet")!;
    expect(cleanest.value).toBe(5);
    expect(cleanest.holders).toEqual([
      { playerId: players["Bo"], displayName: "Bo", gameId: expect.any(String), playedOn: "2026-03-01" },
    ]);
  });
});

describe("getBoard — biggest hammering (criterion 232, imports Stage 2's second place/margin verbatim)", () => {
  it("crowns the widest gap between the winner and second place", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 70 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-04-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 30 },
        { playerId: players["Bo"]!, finalScore: 120 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const hammering = board.singleEventRecords.find((r) => r.key === "biggestHammering")!;
    // Game 1's margin is 30 (70 − 40); game 2's is 90 (120 − 30).
    expect(hammering.value).toBe(90);
    expect(hammering.holders).toEqual([
      { playerId: players["Amy"], displayName: "Amy", gameId: expect.any(String), playedOn: "2026-04-08" },
    ]);
  });

  it("⚠️ a shared win's margin is measured to the next distinct score, not to the co-winner (never 0)", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 50 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const hammering = board.singleEventRecords.find((r) => r.key === "biggestHammering")!;
    expect(hammering.value).toBe(40);
    expect(hammering.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Bo"]);
  });

  it("⚠️ a game where every player finished level contributes nothing, not a margin of zero", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    // The only game in the archive is an all-level tie — no second place exists anywhere.
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 75 },
        { playerId: players["Bo"]!, finalScore: 75 },
        { playerId: players["Cy"]!, finalScore: 75 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const hammering = board.singleEventRecords.find((r) => r.key === "biggestHammering")!;
    expect(hammering).toEqual({ key: "biggestHammering", value: null, holders: [], games: [] });
  });

  it("an all-level game is simply excluded when other games do have a second place", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 75 },
        { playerId: players["Bo"]!, finalScore: 75 },
        { playerId: players["Cy"]!, finalScore: 75 },
      ],
    });
    await seedGame({
      playedOn: "2026-04-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 60 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const hammering = board.singleEventRecords.find((r) => r.key === "biggestHammering")!;
    expect(hammering.value).toBe(20);
    expect(hammering.games).toHaveLength(1);
  });

  it("two games tied on the margin are both instances, each with its own winner(s) and date", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 70 },
      ],
    });
    await seedGame({
      playedOn: "2026-04-08",
      players: [
        { playerId: players["Cy"]!, finalScore: 40 },
        { playerId: players["Amy"]!, finalScore: 70 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const hammering = board.singleEventRecords.find((r) => r.key === "biggestHammering")!;
    expect(hammering.value).toBe(30);
    expect(hammering.holders.map((h) => h.displayName).sort()).toEqual(["Amy", "Cy"]);
    expect(hammering.games).toHaveLength(2);
  });
});

describe("getBoard — Stage 3 adds no query of its own (criterion 248)", () => {
  it("still issues exactly three queries with all twelve records present", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-05-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0] },
        { playerId: players["Bo"]!, finalScore: 80 },
        { playerId: players["Cy"]!, finalScore: 110 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    selectCallCount = 0;
    const board = await getBoard();
    expect(selectCallCount).toBe(3);
    if (board.empty) throw new Error("unreachable");
    expect(board.records).toHaveLength(8);
    expect(board.singleEventRecords).toHaveLength(6);
    expect(board.singleEventRecords.map((r) => r.key)).toEqual([
      "bestGameEver",
      "worstGameEver",
      "catastrophe",
      "cleanestSheet",
      "biggestHammering",
      "clutchComeback",
    ]);
  });
});

/* ======================================================================
 * Stage 4 — home advantage, the board's thirteenth record (criteria 253–254).
 * ====================================================================== */

describe("getBoard — home advantage (criteria 253–254)", () => {
  it("crowns the (player, venue) pair with the largest gap, both sides sampled", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    // Sam: 3 of 4 at "Player E's", 1 of 8 spread across two other venues.
    for (const [i, playedOn] of ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"].entries()) {
      await seedGame({
        playedOn,
        locationName: "Player E's",
        players: [
          { playerId: players["Sam"]!, finalScore: i === 3 ? 90 : 10 },
          { playerId: players["Jo"]!, finalScore: i === 3 ? 10 : 90 },
        ],
      });
    }
    // One of these four is a Sam win (lowest score), the other three are
    // Jo's — Sam's "elsewhere" sample (below) needs exactly 1 win of 8.
    for (const [i, playedOn] of ["2026-02-01", "2026-02-08", "2026-02-15", "2026-02-22"].entries()) {
      await seedGame({
        playedOn,
        locationName: "Jo's",
        players: [
          { playerId: players["Sam"]!, finalScore: i === 0 ? 10 : 90 },
          { playerId: players["Jo"]!, finalScore: i === 0 ? 90 : 10 },
        ],
      });
    }
    for (const playedOn of ["2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22"]) {
      await seedGame({
        playedOn,
        locationName: "Neutral ground",
        players: [
          { playerId: players["Sam"]!, finalScore: 90 },
          { playerId: players["Jo"]!, finalScore: 10 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.homeAdvantage.gapPercentagePoints).toBeCloseTo(62.5, 1);
    // ⚠️ In a two-player universe every game's winner is the other player's
    // loss, so Jo's own numbers can mirror Sam's into an identical gap — a
    // real joint-holder case (pure-function coverage in
    // `tests/scoring/records.test.ts`), not a bug. This test only checks
    // Sam's own pair carries the right two-sided sample.
    const holder = board.homeAdvantage.holders.find(
      (h) => h.displayName === "Sam" && h.locationName === "Player E's",
    )!;
    expect(holder).toBeDefined();
    expect(holder.here).toEqual({ wins: 3, games: 4, ratePercent: 75 });
    expect(holder.elsewhere).toEqual({ wins: 1, games: 8, ratePercent: 12.5 });
    // Drill-through: exactly Sam's own games at "Player E's", newest first.
    expect(holder.games).toHaveLength(4);
    expect(holder.games.map((g) => g.playedOn)).toEqual([
      "2026-01-22",
      "2026-01-15",
      "2026-01-08",
      "2026-01-01",
    ]);
    expect(holder.games.every((g) => g.locationName === "Player E's")).toBe(true);
  });

  it("⚠️ a game with no location is in neither side of the comparison (criterion 251)", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "Player E's",
      players: [
        { playerId: players["Sam"]!, finalScore: 10 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });
    // No location — must count towards neither "here" nor "elsewhere".
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Sam"]!, finalScore: 90 },
        { playerId: players["Jo"]!, finalScore: 10 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      locationName: "Somewhere else",
      players: [
        { playerId: players["Sam"]!, finalScore: 90 },
        { playerId: players["Jo"]!, finalScore: 10 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const holder = board.homeAdvantage.holders.find((h) => h.displayName === "Sam")!;
    // Sam's "elsewhere" is exactly the one located game at "Somewhere else" —
    // the unlocated game contributes to neither side.
    expect(holder.elsewhere).toEqual({ wins: 0, games: 1, ratePercent: 0 });
  });

  it("⚠️ a player with only one known venue has no gap and contributes no pair", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08"]) {
      await seedGame({
        playedOn,
        locationName: "Player E's",
        players: [
          { playerId: players["Sam"]!, finalScore: 10 },
          { playerId: players["Jo"]!, finalScore: 90 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.homeAdvantage.holders.some((h) => h.displayName === "Sam")).toBe(false);
  });

  it("⚠️ nobody with a positive gap: the no-holder case, verbatim shape", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    // Every game has no location — no venue evidence exists at all.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Sam"]!, finalScore: 10 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.homeAdvantage).toEqual({ gapPercentagePoints: null, holders: [] });
  });

  it("⚠️ a one-game venue is shown holding the record in a small real archive, unhedged (criterion 254)", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    // Sam's only game at "New Place" is a win.
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "New Place",
      players: [
        { playerId: players["Sam"]!, finalScore: 10 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });
    // Sam's three games elsewhere are all losses — 0 of 3.
    for (const playedOn of ["2026-02-01", "2026-02-08", "2026-02-15"]) {
      await seedGame({
        playedOn,
        locationName: "Usual spot",
        players: [
          { playerId: players["Sam"]!, finalScore: 90 },
          { playerId: players["Jo"]!, finalScore: 10 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const holder = board.homeAdvantage.holders.find(
      (h) => h.displayName === "Sam" && h.locationName === "New Place",
    )!;
    expect(holder).toBeDefined();
    expect(holder.here).toEqual({ wins: 1, games: 1, ratePercent: 100 });
    expect(holder.elsewhere).toEqual({ wins: 0, games: 3, ratePercent: 0 });
    expect(holder.gapPercentagePoints).toBe(100);
    // ⚠️ Unhedged: this is the only holder, and the record's own gap is the
    // maximum possible (100 points) — a real one-game venue winning outright
    // in a tiny archive, exactly as decision 27 says it should.
    expect(board.homeAdvantage.gapPercentagePoints).toBe(100);
  });

  it("Stage 4 adds no query of its own (criteria 219, 248, 273)", async () => {
    const players = await createPlayers(["Sam", "Jo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "Player E's",
      players: [
        { playerId: players["Sam"]!, finalScore: 10 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      locationName: "Jo's",
      players: [
        { playerId: players["Sam"]!, finalScore: 90 },
        { playerId: players["Jo"]!, finalScore: 10 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    selectCallCount = 0;
    const board = await getBoard();
    expect(selectCallCount).toBe(3);
    if (board.empty) throw new Error("unreachable");
    expect(board.homeAdvantage.holders.length).toBeGreaterThan(0);
  });
});

describe("getBoard — Stage 3's records are nothing cached (criterion 246, restating 189)", () => {
  it("reflects a deleted game on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-06-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    expect(before.singleEventRecords.find((r) => r.key === "bestGameEver")!.value).toBe(40);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getBoard();
    expect(after.empty).toBe(true);
  });

  it("reflects a player merge on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo", "Amy Alt"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-06-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-06-08",
      players: [
        { playerId: players["Amy Alt"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    const beforeBest = before.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    expect(beforeBest.holders).toHaveLength(2);
    expect(new Set(beforeBest.holders.map((h) => h.displayName))).toEqual(new Set(["Amy", "Amy Alt"]));

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    const afterBest = after.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    // Same two games, but both instances now belong to the merged "Amy".
    expect(afterBest.holders).toHaveLength(2);
    expect(afterBest.holders.every((h) => h.displayName === "Amy")).toBe(true);
  });
});

/* ======================================================================
 * Milestone 4, second slice — the four personality stats (criteria 294–319).
 * ====================================================================== */

describe("getBoard — getting absolutely wrecked (criteria 300–303)", () => {
  it("crowns the longest CURRENT run of finishing last, states the run length and the games it's built from oldest first", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Bo finishes last three games running, most recent game included.
    for (const playedOn of ["2026-01-01", "2026-01-08", "2026-01-15"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: 40 },
          { playerId: players["Bo"]!, finalScore: 90 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const wrecked = board.records.find((r) => r.key === "gettingWrecked")!;
    expect(wrecked.value).toBe(3);
    expect(wrecked.holders.map((h) => h.displayName)).toEqual(["Bo"]);
    // Oldest → newest — a run reads as a run in the order it was played.
    expect(wrecked.games.map((g) => g.playedOn)).toEqual(["2026-01-01", "2026-01-08", "2026-01-15"]);
  });

  it("⚠️ is the CURRENT run, not the longest ever — an older, broken run doesn't win over a shorter trailing one", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Bo: last, last, last, WIN, last, last — a run of 3 broken, then a
    // trailing run of only 2, which is the one that's current.
    const games: [string, number, number][] = [
      ["2026-01-01", 40, 90],
      ["2026-01-08", 40, 90],
      ["2026-01-15", 40, 90],
      ["2026-01-22", 90, 40], // Bo wins this one — breaks the run
      ["2026-01-29", 40, 90],
      ["2026-02-05", 40, 90],
    ];
    for (const [playedOn, amyScore, boScore] of games) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: amyScore },
          { playerId: players["Bo"]!, finalScore: boScore },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const wrecked = board.records.find((r) => r.key === "gettingWrecked")!;
    expect(wrecked.value).toBe(2);
    expect(wrecked.games.map((g) => g.playedOn)).toEqual(["2026-01-29", "2026-02-05"]);
  });

  it("⚠️ a run of exactly one game does not qualify — an archive where every current run is length 1 has no holder", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 40 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const wrecked = board.records.find((r) => r.key === "gettingWrecked")!;
    expect(wrecked).toEqual({ key: "gettingWrecked", value: null, holders: [], games: [] });
  });

  it("a shared last counts as last, extending the run for both players sharing it", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: 30 },
          { playerId: players["Bo"]!, finalScore: 90 },
          { playerId: players["Cy"]!, finalScore: 90 }, // shared last with Bo
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const wrecked = board.records.find((r) => r.key === "gettingWrecked")!;
    expect(wrecked.value).toBe(2);
    expect(wrecked.holders.map((h) => h.displayName)).toEqual(["Bo", "Cy"]);
  });
});

describe("getBoard — most clutch comeback (criteria 304–306)", () => {
  it("crowns the largest deficit at hand 9 that was still overturned into an outright win", async () => {
    const players = await createPlayers(["Cy", "Dee"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        // Cy: 90 at hand 9 (30 behind Dee's 60), scores nothing more, wins outright at 90.
        { playerId: players["Cy"]!, finalScore: 90, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
        // Dee: the leader at hand 9 (60), then blows up in the closing hands.
        { playerId: players["Dee"]!, finalScore: 160, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0, 50, 50] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const comeback = board.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(comeback.value).toBe(30);
    expect(comeback.holders).toHaveLength(1);
    expect(comeback.holders[0]!.displayName).toBe("Cy");
    expect(comeback.games).toHaveLength(1);
    expect(comeback.games[0]!.winningScore).toBe(90);
  });

  it("⚠️ a shared win does NOT count — the named exception to kickoff decision 1", async () => {
    const players = await createPlayers(["Cy", "Dee"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        // Cy is 30 behind at hand 9 but only ties Dee's final score — a shared win.
        { playerId: players["Cy"]!, finalScore: 90, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
        { playerId: players["Dee"]!, finalScore: 90, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const comeback = board.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(comeback).toEqual({ key: "clutchComeback", value: null, holders: [], games: [] });
  });

  it("no comeback has ever happened: the no-holder case", async () => {
    const players = await createPlayers(["Cy", "Dee"]);
    const seedGame = createGameSeeder();
    // Cy is already the leader at hand 9 and wins outright — never behind.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Cy"]!, finalScore: 60, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0] },
        { playerId: players["Dee"]!, finalScore: 90, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const comeback = board.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(comeback).toEqual({ key: "clutchComeback", value: null, holders: [], games: [] });
  });

  it("joint holders: two different games, each won outright by a different player, on the same deficit", async () => {
    const players = await createPlayers(["Cy", "Dee", "Eli", "Fran"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Cy"]!, finalScore: 80, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 0] },
        { playerId: players["Dee"]!, finalScore: 160, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0, 50, 50] },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        // Same shape as game one (deficit 20 again), different game, different players.
        { playerId: players["Eli"]!, finalScore: 80, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 0] },
        { playerId: players["Fran"]!, finalScore: 170, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0, 55, 55] },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    const comeback = board.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(comeback.value).toBe(20);
    expect(comeback.holders.map((h) => h.displayName).sort()).toEqual(["Cy", "Eli"]);
    expect(comeback.games).toHaveLength(2);
  });
});

describe("getBoard — looks like cheating (criteria 297–299)", () => {
  it("QA's own construction: a heavy winner who plays rarely, in an archive where one of the same opponents wins constantly without them", async () => {
    const players = await createPlayers(["Sam", "Bo", "Cy", "Ivy"]);
    const seedGame = createGameSeeder();

    // Sam plays 5 games with Bo and Cy, winning 4 of the 5.
    for (const [i, playedOn] of ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-01-29"].entries()) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Sam"]!, finalScore: i === 4 ? 90 : 10 },
          { playerId: players["Bo"]!, finalScore: i === 4 ? 10 : 90 },
          { playerId: players["Cy"]!, finalScore: 90 },
        ],
      });
    }
    // Cy also plays a further 20 games with Ivy, without Sam or Bo, and wins
    // every one of them — this must never move Sam's own gap, since none of
    // these are one of Sam's own games (criterion 297's own qualifier).
    for (let i = 0; i < 20; i++) {
      await seedGame({
        playedOn: `2026-03-${String(i + 1).padStart(2, "0")}`,
        players: [
          { playerId: players["Cy"]!, finalScore: 10 },
          { playerId: players["Ivy"]!, finalScore: 90 },
        ],
      });
    }

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    // Sam holds the board's own record outright: Sam's 70-point gap beats
    // Cy's own combined 63.3 (80% across 25 games vs. 16.7% for their own
    // opponents across those same 25) and Bo's own -20 — proving the 20
    // games Cy dominates elsewhere raise Cy's *own* number, but never Sam's.
    expect(board.looksLikeCheating.holders.map((h) => h.displayName)).toEqual(["Sam"]);
    const holder = board.looksLikeCheating.holders[0]!;
    expect(holder.gamesPlayed).toBe(5);
    expect(holder.own).toEqual({ wins: 4, games: 5, ratePercent: 80 });
    // Other seats: 2 other players × 5 games = 10 other-seat-games, only 1 win
    // (the one game Bo took) — computed only from Sam's own 5 games, not the
    // 20 games Cy went on to dominate without Sam.
    expect(holder.others).toEqual({ wins: 1, games: 10, ratePercent: 10 });
    expect(holder.gapPercentagePoints).toBeCloseTo(70, 1);
    // Drill-through: exactly Sam's own 5 games, not the 20 Sam never played in.
    expect(holder.games).toHaveLength(5);
  });
});

describe("getBoard — the metronome (criteria 307–309)", () => {
  it("crowns the smallest range between a player's own highest and lowest final score, stating both ends and the game count", async () => {
    const players = await createPlayers(["Amy", "Bo", "Filler"]);
    const seedGame = createGameSeeder();
    // Amy: a wide-ranging career, three games far apart. "Filler" sits in on
    // every game with its own wildly varying score, so its own range is far
    // wider than either Amy's or Bo's and it never contends for the record.
    for (const [playedOn, score, fillerScore] of [
      ["2026-01-01", 40, 100],
      ["2026-01-08", 90, 300],
      ["2026-01-15", 70, 10],
    ] as const) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: score },
          { playerId: players["Filler"]!, finalScore: fillerScore },
        ],
      });
    }
    // Bo: only two games, close together.
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Bo"]!, finalScore: 55 },
        { playerId: players["Filler"]!, finalScore: 250 },
      ],
    });
    await seedGame({
      playedOn: "2026-02-08",
      players: [
        { playerId: players["Bo"]!, finalScore: 58 },
        { playerId: players["Filler"]!, finalScore: 5 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.metronome.range).toBe(3);
    expect(board.metronome.holders).toHaveLength(1);
    const holder = board.metronome.holders[0]!;
    expect(holder.displayName).toBe("Bo");
    expect(holder.gamesPlayed).toBe(2);
    expect(holder.highest).toBe(58);
    expect(holder.lowest).toBe(55);
    expect(holder.games).toHaveLength(2);
  });

  it("⚠️ no minimum-games floor — a two-game player holds the record over a many-game player, unhedged", async () => {
    const players = await createPlayers(["Veteran", "Newbie", "Filler"]);
    const seedGame = createGameSeeder();
    for (let i = 0; i < 10; i++) {
      await seedGame({
        playedOn: `2026-04-${String(i + 1).padStart(2, "0")}`,
        players: [
          { playerId: players["Veteran"]!, finalScore: 40 + i * 5 }, // range 45
          { playerId: players["Filler"]!, finalScore: i % 2 === 0 ? 5 : 300 }, // Filler's own range: 295
        ],
      });
    }
    await seedGame({
      playedOn: "2026-05-01",
      players: [
        { playerId: players["Newbie"]!, finalScore: 50 },
        { playerId: players["Filler"]!, finalScore: 5 },
      ],
    });
    await seedGame({
      playedOn: "2026-05-08",
      players: [
        { playerId: players["Newbie"]!, finalScore: 52 }, // range 2
        { playerId: players["Filler"]!, finalScore: 300 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.metronome.range).toBe(2);
    expect(board.metronome.holders[0]!.displayName).toBe("Newbie");
    expect(board.metronome.holders[0]!.gamesPlayed).toBe(2);
  });

  it("a single-game player never contributes a candidate at all — the record needs no floor to exclude them", async () => {
    const players = await createPlayers(["Amy", "Bo", "Once"]);
    const seedGame = createGameSeeder();
    // "Once" plays a single game and would trivially have a range of zero if
    // they were a candidate at all — they must simply never enter the pool.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 65 },
        { playerId: players["Once"]!, finalScore: 70 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Bo"]!, finalScore: 50 },
        { playerId: players["Amy"]!, finalScore: 55 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Bo"]!, finalScore: 90 },
        { playerId: players["Amy"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const board = await getBoard();
    if (board.empty) throw new Error("unreachable");

    expect(board.metronome.holders.some((h) => h.displayName === "Once")).toBe(false);
    // Amy: 60/55/95 → range 40. Bo: 65/50/90 → range 40. A genuine tie.
    expect(board.metronome.holders.map((h) => h.displayName)).toEqual(["Amy", "Bo"]);
  });
});

/**
 * QA gap fix (criterion 314): the "nothing is cached" sweep was written for
 * Stage 1's seven records (criterion 189, above) and restated for Stage 3's
 * five single-event records (criterion 246, above) but was never extended to
 * this slice's four — despite criterion 314 asking for exactly this: delete
 * a game, merge two players, and find all four numbers moved. Same pattern
 * as the two sweeps above, one case per stat.
 */
describe("getBoard — the four personality stats are nothing cached (criterion 314, restating 189/246)", () => {
  it("looks like cheating: a deleted game removes it from the holder's own count on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    // A second Amy-vs-Bo game so Amy still has a games list to be on after
    // the first is deleted — the sweep is about the *number* moving, not
    // about pushing her out of the archive altogether.
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 45 },
        { playerId: players["Bo"]!, finalScore: 85 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    const beforeCheating = before.looksLikeCheating.holders.find((h) => h.displayName === "Amy")!;
    expect(beforeCheating.own.games).toBe(2);
    expect(beforeCheating.own.wins).toBe(2);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    const afterCheating = after.looksLikeCheating.holders.find((h) => h.displayName === "Amy")!;
    expect(afterCheating.own.games).toBe(1);
    expect(afterCheating.own.wins).toBe(1);
  });

  it("getting absolutely wrecked: merging the current holder's identity away repoints the streak, live", async () => {
    const players = await createPlayers(["Amy", "Amy Alt", "Bo"]);
    const seedGame = createGameSeeder();
    // "Amy Alt" finishes last twice running — a genuine current streak.
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Bo"]!, finalScore: 40 },
        { playerId: players["Amy Alt"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-02-08",
      players: [
        { playerId: players["Bo"]!, finalScore: 45 },
        { playerId: players["Amy Alt"]!, finalScore: 95 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    const beforeWrecked = before.records.find((r) => r.key === "gettingWrecked")!;
    expect(beforeWrecked.value).toBe(2);
    expect(beforeWrecked.holders.map((h) => h.displayName)).toEqual(["Amy Alt"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    const afterWrecked = after.records.find((r) => r.key === "gettingWrecked")!;
    // Same run, same length — now under the survivor's own name.
    expect(afterWrecked.value).toBe(2);
    expect(afterWrecked.holders.map((h) => h.displayName)).toEqual(["Amy"]);
  });

  it("most clutch comeback: deleting the record-holding game clears the record to no-holder, live", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-03-01",
      players: [
        // Amy: 90 at hand 9 (30 behind Bo's 60), wins outright at 90.
        { playerId: players["Amy"]!, finalScore: 90, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 10] },
        { playerId: players["Bo"]!, finalScore: 160, handScores: [10, 10, 10, 10, 0, 0, 10, 10, 0, 50, 50] },
      ],
    });
    // A second, unrelated game — no comeback in it — so the archive isn't
    // *empty* after the first is deleted; the sweep is about the record
    // clearing to no-holder, not about the whole board vanishing.
    await seedGame({
      playedOn: "2026-03-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 41 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    const beforeComeback = before.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(beforeComeback.value).toBe(30);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    const afterComeback = after.singleEventRecords.find((r) => r.key === "clutchComeback")!;
    expect(afterComeback.value).toBeNull();
    expect(afterComeback.holders).toEqual([]);
  });

  it("the metronome: merging a two-game holder's identity into a player with no other games keeps the same range under the survivor's name", async () => {
    const players = await createPlayers(["Amy", "Amy Alt", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-04-01",
      players: [
        { playerId: players["Amy Alt"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 30 },
      ],
    });
    await seedGame({
      playedOn: "2026-04-08",
      players: [
        { playerId: players["Amy Alt"]!, finalScore: 62 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getBoard } = await import("@/lib/board/queries");
    const before = await getBoard();
    if (before.empty) throw new Error("unreachable");
    expect(before.metronome.range).toBe(2);
    expect(before.metronome.holders.map((h) => h.displayName)).toEqual(["Amy Alt"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const after = await getBoard();
    if (after.empty) throw new Error("unreachable");
    expect(after.metronome.range).toBe(2);
    expect(after.metronome.holders.map((h) => h.displayName)).toEqual(["Amy"]);
  });
});
