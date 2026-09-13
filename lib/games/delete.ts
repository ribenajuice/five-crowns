/**
 * `deleteGame` — Stage 2's other half of "correcting the record".
 *
 * `docs/ARCHITECTURE.md` § "The edit — correcting a saved game" and
 * `docs/DECISIONS.md`, 2026-09-14, "Editing a saved game" (Consequences) are
 * the prose; this is the executable version, called from
 * `DELETE /api/games/{id}`.
 *
 * ⚠️ **Explicit deletes, not declared cascades.** `PRAGMA foreign_keys` is
 * best-effort on Turso's HTTP driver — `lib/games/save.ts` documents this at
 * length at its own call site — so a cascade that fires in tests (the native
 * libSQL client) may silently not fire in production. Every row that must go
 * — `round_score`, `game_player`, `transcription` (for this game's photos),
 * `photo`, then `game` itself — is deleted by hand, in one transaction.
 *
 * ⚠️ **The draft-row interaction, per the ADR — read this before touching
 * either line below.** A finished draft (new-game or edit) whose
 * `saved_game_id` names this game is worthless once the game is gone, so it
 * is deleted outright. An **open** edit draft
 * (`editing_game_id = id AND saved_game_id IS NULL`) is left completely
 * alone: it has no `saved_game_id` yet, so the `WHERE saved_game_id = :id`
 * below never matches it, and a save arriving for it afterwards lands
 * cleanly on `GameDeletedError` (criterion 122) rather than "that draft
 * doesn't exist". `saved_game_id` must never be *nulled* instead of the row
 * being deleted — proven on a scratch database — because that would demote a
 * finished edit draft back into an *open* one and collide with
 * `draft_one_open_edit_per_game` the moment a fresh edit is opened for this
 * game id.
 *
 * Players, locations and rosters are never touched (criterion 126) — a
 * roster left with no games survives in the database and simply drops out of
 * the roster listings (Stage 3).
 *
 * ⚠️ **No `s3:DeleteObject`.** This function never removes an S3 object —
 * the app holds no permission to (criterion 127) — so the photo bytes remain
 * in the bucket, reachable only by someone with direct AWS access. Deleting
 * the `photo` row is what stops any app route from ever presigning a URL for
 * it again.
 */

import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  draft as draftTable,
  game,
  gamePlayer,
  photo,
  roundScore,
  transcription,
} from "@/lib/db/schema";

/** `true` if a game was actually deleted; `false` for an id that never existed. */
export async function deleteGame(gameId: string): Promise<boolean> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const existing = (await tx.select({ id: game.id }).from(game).where(eq(game.id, gameId)))[0];
    if (!existing) return false;

    const photoRows = await tx
      .select({ id: photo.id })
      .from(photo)
      .where(eq(photo.gameId, gameId));
    const photoIds = photoRows.map((row) => row.id);

    if (photoIds.length > 0) {
      await tx.delete(transcription).where(inArray(transcription.photoId, photoIds));
    }

    await tx.delete(roundScore).where(eq(roundScore.gameId, gameId));
    await tx.delete(gamePlayer).where(eq(gamePlayer.gameId, gameId));
    await tx.delete(photo).where(eq(photo.gameId, gameId));

    // Finished drafts only. An open edit draft has no `saved_game_id` and so
    // is never matched by this WHERE — see the file comment above.
    await tx.delete(draftTable).where(eq(draftTable.savedGameId, gameId));

    await tx.delete(game).where(eq(game.id, gameId));

    return true;
  });
}
