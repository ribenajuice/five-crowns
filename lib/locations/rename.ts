/**
 * Location renaming — PRD criteria 145–146.
 *
 * `docs/DESIGN-SYSTEM.md` § "Places index, and renaming a location": a plain
 * rename shows everywhere the location appears; a `name_key` collision is
 * **refused**, naming the other location, with no merge offered — merging is
 * Stage 4 scope (`docs/DECISIONS.md`, 2026-09-14, "player/location merges are
 * permanent").
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { location } from "@/lib/db/schema";
import { nameKey } from "@/lib/draft/state";
import { MAX_LOCATION_NAME_LENGTH } from "@/lib/ui/constants";

export class LocationNotFoundError extends Error {
  override name = "LocationNotFoundError";
}

/** Unlike a roster, a location always needs a real name — there is no auto-name to fall back to. */
export class EmptyLocationNameError extends Error {
  override name = "EmptyLocationNameError";
}

export class LocationNameConflictError extends Error {
  override name = "LocationNameConflictError";
  constructor(public readonly other: { id: string; name: string }) {
    super(`${other.name} already has that name.`);
  }
}

export interface LocationRenameResult {
  id: string;
  name: string;
}

/**
 * Trim and cap at `MAX_LOCATION_NAME_LENGTH` (40), mirroring
 * `normaliseRosterName` in `lib/rosters/rename.ts`. Unlike a roster, a
 * location has no auto-name fallback, so an all-blank result is an error
 * (see `EmptyLocationNameError`), never a silent clear.
 */
function normaliseLocationName(raw: string): string {
  return raw.trim().slice(0, MAX_LOCATION_NAME_LENGTH).trim();
}

/**
 * @throws {LocationNotFoundError} if `id` doesn't name a real location.
 * @throws {EmptyLocationNameError} if the trimmed (and length-capped) name is blank.
 * @throws {LocationNameConflictError} if another location already has this
 *   `name_key` — refused, never merged (criterion 146).
 */
export async function renameLocation(id: string, rawName: string): Promise<LocationRenameResult> {
  const db = getDb();

  const trimmed = normaliseLocationName(rawName);
  if (trimmed.length === 0) throw new EmptyLocationNameError();

  const existing = (await db.select().from(location).where(eq(location.id, id)))[0];
  if (!existing) throw new LocationNotFoundError();

  const key = nameKey(trimmed);
  const collision = (
    await db.select().from(location).where(eq(location.nameKey, key))
  ).find((row) => row.id !== id);
  if (collision) throw new LocationNameConflictError({ id: collision.id, name: collision.name });

  await db
    .update(location)
    .set({ name: trimmed, nameKey: key })
    .where(eq(location.id, id));

  return { id, name: trimmed };
}
