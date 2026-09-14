/**
 * The places index — PRD criterion 140.
 *
 * Every location, including one that has never hosted a game — it must still
 * be listed with a 0 count and still be pickable on the review screen, which
 * this query change does nothing to affect (`GET /api/locations` is untouched).
 */

import "server-only";

import { asc } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, location } from "@/lib/db/schema";

export interface PlaceListItem {
  id: string;
  name: string;
  gamesPlayed: number;
}

/** Every location, alphabetical, 0-game locations included (criterion 140). */
export async function listPlaces(): Promise<PlaceListItem[]> {
  const db = getDb();

  const locations = await db
    .select({ id: location.id, name: location.name })
    .from(location)
    .orderBy(asc(location.name));

  if (locations.length === 0) return [];

  const gameRows = await db.select({ locationId: game.locationId }).from(game);
  const gamesPlayedByLocation = new Map<string, number>();
  for (const row of gameRows) {
    if (!row.locationId) continue;
    gamesPlayedByLocation.set(row.locationId, (gamesPlayedByLocation.get(row.locationId) ?? 0) + 1);
  }

  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    gamesPlayed: gamesPlayedByLocation.get(l.id) ?? 0,
  }));
}
