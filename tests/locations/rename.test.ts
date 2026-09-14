/**
 * `renameLocation` — PRD criteria 145–146.
 */

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "locations-rename-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

async function makeLocation(name: string): Promise<string> {
  const { getDb } = await import("@/lib/db");
  const { location } = await import("@/lib/db/schema");
  const { nameKey } = await import("@/lib/draft/state");
  const id = randomUUID();
  await getDb()
    .insert(location)
    .values({ id, name, slug: `place-${id.slice(-8)}`, nameKey: nameKey(name) });
  return id;
}

describe("renameLocation", () => {
  it("throws LocationNotFoundError for an unknown location", async () => {
    const { renameLocation, LocationNotFoundError } = await import("@/lib/locations/rename");
    await expect(renameLocation(randomUUID(), "Somewhere")).rejects.toBeInstanceOf(LocationNotFoundError);
  });

  it("throws EmptyLocationNameError for a blank name", async () => {
    const id = await makeLocation("The blank-name venue");
    const { renameLocation, EmptyLocationNameError } = await import("@/lib/locations/rename");
    await expect(renameLocation(id, "   ")).rejects.toBeInstanceOf(EmptyLocationNameError);
  });

  it("renames, trimmed", async () => {
    const id = await makeLocation("The rename-me venue");
    const { renameLocation } = await import("@/lib/locations/rename");
    const result = await renameLocation(id, "  Player C's place  ");
    expect(result.name).toBe("Player C's place");

    const { listPlaces } = await import("@/lib/locations/queries");
    const row = (await listPlaces()).find((p) => p.id === id);
    expect(row!.name).toBe("Player C's place");
  });

  it("⚠️ criterion 146: refuses a name_key collision, naming the other place, no merge offered", async () => {
    const existingId = await makeLocation("Player C's House");
    const otherId = await makeLocation("The pub");

    const { renameLocation, LocationNameConflictError } = await import("@/lib/locations/rename");
    try {
      await renameLocation(otherId, "  PLAYER C'S   HOUSE  "); // same name_key, different casing/spacing
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(LocationNameConflictError);
      expect((error as InstanceType<typeof LocationNameConflictError>).other.id).toBe(existingId);
      expect((error as Error).message).toContain("Player C's House");
    }

    // Refused, not renamed.
    const { listPlaces } = await import("@/lib/locations/queries");
    const other = (await listPlaces()).find((p) => p.id === otherId);
    expect(other!.name).toBe("The pub");
  });

  it("a rename is reflected wherever the location is used (games list / game view read the same row)", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01, { newLocationName: "Old name" });
    const saved = await saveGame(draftId, state);

    const { listPlaces } = await import("@/lib/locations/queries");
    const locationId = (await listPlaces()).find((p) => p.name === "Old name")!.id;

    const { renameLocation } = await import("@/lib/locations/rename");
    await renameLocation(locationId, "New name");

    const { getGame } = await import("@/lib/games/queries");
    const detail = await getGame(saved.gameId);
    expect(detail!.locationName).toBe("New name");
  });
});
