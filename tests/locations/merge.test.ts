/**
 * `mergeLocations` — PRD criteria 163–166.
 */

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

async function insertLocation(id: string, name: string) {
  const { getDb } = await import("@/lib/db");
  const { location } = await import("@/lib/db/schema");
  await getDb()
    .insert(location)
    .values({ id, name, slug: id, nameKey: name.toLowerCase() });
}

async function insertPlayer(id: string, displayName: string) {
  const { getDb } = await import("@/lib/db");
  const { player } = await import("@/lib/db/schema");
  await getDb()
    .insert(player)
    .values({ id, displayName, slug: id, nameKey: displayName.toLowerCase() });
}

async function insertRoster(id: string, memberIds: string[]) {
  const { getDb } = await import("@/lib/db");
  const { roster, rosterMember } = await import("@/lib/db/schema");
  const { rosterSignature } = await import("@/lib/scoring");
  await getDb()
    .insert(roster)
    .values({ id, signature: rosterSignature(memberIds), size: memberIds.length });
  await getDb()
    .insert(rosterMember)
    .values(memberIds.map((playerId) => ({ rosterId: id, playerId })));
}

async function insertGame(id: string, rosterId: string, locationId: string | null) {
  const { getDb } = await import("@/lib/db");
  const { game } = await import("@/lib/db/schema");
  await getDb().insert(game).values({ id, playedOn: "2026-01-01", locationId, rosterId });
}

describe("mergeLocations", () => {
  it("repoints every game at the losing location and deletes it (criteria 163–164)", async () => {
    await insertLocation("survivor", "Player C's place");
    await insertLocation("loser", "player cs");
    await insertPlayer("p1", "Player One");
    await insertRoster("r1", ["p1"]);
    await insertGame("g1", "r1", "loser");
    await insertGame("g2", "r1", "loser");

    const { mergeLocations } = await import("@/lib/locations/merge");
    const result = await mergeLocations("survivor", "loser");
    expect(result).toMatchObject({
      survivorId: "survivor",
      deletedLocationId: "loser",
      gamesRepointed: 2,
    });

    const { getDb } = await import("@/lib/db");
    const { location, game } = await import("@/lib/db/schema");

    expect(await getDb().select().from(location).where(eq(location.id, "loser"))).toHaveLength(0);
    const games = await getDb().select().from(game);
    expect(games.every((g) => g.locationId === "survivor")).toBe(true);
  });

  it("⚠️ criterion 165: a game with no location is untouched by the merge", async () => {
    await insertLocation("survivor", "Player C's place");
    await insertLocation("loser", "player cs");
    await insertPlayer("p1", "Player One");
    await insertRoster("r1", ["p1"]);
    await insertGame("g-located", "r1", "loser");
    await insertGame("g-no-location", "r1", null);

    const { mergeLocations } = await import("@/lib/locations/merge");
    await mergeLocations("survivor", "loser");

    const { getDb } = await import("@/lib/db");
    const { game } = await import("@/lib/db/schema");
    const noLocationGame = (
      await getDb().select().from(game).where(eq(game.id, "g-no-location"))
    )[0]!;
    expect(noLocationGame.locationId).toBeNull();
  });

  it("throws SameLocationError for the same id twice", async () => {
    await insertLocation("p1", "Solo place");
    const { mergeLocations, SameLocationError } = await import("@/lib/locations/merge");
    await expect(mergeLocations("p1", "p1")).rejects.toBeInstanceOf(SameLocationError);
  });

  it("throws LocationNotFoundError when either id doesn't exist", async () => {
    await insertLocation("p1", "Solo place");
    const { mergeLocations, LocationNotFoundError } = await import("@/lib/locations/merge");
    await expect(mergeLocations("p1", "no-such-place")).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );
    await expect(mergeLocations("no-such-place", "p1")).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );
  });

  it("row counts for players, rosters, rounds and photos are unchanged (criterion 166)", async () => {
    await insertLocation("survivor", "Player C's place");
    await insertLocation("loser", "player cs");
    await insertPlayer("p1", "Player One");
    await insertRoster("r1", ["p1"]);
    await insertGame("g1", "r1", "loser");

    const { getDb } = await import("@/lib/db");
    const { player, roster, roundScore, photo } = await import("@/lib/db/schema");

    const [beforePlayers, beforeRosters, beforeRounds, beforePhotos] = await Promise.all([
      getDb().select().from(player),
      getDb().select().from(roster),
      getDb().select().from(roundScore),
      getDb().select().from(photo),
    ]);

    const { mergeLocations } = await import("@/lib/locations/merge");
    await mergeLocations("survivor", "loser");

    expect(await getDb().select().from(player)).toEqual(beforePlayers);
    expect(await getDb().select().from(roster)).toEqual(beforeRosters);
    expect(await getDb().select().from(roundScore)).toEqual(beforeRounds);
    expect(await getDb().select().from(photo)).toEqual(beforePhotos);
  });

  it("⚠️ a forced failure partway through leaves the record exactly as it was", async () => {
    await insertLocation("survivor", "Player C's place");
    await insertLocation("loser", "player cs");
    await insertPlayer("p1", "Player One");
    await insertRoster("r1", ["p1"]);
    await insertGame("g1", "r1", "loser");

    const { getDb } = await import("@/lib/db");
    await getDb().run(
      sql.raw(
        `CREATE TRIGGER force_location_merge_failure BEFORE DELETE ON location WHEN old.id = 'loser' BEGIN SELECT RAISE(ABORT, 'forced test failure'); END;`,
      ),
    );

    const { mergeLocations } = await import("@/lib/locations/merge");
    await expect(mergeLocations("survivor", "loser")).rejects.toThrow();

    const { location, game } = await import("@/lib/db/schema");
    expect(await getDb().select().from(location).where(eq(location.id, "loser"))).toHaveLength(1);
    const untouchedGame = (await getDb().select().from(game).where(eq(game.id, "g1")))[0]!;
    expect(untouchedGame.locationId).toBe("loser");
  });
});
