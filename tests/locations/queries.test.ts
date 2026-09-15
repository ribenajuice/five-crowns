/**
 * `listPlaces` — PRD criterion 140, extended by Stage 4 (criteria 252, 259,
 * 273) with each venue's table average and a bounded query count. Also
 * `getVenuePage` (criteria 260–261, 273).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

// ---------------------------------------------------------------------------
// Query-count instrumentation (criterion 273) — same proxy pattern as
// `tests/board/queries.test.ts`'s own proof for `getBoard()`.
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
  process.env.SESSION_SECRET = "locations-queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("listPlaces", () => {
  it("says nothing on a fresh database", async () => {
    const { listPlaces } = await import("@/lib/locations/queries");
    expect(await listPlaces()).toEqual([]);
  });

  it("⚠️ criterion 140: a never-used location is still listed, with 0 games", async () => {
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await getDb()
      .insert(location)
      .values({ id, name: "Never used yet", slug: `never-used-${id.slice(-8)}`, nameKey: "never used yet" });

    const { listPlaces } = await import("@/lib/locations/queries");
    const places = await listPlaces();
    const row = places.find((p) => p.id === id);
    expect(row).toBeDefined();
    expect(row!.gamesPlayed).toBe(0);
  });

  it("⚠️ sorts case-insensitively — a lowercase name still lands alphabetically, not after every uppercase one", async () => {
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");

    for (const name of ["Zoe's house", "abby's house"]) {
      const id = randomUUID();
      await getDb()
        .insert(location)
        .values({ id, name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-8)}`, nameKey: name.toLowerCase() });
    }

    const { listPlaces } = await import("@/lib/locations/queries");
    const names = (await listPlaces()).map((p) => p.name);
    expect(names.indexOf("abby's house")).toBeLessThan(names.indexOf("Zoe's house"));
  });

  it("counts games played once a location is used", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01, { newLocationName: "The venue" });
    await saveGame(draftId, state);

    const { listPlaces } = await import("@/lib/locations/queries");
    const venue = (await listPlaces()).find((p) => p.name === "The venue");
    expect(venue).toBeDefined();
    expect(venue!.gamesPlayed).toBe(1);
  });
});

describe("getPlace (Stage 4, criteria 163–166)", () => {
  it("returns null for a made-up id", async () => {
    const { getPlace } = await import("@/lib/locations/queries");
    expect(await getPlace("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("returns the place's own name and games-played count", async () => {
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await getDb()
      .insert(location)
      .values({ id, name: "getPlace test venue", slug: `getplace-${id.slice(-8)}`, nameKey: "getplace test venue" });

    const { getPlace } = await import("@/lib/locations/queries");
    const place = await getPlace(id);
    expect(place).toEqual({ id, name: "getPlace test venue", gamesPlayed: 0, tableAverage: null });
  });
});

describe("listPlaces — a venue's own table average (Stage 4, criteria 252, 259)", () => {
  it("a never-used venue has no table average — the no-data string stands in, not a zero", async () => {
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await getDb()
      .insert(location)
      .values({ id, name: "Unused venue", slug: `unused-venue-${id.slice(-8)}`, nameKey: "unused venue" });

    const { listPlaces } = await import("@/lib/locations/queries");
    const row = (await listPlaces()).find((p) => p.id === id)!;
    expect(row.tableAverage).toBeNull();
  });

  it("a used venue's table average is the mean of every final score posted there, with both samples", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["Venue Amy", "Venue Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "listPlaces average venue",
      players: [
        { playerId: players["Venue Amy"]!, finalScore: 40 },
        { playerId: players["Venue Bo"]!, finalScore: 60 },
      ],
    });

    const { listPlaces } = await import("@/lib/locations/queries");
    const row = (await listPlaces()).find((p) => p.name === "listPlaces average venue")!;
    expect(row.tableAverage).toEqual({ average: 50, gamesPlayed: 1, scoresCount: 2 });
  });
});

describe("getVenuePage — criteria 260–261", () => {
  it("returns null for a made-up id", async () => {
    const { getVenuePage } = await import("@/lib/locations/queries");
    expect(await getVenuePage("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("a venue with zero games returns an empty players/games shape, not a page of zeros", async () => {
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await getDb()
      .insert(location)
      .values({ id, name: "Empty venue", slug: `empty-venue-${id.slice(-8)}`, nameKey: "empty venue" });

    const { getVenuePage } = await import("@/lib/locations/queries");
    const page = await getVenuePage(id);
    expect(page).toEqual({ id, name: "Empty venue", gamesPlayed: 0, tableAverage: null, players: [], games: [] });
  });

  it("the per-player table orders by games here descending then alphabetically, no ranking decoration", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["Zed", "Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      locationName: "getVenuePage test venue",
      players: [
        { playerId: players["Zed"]!, finalScore: 40 },
        { playerId: players["Amy"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      locationName: "getVenuePage test venue",
      players: [
        { playerId: players["Zed"]!, finalScore: 30 },
        { playerId: players["Amy"]!, finalScore: 90 },
      ],
    });

    const { listPlaces, getVenuePage } = await import("@/lib/locations/queries");
    const venueId = (await listPlaces()).find((p) => p.name === "getVenuePage test venue")!.id;
    const page = await getVenuePage(venueId);

    expect(page!.gamesPlayed).toBe(2);
    expect(page!.tableAverage).toEqual({ average: 60, gamesPlayed: 2, scoresCount: 5 });
    // Zed and Amy both played twice, Bo once — Zed before Amy alphabetically.
    expect(page!.players.map((p) => p.displayName)).toEqual(["Amy", "Zed", "Bo"]);

    const zed = page!.players.find((p) => p.displayName === "Zed")!;
    expect(zed.gamesPlayed).toBe(2);
    expect(zed.wins).toBe(2);
    expect(zed.average).toBe(35);

    expect(page!.games).toHaveLength(2);
    expect(page!.games.map((g) => g.playedOn)).toEqual(["2026-01-08", "2026-01-01"]);
  });
});

describe("listPlaces / getVenuePage — the query count does not grow with venue count (criterion 273)", () => {
  it("listPlaces issues the same number of queries at 2 venues and at 6", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["QCount Amy", "QCount Bo"]);
    const seedGame = createGameSeeder();

    async function countQueriesAtVenues(n: number): Promise<number> {
      for (let i = 0; i < n; i++) {
        await seedGame({
          playedOn: `2026-04-${String(i + 1).padStart(2, "0")}`,
          locationName: `Query-count venue ${i}`,
          players: [
            { playerId: players["QCount Amy"]!, finalScore: 40 },
            { playerId: players["QCount Bo"]!, finalScore: 60 },
          ],
        });
      }
      const { listPlaces } = await import("@/lib/locations/queries");
      selectCallCount = 0;
      await listPlaces();
      return selectCallCount;
    }

    const queriesAt2 = await countQueriesAtVenues(2);
    const queriesAt6 = await countQueriesAtVenues(4); // cumulative: 2 + 4 = 6 venues total

    expect(queriesAt2).toBeGreaterThan(0);
    expect(queriesAt6).toBe(queriesAt2);
  });

  it("getVenuePage issues the same bounded number of queries regardless of the archive's own size", async () => {
    const { createPlayers } = await import("../helpers/draft");
    const { createGameSeeder } = await import("../helpers/board");
    const players = await createPlayers(["VPage Amy", "VPage Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-05-01",
      locationName: "getVenuePage query-count venue",
      players: [
        { playerId: players["VPage Amy"]!, finalScore: 40 },
        { playerId: players["VPage Bo"]!, finalScore: 60 },
      ],
    });

    const { listPlaces, getVenuePage } = await import("@/lib/locations/queries");
    const venueId = (await listPlaces()).find((p) => p.name === "getVenuePage query-count venue")!.id;

    async function countQueries(): Promise<number> {
      selectCallCount = 0;
      await getVenuePage(venueId);
      return selectCallCount;
    }

    const before = await countQueries();

    // Ten more unrelated games elsewhere in the archive — the venue page's
    // own query count must not move.
    for (let i = 0; i < 10; i++) {
      await seedGame({
        playedOn: `2026-06-${String(i + 1).padStart(2, "0")}`,
        locationName: "Somewhere else entirely",
        players: [
          { playerId: players["VPage Amy"]!, finalScore: 40 + i },
          { playerId: players["VPage Bo"]!, finalScore: 60 + i },
        ],
      });
    }

    const after = await countQueries();
    expect(before).toBeGreaterThan(0);
    expect(after).toBe(before);
  });
});
