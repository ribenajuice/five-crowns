/**
 * `startEditDraft` — `POST /api/games/{id}/edit`.
 *
 * `docs/ARCHITECTURE.md` § "The edit — correcting a saved game", "Starting an
 * edit"; `docs/DECISIONS.md`, 2026-09-14, "Editing a saved game", decision 2.
 *
 * Resumes the open edit draft for a game if one exists (criterion 121: press
 * "Edit this game" again after the tab was evicted and the half-finished
 * corrections are still there), or builds a fresh one from the game's own
 * rows — the running totals a human already verified against the paper, not
 * a re-read of anything.
 *
 * ⚠️ `photo.draft_id` is **not** touched. The review screen has never loaded
 * its photo any other way than `state.photoId` (`GET /api/photos/{id}/url`),
 * so naming the game's existing sheet photo in the new draft's state is the
 * whole story — no photo-table change, no re-link.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  draft as draftTable,
  game,
  gamePlayer,
  photo,
  roundScore,
} from "@/lib/db/schema";
import { DRAFT_STATE_VERSION, type DraftState } from "@/lib/draft/state";
import { HANDS_PER_GAME } from "@/lib/scoring";

import { nowIso, MissingPhotoError } from "./resolve";

// Re-exported for callers that only need this module's error classes.
export { MissingPhotoError };

export class GameNotFoundError extends Error {
  override name = "GameNotFoundError";
  constructor(public readonly gameId: string) {
    super("That game doesn't exist.");
  }
}

export interface StartEditResult {
  draftId: string;
  /** False when an already-open edit draft was resumed rather than created. */
  created: boolean;
}

export async function startEditDraft(gameId: string): Promise<StartEditResult> {
  const db = getDb();

  // Resume: the fast, common path once a first edit is underway.
  const openDraft = await findOpenEditDraft(gameId);
  if (openDraft) return { draftId: openDraft, created: false };

  const gameRow = (await db.select().from(game).where(eq(game.id, gameId)))[0];
  if (!gameRow) throw new GameNotFoundError(gameId);

  const sheetPhotoRow = (
    await db
      .select()
      .from(photo)
      .where(and(eq(photo.gameId, gameId), eq(photo.kind, "sheet")))
  )[0];
  if (!sheetPhotoRow) {
    // The review screen without its photo is not the screen criterion 115
    // asks for — refused rather than built half-working.
    throw new MissingPhotoError("This game has no sheet photo to edit against.");
  }

  const gamePlayerRows = await db
    .select()
    .from(gamePlayer)
    .where(eq(gamePlayer.gameId, gameId))
    .orderBy(gamePlayer.columnOrder);

  const roundRows = await db
    .select()
    .from(roundScore)
    .where(eq(roundScore.gameId, gameId))
    .orderBy(roundScore.hand);

  const totalsByPlayer = new Map<string, number[]>();
  for (const row of roundRows) {
    const arr = totalsByPlayer.get(row.playerId) ?? [];
    arr[row.hand - 1] = row.runningTotal;
    totalsByPlayer.set(row.playerId, arr);
  }

  const state: DraftState = {
    version: DRAFT_STATE_VERSION,
    photoId: sheetPhotoRow.id,
    playedOn: gameRow.playedOn,
    locationId: gameRow.locationId,
    newLocationName: null,
    columns: gamePlayerRows.map((row, index) => {
      const totals = totalsByPlayer.get(row.playerId) ?? Array(HANDS_PER_GAME).fill(null);
      const manualEdits: Record<string, number | null> = {};
      for (let i = 0; i < HANDS_PER_GAME; i++) {
        manualEdits[String(i)] = totals[i] ?? null;
      }
      return {
        id: `col-${randomUUID()}`,
        order: index,
        playerId: row.playerId,
        newPlayerName: null,
        sheetName: row.sheetName,
        activeReadingId: null,
        readings: [],
        manualEdits,
        crop: null,
      };
    }),
  };

  const draftId = randomUUID();
  const now = nowIso();

  // ⚠️ The actual race guard: `draft_one_open_edit_per_game` (the migration
  // in `lib/db/migrations/0003_draft_editing_game.sql`) refuses a second
  // concurrent insert for the same game. Plain `INSERT`, not
  // `onConflictDoNothing` — SQLite's own upsert grammar only allows a `WHERE`
  // clause naming a partial index's predicate *before* `DO NOTHING`, and
  // drizzle's sqlite dialect emits it after, which is invalid SQL for this
  // exact shape (a partial unique index with no ordinary columns to target).
  // A rejected insert is caught below and treated as "lost the race" — the
  // safe assumption either way, since the only thing that could make this
  // particular insert fail is that unique index.
  try {
    await db.insert(draftTable).values({
      id: draftId,
      stateJson: JSON.stringify(state),
      editingGameId: gameId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    const winner = await findOpenEditDraft(gameId);
    if (winner) return { draftId: winner, created: false };
    // Some other failure entirely (not the race this catch exists for) —
    // never silently swallow it.
    throw error;
  }

  return { draftId, created: true };
}

async function findOpenEditDraft(gameId: string): Promise<string | null> {
  const row = (
    await getDb()
      .select({ id: draftTable.id })
      .from(draftTable)
      .where(and(eq(draftTable.editingGameId, gameId), isNull(draftTable.savedGameId)))
  )[0];
  return row?.id ?? null;
}
