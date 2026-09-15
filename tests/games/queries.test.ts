/**
 * `listGames` and `getGame` — criteria 69 and 70, plus the presigned sheet
 * photo (criterion 12's shape, reused here).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createColumnPhoto, setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

// See tests/games/save.test.ts for why `.data/photos` is never cleaned up here.
beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("listGames — criterion 69", () => {
  it("is newest first by playedOn, and shows date, venue, roster and winner(s)", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { listGames } = await import("@/lib/games/queries");

    const older = await setUpDraft(SHEET_01, {
      playedOn: "2020-01-01",
      newLocationName: "Player C's place",
    });
    await saveGame(older.draftId, older.state);

    const newer = await setUpDraft(SHEET_02, { playedOn: "2024-06-15" });
    await saveGame(newer.draftId, newer.state);

    const games = await listGames();
    expect(games).toHaveLength(2);
    expect(games[0]!.playedOn).toBe("2024-06-15");
    expect(games[1]!.playedOn).toBe("2020-01-01");

    expect(games[1]!.locationName).toBe("Player C's place");
    expect(games[1]!.winners).toEqual(["Player C"]);
    expect(games[1]!.winningScore).toBe(78);

    expect(games[0]!.locationName).toBeNull();
    expect(games[0]!.winners).toEqual(["Player B"]);
    expect(games[0]!.winningScore).toBe(71);
  });

  it("says nothing when there are no games", async () => {
    await teardownTestDb();
    await setupTestDb();
    const { listGames } = await import("@/lib/games/queries");
    expect(await listGames()).toEqual([]);
  });
});

describe("getGame — criterion 70", () => {
  it("returns columns in the paper's order, the final row, winner(s) and a presigned photo", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const { gameId } = await saveGame(draftId, state);

    const detail = await getGame(gameId);
    expect(detail).not.toBeNull();
    expect(detail!.columns.map((c) => c.displayName)).toEqual([
      "Player A",
      "Player B",
      "Player C",
      "Player D",
    ]);
    expect(detail!.columns.map((c) => c.columnOrder)).toEqual([0, 1, 2, 3]);
    expect(detail!.columns[2]!.runningTotals).toEqual(SHEET_01.columns[2]!.runningTotals);
    expect(detail!.columns[2]!.handScores).toEqual(SHEET_01.columns[2]!.handScores);
    expect(detail!.columns[2]!.isWinner).toBe(true);
    expect(detail!.winners).toEqual(["Player C"]);
    expect(detail!.winningScore).toBe(78);

    expect(detail!.sheetPhoto).not.toBeNull();
    expect(detail!.sheetPhoto!.url).toContain("original.jpg");
    expect(new Date(detail!.sheetPhoto!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null for an unknown id", async () => {
    const { getGame } = await import("@/lib/games/queries");
    expect(await getGame("no-such-game")).toBeNull();
  });

  it("⚠️ criterion 71: a close-up attaches to the game and the player its column belongs to", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const playerDColumn = state.columns.find((c) => c.sheetName === "Player D")!;
    await createColumnPhoto("closeup-query-1", draftId, playerDColumn.id);

    const { gameId } = await saveGame(draftId, state);
    const detail = await getGame(gameId);

    expect(detail!.closeUps).toHaveLength(1);
    const playerD = detail!.columns.find((c) => c.sheetName === "Player D")!;
    expect(detail!.closeUps[0]!.playerId).toBe(playerD.playerId);
    expect(detail!.closeUps[0]!.url).toContain("original.jpg");
  });

  it("⚠️ regression: a close-up whose column was removed before save still appears, with a null playerId", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const removedColumn = state.columns.find((c) => c.sheetName === "Player B")!;
    await createColumnPhoto("closeup-query-orphaned", draftId, removedColumn.id);
    state.columns = state.columns.filter((c) => c.id !== removedColumn.id);

    const { gameId } = await saveGame(draftId, state);
    const detail = await getGame(gameId);

    expect(detail!.closeUps).toHaveLength(1);
    expect(detail!.closeUps[0]!.playerId).toBeNull();
    expect(detail!.closeUps[0]!.url).toContain("original.jpg");
  });

  it("a game with no close-ups returns an empty array, not null or an error", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_02);
    const { gameId } = await saveGame(draftId, state);

    const detail = await getGame(gameId);
    expect(detail!.closeUps).toEqual([]);
  });
});

/* ======================================================================
 * Stage 4 — the games list's venue and roster filter (criteria 262–264).
 * ====================================================================== */

