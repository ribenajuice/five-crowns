/**
 * `getStatsPage` — PRD criteria 236–242, 246, 248.
 *
 * Covers: the empty archive, the eleven-hand trend, best/worst game ever
 * (matching the board's own function — criterion 241), the villains table
 * with a tied worst hand and a one-game player (no floor, criterion 245),
 * the disasters list with ties at the cutoff, both averages tables, nothing
 * cached across a delete and a merge, and a bounded query-count proof at 10
 * games vs. 60 (criterion 248).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";
import { createGameSeeder } from "../helpers/board";

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
  process.env.SESSION_SECRET = "stats-queries-test-secret";
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

describe("getStatsPage — an empty archive", () => {
  it("renders the empty state, not a page of zeros", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    expect(await getStatsPage()).toEqual({ empty: true });
  });
});

describe("getStatsPage — the eleven-hand trend (criterion 237)", () => {
  it("is the mean across every player and every game, not per-player", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { playerId: players["Bo"]!, finalScore: 110, handScores: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.trend).toHaveLength(11);
    for (const hand of page.trend) expect(hand.mean).toBe(7.5); // (5 + 10) / 2
  });
});

describe("getStatsPage — best/worst game ever (criterion 241: same function as the board)", () => {
  it("matches getBoard()'s own holder, number and date exactly", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 30 },
        { playerId: players["Cy"]!, finalScore: 150 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const { getBoard } = await import("@/lib/board/queries");
    const page = await getStatsPage();
    const board = await getBoard();
    if (page.empty || board.empty) throw new Error("unreachable");

    const boardBest = board.singleEventRecords.find((r) => r.key === "bestGameEver")!;
    const boardWorst = board.singleEventRecords.find((r) => r.key === "worstGameEver")!;

    expect(page.bestGameEver!.value).toBe(boardBest.value);
    expect(page.bestGameEver!.holders.map((h) => h.displayName)).toEqual(
      boardBest.holders.map((h) => h.displayName),
    );
    expect(page.bestGameEver!.holders.map((h) => h.playedOn)).toEqual(boardBest.holders.map((h) => h.playedOn));

    expect(page.worstGameEver!.value).toBe(boardWorst.value);
    expect(page.worstGameEver!.holders.map((h) => h.displayName)).toEqual(
      boardWorst.holders.map((h) => h.displayName),
    );
  });
});

describe("getStatsPage — hand-by-hand villains (criterion 239)", () => {
  it("names every player's own worst hand, ties joint, and states each player's own game count", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 45, handScores: [1, 1, 1, 1, 1, 1, 1, 1, 20, 1, 20] },
        { playerId: players["Bo"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    const amy = page.villains.find((v) => v.displayName === "Amy")!;
    expect(amy.gamesPlayed).toBe(1);
    expect(amy.worstHands.sort()).toEqual(["Jacks", "Kings"]);

    const bo = page.villains.find((v) => v.displayName === "Bo")!;
    expect(bo.worstHands).toHaveLength(11); // every hand ties at 5 for a flat column.
  });

  it("⚠️ criterion 245: no floor — a one-game player appears with their own game count", async () => {
    const players = await createPlayers(["Solo", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Solo"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    const solo = page.villains.find((v) => v.displayName === "Solo")!;
    expect(solo).toBeDefined();
    expect(solo.gamesPlayed).toBe(1);
  });
});

describe("getStatsPage — biggest single-hand disasters (criterion 240)", () => {
  it("returns the ten biggest, and ties at the tenth place are all shown", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Eleven hands, all tied at 9 except one at 100 — 12 rows should survive
    // a limit of 10 once the tie at the cutoff is honoured.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 190, handScores: [100, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] },
        { playerId: players["Bo"]!, finalScore: 99, handScores: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.disasters[0]!.score).toBe(100);
    expect(page.disasters[0]!.hand).toBe("3s");
    // 10 nines from Amy (hands 2–11) + 11 nines from Bo = 21 rows at 9, all kept.
    expect(page.disasters).toHaveLength(22);
    expect(page.disasters.every((d) => d.score === 100 || d.score === 9)).toBe(true);
  });

  it("an archive with fewer hands than the limit is not padded", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 10, handScores: [10] },
        { playerId: players["Bo"]!, finalScore: 5, handScores: [5] },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");
    expect(page.disasters).toHaveLength(2);
  });
});

describe("getStatsPage — the two averages tables (criteria 223–224, 242)", () => {
  it("lists every player's own average and every roster's table average", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy", "Dee"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 60 },
        { playerId: players["Cy"]!, finalScore: 80 },
        { playerId: players["Dee"]!, finalScore: 100 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.playerAverages.find((p) => p.displayName === "Amy")).toEqual({
      playerId: players["Amy"],
      displayName: "Amy",
      average: 40,
      gamesPlayed: 1,
    });

    expect(page.rosterAverages).toHaveLength(1);
    // (40 + 60 + 80 + 100) / 4 = 70.
    expect(page.rosterAverages[0]!.average).toBe(70);
    expect(page.rosterAverages[0]!.gamesPlayed).toBe(1);
    expect(page.rosterAverages[0]!.scoresCount).toBe(4);
  });

  it("⚠️ criterion 245: no floor — a one-game player and a one-game roster both appear", async () => {
    const players = await createPlayers(["Solo", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Solo"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 60 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.playerAverages.find((p) => p.displayName === "Solo")).toBeDefined();
    expect(page.rosterAverages).toHaveLength(1);
  });

  it("⚠️ criterion 139's own invariant, restated: two rosters never move each other's averages", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 60 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 100 },
        { playerId: players["Cy"]!, finalScore: 200 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.rosterAverages).toHaveLength(2);
    expect(page.rosterAverages.map((r) => r.average).sort((a, b) => a - b)).toEqual([50, 150]);
  });
});

describe("getStatsPage — nothing is cached (criterion 246, restating 189)", () => {
  it("reflects a deleted game on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getStatsPage } = await import("@/lib/stats/queries");
    const before = await getStatsPage();
    expect(before.empty).toBe(false);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getStatsPage();
    expect(after.empty).toBe(true);
  });

  it("reflects a player merge on the very next call", async () => {
    const players = await createPlayers(["Amy", "Amy Alt", "Bo"]);
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
        { playerId: players["Amy Alt"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 95 },
      ],
    });

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const { getStatsPage } = await import("@/lib/stats/queries");
    const page = await getStatsPage();
    if (page.empty) throw new Error("unreachable");

    expect(page.playerAverages.filter((p) => p.displayName === "Amy")).toHaveLength(1);
    expect(page.playerAverages.find((p) => p.displayName === "Amy")!.gamesPlayed).toBe(2);
  });
});

describe("getStatsPage — the query count does not grow with the archive (criterion 248)", () => {
  async function countQueriesAt(gameCount: number): Promise<number> {
    const players = await createPlayers(["Amy", "Bo", "Cy", "Dee"]);
    const seedGame = createGameSeeder();
    for (let i = 0; i < gameCount; i++) {
      const day = String((i % 27) + 1).padStart(2, "0");
      const month = String(Math.floor(i / 27) + 1).padStart(2, "0");
      await seedGame({
        playedOn: `2026-${month}-${day}`,
        players: [
          { playerId: players["Amy"]!, finalScore: 40 + i },
          { playerId: players["Bo"]!, finalScore: 80 + i },
          { playerId: players["Cy"]!, finalScore: 90 + i },
          { playerId: players["Dee"]!, finalScore: 100 + i },
        ],
      });
    }

    const { getStatsPage } = await import("@/lib/stats/queries");
    selectCallCount = 0;
    const page = await getStatsPage();
    expect(page.empty).toBe(false);
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
