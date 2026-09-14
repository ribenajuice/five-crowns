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
    expect(board.records).toHaveLength(7);
    expect(board.records.map((r) => r.key)).toEqual([
      "mostWins",
      "mostWinsInARow",
      "lowestAverageScore",
      "mostRoundsWon",
      "stalwart",
      "drought",
      "nearlyMan",
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
