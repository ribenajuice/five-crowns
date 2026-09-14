/**
 * `listPlaces` — PRD criterion 140.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

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
