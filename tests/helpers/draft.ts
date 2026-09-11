/**
 * Test-only helpers for building Stage 2 drafts against the two verified
 * fixture sheets, and for getting a sheet photo (with its S3 objects) and a
 * draft row into the database the way the real routes would.
 *
 * ⚠️ Every `DraftColumn` built here goes through `emptyDraftState`, which
 * already sets `crop: null` — never construct one by hand and forget it.
 */

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { draft as draftTable, photo, player } from "@/lib/db/schema";
import { emptyDraftState, type DraftState } from "@/lib/draft/state";
import { photoKey } from "@/lib/photos/keys";
import { writeLocalPhoto } from "@/lib/photos/local";

import type { FixtureSheet } from "../fixtures/sheets";

export interface DraftFromSheetOptions {
  photoId?: string;
  playedOn?: string;
  locationId?: string | null;
  newLocationName?: string | null;
  /** Fixture player label ("Player C") → an existing player id. Columns not
   * listed here get `newPlayerName` instead, i.e. "someone new". */
  playerIds?: Record<string, string>;
  /** Override a column's running totals by its 0-based paper-order index. */
  overrides?: Record<number, number[]>;
}

export function draftStateFromSheet(
  sheet: FixtureSheet,
  options: DraftFromSheetOptions = {},
): DraftState {
  const photoId = options.photoId ?? `photo-${randomUUID()}`;
  const columnIds = sheet.columns.map(() => `col-${randomUUID()}`);
  const state = emptyDraftState({
    photoId,
    playedOn: options.playedOn ?? "2026-09-11",
    columnIds,
  });

  state.locationId = options.locationId ?? null;
  state.newLocationName = options.newLocationName ?? null;

  state.columns.forEach((column, i) => {
    const fixtureColumn = sheet.columns[i]!;
    const existingId = options.playerIds?.[fixtureColumn.player];
    if (existingId) {
      column.playerId = existingId;
    } else {
      column.newPlayerName = fixtureColumn.player;
    }
    column.sheetName = fixtureColumn.player;

    const values = options.overrides?.[i] ?? fixtureColumn.runningTotals;
    values.forEach((value, index) => {
      column.manualEdits[String(index)] = value;
    });
  });

  return state;
}

/** Insert real `player` rows, keyed by fixture label ("Player C" → its id). */
export async function createPlayers(
  labels: readonly string[],
): Promise<Record<string, string>> {
  const db = getDb();
  const ids: Record<string, string> = {};
  for (const label of labels) {
    const id = `player-${randomUUID()}`;
    await db.insert(player).values({
      id,
      displayName: label,
      slug: `${label.toLowerCase().replace(/\s+/g, "-")}-${id.slice(-8)}`,
    });
    ids[label] = id;
  }
  return ids;
}

export interface SheetPhotoOptions {
  draftId?: string | null;
  /** Write both fake JPEG objects to the local driver. Default true. */
  withObjects?: boolean;
  /** Write only the original, not the model, object. */
  missingModel?: boolean;
}

/** A `photo` row (kind='sheet'), with fake bytes in the local driver by default. */
export async function createSheetPhoto(
  photoId: string,
  options: SheetPhotoOptions = {},
): Promise<void> {
  await getDb()
    .insert(photo)
    .values({
      id: photoId,
      kind: "sheet",
      draftId: options.draftId ?? null,
      s3KeyOriginal: photoKey(photoId, "original"),
      s3KeyModel: photoKey(photoId, "model"),
    });

  if (options.withObjects === false) return;
  await writeLocalPhoto(photoId, "original", Buffer.from("fake-original-jpeg"));
  if (!options.missingModel) {
    await writeLocalPhoto(photoId, "model", Buffer.from("fake-model-jpeg"));
  }
}

/** A `draft` row, with its photo linked, the way `POST /api/drafts` leaves it. */
export async function createDraft(state: DraftState): Promise<string> {
  const db = getDb();
  const draftId = `draft-${randomUUID()}`;
  const now = new Date().toISOString();

  await db.insert(draftTable).values({
    id: draftId,
    stateJson: JSON.stringify(state),
    createdAt: now,
    updatedAt: now,
  });
  await db.update(photo).set({ draftId }).where(eq(photo.id, state.photoId));

  return draftId;
}

/** The whole thing at once: photo (with objects), draft, linked together. */
export async function setUpDraft(
  sheet: FixtureSheet,
  options: DraftFromSheetOptions & { photoOptions?: SheetPhotoOptions } = {},
): Promise<{ draftId: string; state: DraftState }> {
  const state = draftStateFromSheet(sheet, options);
  await createSheetPhoto(state.photoId, options.photoOptions);
  const draftId = await createDraft(state);
  return { draftId, state };
}
