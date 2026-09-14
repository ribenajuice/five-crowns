/**
 * The places index — PRD criterion 140.
 *
 * Every location, including one that has never hosted a game — it must still
 * be listed with a 0 count and still be pickable on the review screen, which
 * this query change does nothing to affect (`GET /api/locations` is untouched).
 */

import "server-only";

import { eq } from "drizzle-orm";

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

  const locations = await db.select({ id: location.id, name: location.name }).from(location);

  if (locations.length === 0) return [];

  const gameRows = await db.select({ locationId: game.locationId }).from(game);
  const gamesPlayedByLocation = new Map<string, number>();
  for (const row of gameRows) {
    if (!row.locationId) continue;
    gamesPlayedByLocation.set(row.locationId, (gamesPlayedByLocation.get(row.locationId) ?? 0) + 1);
  }

  return locations
    .map((l) => ({
      id: l.id,
      name: l.name,
      gamesPlayed: gamesPlayedByLocation.get(l.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * One place by id, with its own games-played count — `null` for a made-up id
 * (a 404, same rule every other id-addressed page in this app follows).
 * Stage 4: the merge-picker and merge-confirm screens (PRD criteria 163–166)
 * need exactly this, and there is no place page to otherwise reuse.
 */
export async function getPlace(id: string): Promise<PlaceListItem | null> {
  const db = getDb();

  const row = (
    await db.select({ id: location.id, name: location.name }).from(location).where(eq(location.id, id))
  )[0];
  if (!row) return null;

  const gameRows = await db
    .select({ locationId: game.locationId })
    .from(game)
    .where(eq(game.locationId, id));

  return { id: row.id, name: row.name, gamesPlayed: gameRows.length };
}