describe("resolveGamesFilter and listGames(filter) — criteria 262–263", () => {
  beforeAll(async () => {
    await teardownTestDb();
    await setupTestDb();
  });

  it("resolves a real venue and roster, and combines both into one filter", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["Filt Amy", "Filt Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "Filter venue",
      players: [
        { playerId: players["Filt Amy"]!, finalScore: 40 },
        { playerId: players["Filt Bo"]!, finalScore: 60 },
      ],
    });
    // A second game, same roster, no location — must not match the venue filter.
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Filt Amy"]!, finalScore: 40 },
        { playerId: players["Filt Bo"]!, finalScore: 60 },
      ],
    });

    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    const { listPlaces } = await import("@/lib/locations/queries");
    const venueId = (await listPlaces()).find((p) => p.name === "Filter venue")!.id;

    const games = await listGames();
    const rosterId = games.find((g) => g.locationName === "Filter venue")!.rosterId;

    const resolved = await resolveGamesFilter({ location: venueId, roster: rosterId });
    expect(resolved).not.toBeNull();
    expect(resolved!.location).toEqual({ kind: "venue", id: venueId, name: "Filter venue" });
    expect(resolved!.roster!.id).toBe(rosterId);

    const filtered = await listGames({ location: resolved!.location, rosterId: resolved!.roster!.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.locationName).toBe("Filter venue");
  });

  it("`location=none` filters to games with no location (criterion 251)", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["NoLoc Amy", "NoLoc Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-02-01",
      players: [
        { playerId: players["NoLoc Amy"]!, finalScore: 40 },
        { playerId: players["NoLoc Bo"]!, finalScore: 60 },
      ],
      // No locationName — deliberately unlocated.
    });

    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    const resolved = await resolveGamesFilter({ location: "none" });
    expect(resolved).toEqual({ location: { kind: "none" } });

    const filtered = await listGames({ location: resolved!.location });
    expect(filtered.every((g) => g.locationName === null)).toBe(true);
    expect(filtered.some((g) => g.playedOn === "2026-02-01")).toBe(true);
  });

  it("⚠️ an unknown location id resolves to null — the caller's own 404 signal, never a silent fallback", async () => {
    const { resolveGamesFilter } = await import("@/lib/games/queries");
    const resolved = await resolveGamesFilter({ location: "00000000-0000-0000-0000-000000000000" });
    expect(resolved).toBeNull();
  });

  it("⚠️ an unknown roster id resolves to null", async () => {
    const { resolveGamesFilter } = await import("@/lib/games/queries");
    const resolved = await resolveGamesFilter({ roster: "00000000-0000-0000-0000-000000000000" });
    expect(resolved).toBeNull();
  });

  it("a valid filter matching zero games returns an empty list, not an error", async () => {
    // A brand-new, never-used location.
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await getDb()
      .insert(location)
      .values({ id, name: "Unused filter venue", slug: `unused-filter-${id.slice(-8)}`, nameKey: "unused filter venue" });

    const { listGames } = await import("@/lib/games/queries");
    const filtered = await listGames({ location: { kind: "venue", id, name: "Unused filter venue" } });
    expect(filtered).toEqual([]);
  });

  it("order, row format and paging are unchanged when a filter is applied", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["Order Amy", "Order Bo"]);
    const seedGame = createGameSeeder();
    for (const playedOn of ["2026-03-01", "2026-03-08"]) {
      await seedGame({
        playedOn,
        locationName: "Order venue",
        players: [
          { playerId: players["Order Amy"]!, finalScore: 40 },
          { playerId: players["Order Bo"]!, finalScore: 60 },
        ],
      });
    }

    const { listGames } = await import("@/lib/games/queries");
    const { listPlaces } = await import("@/lib/locations/queries");
    const venueId = (await listPlaces()).find((p) => p.name === "Order venue")!.id;

    const filtered = await listGames({ location: { kind: "venue", id: venueId, name: "Order venue" } });
    expect(filtered.map((g) => g.playedOn)).toEqual(["2026-03-08", "2026-03-01"]);
    expect(filtered[0]).toHaveProperty("winners");
    expect(filtered[0]).toHaveProperty("winningScore");
  });
});
