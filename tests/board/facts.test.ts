/**
 * `getFunFacts()` — PRD criteria 281–293 (Milestone 4, first slice).
 *
 * Covers: the empty archive (no fact slot at all — criterion 292), a bounded
 * query-count proof at 10 games vs. 60 (mirroring `tests/board/queries.test.ts`'s
 * own proof for criterion 190, applied here per criterion 293), that the pool
 * only ever contains facts that actually apply (never a null-padded array),
 * nothing cached against a delete (mirroring criterion 189's own test for the
 * records board), and `pickFunFact()`'s own trivial random-index behaviour.
 *
 * The generators' own correctness (exact run lengths, exact thresholds,
 * chronological sequencing) is `tests/scoring/facts.test.ts`'s job — this
 * file is about the fetch-and-reshape layer wiring real rows into them
 * correctly, not re-proving each generator's own logic.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";
import { createGameSeeder } from "../helpers/board";

// ---------------------------------------------------------------------------
// Query-count instrumentation (criterion 293), identical pattern to
// `tests/board/queries.test.ts`.
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
  process.env.SESSION_SECRET = "board-facts-test-secret";
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

describe("getFunFacts — empty archive (criterion 292)", () => {
  it("returns an empty pool, not a pool of nulls", async () => {
    const { getFunFacts } = await import("@/lib/board/facts");
    expect(await getFunFacts()).toEqual([]);
  });
});

describe("getFunFacts — never returns a null-padded array (criterion 281)", () => {
  it("every entry in the pool is a real fact with a key", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50, handScores: [0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getFunFacts } = await import("@/lib/board/facts");
    const facts = await getFunFacts();
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact).not.toBeNull();
      expect(typeof fact.key).toBe("string");
    }
    // Collective trivia and a random old night are always present once one game exists.
    expect(facts.map((f) => f.key)).toContain("collectiveTrivia");
    expect(facts.map((f) => f.key)).toContain("randomOldNight");
  });
});

describe("getFunFacts — the flatliner, wired from real round_score rows", () => {
  it("finds the right player, game and run length", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 15, handScores: [0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0] },
        { playerId: players["Bo"]!, finalScore: 90, handScores: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] },
      ],
    });

    const { getFunFacts } = await import("@/lib/board/facts");
    const facts = await getFunFacts();
    const flatliner = facts.find((f) => f.key === "flatliner");
    expect(flatliner).toBeDefined();
    if (flatliner?.key !== "flatliner") throw new Error("unreachable");
    expect(flatliner.playerId).toBe(players["Amy"]);
    expect(flatliner.gameId).toBe(gameId);
    // The longer of the two runs (hands 1–3 and hands 7–11) wins: 5, not 3.
    expect(flatliner.runLength).toBe(5);
  });
});

describe("getFunFacts — random old night's story matches the game as saved", () => {
  it("carries date, location, roster, winners and the winning score", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-03-14",
      locationName: "The Local",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getFunFacts } = await import("@/lib/board/facts");
    const facts = await getFunFacts();
    const night = facts.find((f) => f.key === "randomOldNight");
    if (night?.key !== "randomOldNight") throw new Error("unreachable");
    expect(night.playedOn).toBe("2026-03-14");
    expect(night.locationName).toBe("The Local");
    expect(night.winners).toEqual(["Amy"]);
    expect(night.winningScore).toBe(50);
    expect(night.players.map((p) => p.displayName)).toEqual(["Amy", "Bo"]);
  });

  it("a game with no location reads as null, not a placeholder string", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getFunFacts } = await import("@/lib/board/facts");
    const facts = await getFunFacts();
    const night = facts.find((f) => f.key === "randomOldNight");
    if (night?.key !== "randomOldNight") throw new Error("unreachable");
    expect(night.locationName).toBeNull();
  });
});

describe("getFunFacts — collective trivia, wired from the real archive size", () => {
  it("hands = games × 11", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-01-01", "2026-01-08", "2026-01-15"]) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: 50 },
          { playerId: players["Bo"]!, finalScore: 90 },
        ],
      });
    }

    const { getFunFacts } = await import("@/lib/board/facts");
    const facts = await getFunFacts();
    const trivia = facts.find((f) => f.key === "collectiveTrivia");
    if (trivia?.key !== "collectiveTrivia") throw new Error("unreachable");
    expect(trivia.totalGames).toBe(3);
    expect(trivia.totalHands).toBe(33);
  });
});

describe("getFunFacts — nothing is cached (criterion 281, echoing criterion 189)", () => {
  it("reflects a deleted game on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getFunFacts } = await import("@/lib/board/facts");
    const before = await getFunFacts();
    expect(before.length).toBeGreaterThan(0);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getFunFacts();
    expect(after).toEqual([]);
  });
});

describe("getFunFacts — bounded query count (criterion 293)", () => {
  async function countQueriesAt(gameCount: number): Promise<number> {
    const players = await createPlayers(["Amy", "Bo", "Cy", "Dee"]);
    const seedGame = createGameSeeder();
    for (let i = 0; i < gameCount; i++) {
      const day = String((i % 27) + 1).padStart(2, "0");
      const month = String(Math.floor(i / 27) + 1).padStart(2, "0");
      await seedGame({
        playedOn: `2026-${month}-${day}`,
        players: [
          {
            playerId: players["Amy"]!,
            finalScore: 40 + i,
            handScores: [4 + i, 6, 5, 3, 4, 3, 2, 3, 4, 3, 40 + i - (4 + i + 6 + 5 + 3 + 4 + 3 + 2 + 3 + 4 + 3)],
          },
          { playerId: players["Bo"]!, finalScore: 80 + i },
          { playerId: players["Cy"]!, finalScore: 90 + i },
          { playerId: players["Dee"]!, finalScore: 100 + i },
        ],
      });
    }

    const { getFunFacts } = await import("@/lib/board/facts");
    selectCallCount = 0;
    await getFunFacts();
    return selectCallCount;
  }

  it("issues the same number of queries at 10 games and at 60", async () => {
    const queriesAt10 = await countQueriesAt(10);

    await teardownTestDb();
    await setupTestDb();
    const queriesAt60 = await countQueriesAt(60);

    expect(queriesAt10).toBeGreaterThan(0);
    expect(queriesAt10).toBe(3);
    expect(queriesAt60).toBe(queriesAt10);
  });
});

describe("pickFunFact", () => {
  it("picks by index — 0 picks the first, near-1 picks the last", async () => {
    const { pickFunFact } = await import("@/lib/board/facts");
    const facts = [
      { key: "collectiveTrivia", totalGames: 1, totalHands: 11 } as const,
      { key: "overdue", gamesSinceSharedWin: 6 } as const,
    ];
    expect(pickFunFact(facts, () => 0)).toEqual(facts[0]);
    expect(pickFunFact(facts, () => 0.999999)).toEqual(facts[1]);
  });

  it("an empty pool has nothing to pick", async () => {
    const { pickFunFact } = await import("@/lib/board/facts");
    expect(pickFunFact([])).toBeNull();
  });
});
