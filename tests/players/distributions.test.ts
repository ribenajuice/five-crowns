/**
 * `lib/players/distributions.ts` — PRD criteria 223, 225–226, 243.
 *
 * Covers: average/hand profile/worst hand(s)/best-worst game for an ordinary
 * player, a tied worst hand, a personal best/worst tie across two games, a
 * zero-games player's empty shape, nothing cached across a delete and a
 * merge, and a bounded query-count proof (one beyond `getPlayerGameFacts`'s
 * own two).
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
  process.env.SESSION_SECRET = "distributions-test-secret";
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

describe("getPlayerDistributions — criteria 223, 225–226", () => {
  it("a player with no games gets the empty shape, not an error", async () => {
    const players = await createPlayers(["Amy"]);
    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const result = await getPlayerDistributions(players["Amy"]!);
    expect(result).toEqual({ average: null, handProfile: [], worstHands: [], bestGame: null, worstGame: null });
  });

  it("average, hand profile and worst hand over one ordinary game", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        {
          playerId: players["Amy"]!,
          finalScore: 55,
          handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    // A second game where Amy's Kings hand is a real outlier.
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        {
          playerId: players["Amy"]!,
          finalScore: 60,
          handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10],
        },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const result = await getPlayerDistributions(players["Amy"]!);

    expect(result.average).toEqual({ average: 57.5, gamesPlayed: 2 });
    expect(result.handProfile).toHaveLength(11);
    const kings = result.handProfile.find((h) => h.label === "Kings")!;
    expect(kings.mean).toBe(7.5); // (5 + 10) / 2
    expect(result.worstHands).toEqual(["Kings"]);
  });

  it("⚠️ criterion 226: ties are joint — every hand tied for the highest mean is named", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        // Jacks (hand 9) and Kings (hand 11) both score 20 — a tied worst hand.
        { playerId: players["Amy"]!, finalScore: 45, handScores: [1, 1, 1, 1, 1, 1, 1, 1, 20, 1, 20] },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const result = await getPlayerDistributions(players["Amy"]!);
    expect(result.worstHands.sort()).toEqual(["Jacks", "Kings"]);
  });

  it("criterion 243: their own best and worst game, with a link to each", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-02-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 100 },
        { playerId: players["Bo"]!, finalScore: 60 },
      ],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const result = await getPlayerDistributions(players["Amy"]!);

    expect(result.bestGame).toEqual({
      score: 40,
      games: [expect.objectContaining({ playedOn: "2026-02-01" })],
    });
    expect(result.worstGame).toEqual({
      score: 100,
      games: [expect.objectContaining({ playedOn: "2026-02-08" })],
    });
  });

  it("⚠️ a personal best repeated in two different games is two games, not one", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-02-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 95 },
      ],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const result = await getPlayerDistributions(players["Amy"]!);
    expect(result.bestGame!.score).toBe(40);
    expect(result.bestGame!.games).toHaveLength(2);
    expect(result.bestGame!.games.map((g) => g.playedOn).sort()).toEqual(["2026-02-01", "2026-02-08"]);
  });

  it("accepts already-fetched game facts, adding exactly one query beyond them", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 55, handScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getPlayerGameFacts } = await import("@/lib/players/rivalry");
    const { getPlayerDistributions } = await import("@/lib/players/distributions");

    const facts = await getPlayerGameFacts(players["Amy"]!);
    selectCallCount = 0;
    await getPlayerDistributions(players["Amy"]!, facts);
    expect(selectCallCount).toBe(1);
  });

  it("nothing is cached — a delete is reflected on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const before = await getPlayerDistributions(players["Amy"]!);
    expect(before.average).toEqual({ average: 40, gamesPlayed: 1 });

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getPlayerDistributions(players["Amy"]!);
    expect(after.average).toBeNull();
  });

  it("nothing is cached — a player merge is reflected on the very next call", async () => {
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

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    const merged = await getPlayerDistributions(players["Amy"]!);
    expect(merged.average).toEqual({ average: 50, gamesPlayed: 2 });
  });
});
