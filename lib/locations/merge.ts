/**
 * `mergeLocations` — PRD criteria 163–166.
 *
 * Simpler than a player merge: a location has no per-entity history to
 * reconcile (`docs/ARCHITECTURE.md` § Data model, `location`) — no roster
 * concept, no round scores, nothing that can collide on a primary key. A
 * single transaction repoints every game at the losing location and deletes
 * it. Games with no location (`location_id IS NULL`) are never touched
 * (criterion 165) — the repoint only ever matches `location_id = loserId`.
 *
 * Permanent, like a player merge and a game delete: no history kept
 * (`docs/DECISIONS.md`, 2026-09-14).
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, location } from "@/lib/db/schema";

export class LocationNotFoundError extends Error {
  override name = "LocationNotFoundError";
  constructor(public readonly locationId: string) {
    super("That place doesn't exist.");
  }
}

export class SameLocationError extends Error {
  override name = "SameLocationError";
  constructor() {
    super("A place can't be merged with itself.");
  }
}

export interface MergeLocationsResult {
  survivorId: string;
  deletedLocationId: string;
  /** How many games were repointed — for the caller's own logging/telemetry. */
  gamesRepointed: number;
}

/**
 * Merge `loserId` into `survivorId`. Every game whose `location_id` is
 * `loserId` is repointed to `survivorId`; the loser's `location` row is then
 * deleted. Games with no location are untouched by construction — the
 * `WHERE` clause only ever matches `location_id = loserId`.
 *
 * @throws {SameLocationError} if the two ids are the same.
 * @throws {LocationNotFoundError} if either id doesn't name a real location.
 */
export async function mergeLocations(
  survivorId: string,
  loserId: string,
): Promise<MergeLocationsResult> {
  if (survivorId === loserId) throw new SameLocationError();

  const db = getDb();

  const [survivorRow, loserRow] = await Promise.all([
    db.select().from(location).where(eq(location.id, survivorId)),
    db.select().from(location).where(eq(location.id, loserId)),
  ]);
  if (!survivorRow[0]) throw new LocationNotFoundError(survivorId);
  if (!loserRow[0]) throw new LocationNotFoundError(loserId);

  return db.transaction(async (tx) => {
    // Re-check existence inside the transaction: best-effort insurance
    // against a concurrent merge of the same location landing in between
    // (docs/ARCHITECTURE.md § "Concurrency, deliberately not solved").
    const stillThere = (
      await tx.select({ id: location.id }).from(location).where(eq(location.id, loserId))
    )[0];
    if (!stillThere) throw new LocationNotFoundError(loserId);

    const repoint = await tx
      .update(game)
      .set({ locationId: survivorId })
      .where(eq(game.locationId, loserId));

    await tx.delete(location).where(eq(location.id, loserId));

    return {
      survivorId,
      deletedLocationId: loserId,
      gamesRepointed: repoint.rowsAffected ?? 0,
    };
  });
}
