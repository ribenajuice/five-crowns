/**
 * `saveEditedGame` — the Stage 2 edit-save transaction.
 *
 * `docs/ARCHITECTURE.md` § "The edit — correcting a saved game" is the prose
 * version; `docs/DECISIONS.md`, 2026-09-14, "Editing a saved game" is the full
 * reasoning. This is the executable one. Dispatched from `saveGame`
 * (`lib/games/save.ts`) whenever the draft being saved carries a non-null
 * `editingGameId` — the same route, `POST /api/games`, the same body.
 *
 * Order of operations. Mostly mirrors `saveGame` step for step so the two can
 * be read side by side, but ⚠️ **steps 0 and 1 are swapped relative to
 * `saveGame`, deliberately**: `saveGame` resolves its sheet photo by
 * `draft_id`, so a bogus `state.photoId` there is inert and persisting first
 * is harmless; this path checks `state.photoId` itself, so it must be
 * validated *before* anything is written — see step 1's comment at its call
 * site for why persisting a mismatched `photoId` first would be a permanent,
 * self-inflicted dead end for this draft.
 *   1. Find the sheet photo **by `game_id = editingGameId` and `kind='sheet'`**
 *      — not by `draft_id`, which this draft never owns — check both S3
 *      objects, and refuse if `state.photoId` names anything else (criterion
 *      120: the sheet photo can never be replaced).
 *   0. Persist `state` to the draft, now that its `photoId` is confirmed.
 *   2. Re-validate and re-derive server-side, exactly like a new save.
 *   3. One transaction: resolve-or-create the location and players, upsert the
 *      roster on the new exact set, update the game's three mutable columns
 *      (with the deleted-game race guard baked into that same UPDATE),
 *      replace every `game_player`/`round_score` row, re-attach any close-ups
 *      taken during the edit, null the `player_id` of a close-up whose player
 *      left the game, and mark the draft saved.
 *
 * ⚠️ **Nothing here inserts a `game` row.** The id given at "Edit this game"
 * is the id that comes back, and nothing marks the game as edited — no
 * `created_at` touch, no flag, no ordering change (criterion 123).
 */

import "server-only";

import { and, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  draft as draftTable,
  game,
  gamePlayer,
  photo,
  roundScore,
  type Draft,
} from "@/lib/db/schema";
import { toGridColumns, type DraftState } from "@/lib/draft/state";
import { getPhotoStorage } from "@/lib/photos";
import { validateGrid } from "@/lib/scoring";
import { describeError, log } from "@/lib/log";

import {
  assertNoDuplicatePlayers,
  nowIso,
  resolveLocation,
  resolvePlayers,
  upsertRoster,
  writeGameRows,
  InvalidGridError,
  MissingPhotoError,
  type SaveGameResult,
} from "./resolve";

/**
 * PRD criterion 122: the game this edit draft names was deleted meanwhile.
 * Thrown inside the transaction (via the conditional `UPDATE game`'s
 * `rowsAffected === 0`), caught just outside it, mapped by the route to a
 * `409 game_deleted`. Nothing is inserted on this path, so there is no way for
 * it to resurrect the game.
 */
export class GameDeletedError extends Error {
  override name = "GameDeletedError";
  constructor(public readonly gameId: string) {
    super("This game was already deleted.");
  }
}

/** Race-guard sentinel: thrown inside the transaction, caught just outside it. */
class ConcurrentEditSaveError extends Error {
  override name = "ConcurrentEditSaveError";
}

export async function saveEditedGame(
  existingDraft: Draft,
  state: DraftState,
): Promise<SaveGameResult> {
  const db = getDb();
  const draftId = existingDraft.id;
  const gameId = existingDraft.editingGameId;
  if (!gameId) {
    // Unreachable from `saveGame`'s dispatch, which only calls this with a
    // non-null `editingGameId` — defensive, not exercised by any test.
    throw new Error("saveEditedGame called on a draft with no editingGameId.");
  }

  // Step 1 — the sheet photo, before the transaction **and before anything is
  // persisted**. ⚠️ Security review: this used to run after "step 0" wrote
  // the incoming `state` to `draft.state_json` unconditionally — a single
  // crafted request with a wrong `photoId` would persist that mismatch, and
  // since `PUT /api/drafts/{id}`'s immutability guard compares any future
  // update against whatever's already stored, the draft could never be fixed
  // again (every retry hits the same `MissingPhotoError`, and "resume the
  // open edit" would just keep finding the same broken draft). Checking
  // `state.photoId` — the incoming value, never anything already written —
  // before the first write closes that off: a refused save now leaves
  // `draft.state_json` exactly as it was. By `game_id`, not `draft_id`: an
  // edit draft never owns the sheet photo row (criterion 120).
  //
  // ⚠️ There used to be a separate, earlier "is the game still there at all"
  // read here, ahead of this one — a fast, friendly check meant only to
  // avoid reporting a concurrently-deleted game (which also deletes its
  // photo row, criterion 126) as a confusing "missing photo". Two
  // non-transactional reads with a gap between them is itself a race: a
  // delete landing in that gap produced exactly the misreport the check
  // existed to prevent. This lookup is now the *only* non-transactional read
  // before the transaction; if it comes back empty, the game's existence is
  // re-checked right here, in the same breath, to report the honest reason.
  // The authoritative guard for a delete that lands after this point either
  // way remains the in-transaction `rowsAffected === 0` check on
  // `UPDATE game` below — this is only about giving a truthful message in
  // the race window, not a new correctness guarantee.
  const sheetPhoto = (
    await db
      .select()
      .from(photo)
      .where(and(eq(photo.gameId, gameId), eq(photo.kind, "sheet")))
  )[0];
  if (!sheetPhoto) {
    const stillExists = (
      await db.select({ id: game.id }).from(game).where(eq(game.id, gameId))
    )[0];
    if (!stillExists) throw new GameDeletedError(gameId);
    throw new MissingPhotoError("This game has no sheet photo to save with.");
  }
  if (sheetPhoto.id !== state.photoId) {
    // ⚠️ The sheet photo can never be replaced during an edit. The front end
    // has no control that would produce this; a direct API call is the only
    // way to reach it.
    throw new MissingPhotoError("The sheet photo can't be changed.");
  }

  const storage = getPhotoStorage();
  const [hasOriginal, hasModel] = await Promise.all([
    storage.objectExists(sheetPhoto.id, "original"),
    storage.objectExists(sheetPhoto.id, "model"),
  ]);
  if (!hasOriginal || !hasModel) {
    throw new MissingPhotoError("The sheet photo is missing an object in storage.");
  }

  // Step 0 — now that the incoming state's photoId is confirmed to match the
  // game's real sheet photo, persist it. Still "whatever happens next" from
  // here on: a grid that fails re-validation below still keeps the typed
  // correction rather than losing it.
  await db
    .update(draftTable)
    .set({ stateJson: JSON.stringify(state), updatedAt: nowIso() })
    .where(eq(draftTable.id, draftId));

  // Step 2 — re-validate and re-derive server-side. Never trust the client.
  const gridColumns = toGridColumns(state);
  const validation = validateGrid(gridColumns);
  if (!validation.ok) throw new InvalidGridError(validation);

  const valuesByColumnId = new Map(gridColumns.map((c) => [c.id, c.values]));
  const orderedColumns = [...state.columns].sort((a, b) => a.order - b.order);

  // ⚠️ Best-effort defence in depth (security review MEDIUM 2), not the
  // guarantee — same pattern, same reasoning as `saveGame`'s own call site
  // (`lib/games/save.ts`): SQLite treats `PRAGMA foreign_keys` as a no-op
  // once a transaction has begun, so it has to run out here, on `db`, before
  // `db.transaction()` opens one, and whether it survives into that
  // transaction depends on the connection persisting across both calls.
  // Failure is swallowed and logged; the explicit `InvalidReferenceError`
  // checks inside `resolveLocation`/`resolvePlayers` are what actually
  // enforces this, on every driver, every time.
  try {
    await db.run(sql`PRAGMA foreign_keys = ON`);
  } catch (error) {
    log.warn("games.edit_save.pragma_foreign_keys_failed", describeError(error));
  }

  try {
    await db.transaction(async (tx) => {
      const locationId = await resolveLocation(tx, state);
      const resolved = await resolvePlayers(tx, orderedColumns);
      assertNoDuplicatePlayers(resolved);

      const memberIds = resolved.map((r) => r.playerId);
      const rosterId = await upsertRoster(tx, memberIds);

      // ⚠️ Exactly three columns. Not `created_at`, not `note` — criterion
      // 123 says nothing marks a game as edited, and `created_at` is the
      // games list's tiebreaker (touching it would reorder the list, which
      // is a badge by another name). The `rowsAffected` check IS criterion
      // 122's existence check: a real `UPDATE … WHERE id = :id`, not a
      // separate SELECT-then-UPDATE, which would have its own race.
      const gameUpdate = await tx
        .update(game)
        .set({ playedOn: state.playedOn, locationId, rosterId })
        .where(eq(game.id, gameId));
      if ((gameUpdate.rowsAffected ?? 0) === 0) {
        throw new GameDeletedError(gameId);
      }

      // Criterion 119: replace every round row. `(game_id, player_id)` and
      // `(game_id, player_id, hand)` are the primary keys, so a player who
      // left the game by criterion 118 has rows no UPDATE could reach —
      // delete-then-insert, not upsert.
      await tx.delete(roundScore).where(eq(roundScore.gameId, gameId));
      await tx.delete(gamePlayer).where(eq(gamePlayer.gameId, gameId));

      // The per-column `game_player`/`round_score` insert loop and the
      // close-up re-parenting sweeps — shared with `saveGame` (PRD criterion
      // 71). See `writeGameRows` in `lib/games/resolve.ts`. The two rows'
      // worth of `delete`s just above are this path's genuine difference
      // (nothing to delete on a fresh save) and stay here.
      await writeGameRows(tx, {
        gameId,
        draftId,
        resolved,
        valuesByColumnId,
        orderedColumns,
        validation,
      });

      // ⚠️ The one honest limitation documented in the ADR: a close-up shot
      // on an *earlier* visit to this game (import or a previous edit) whose
      // player is no longer in the game (criterion 118's player set changed)
      // loses its `player_id` rather than naming somebody not in the game —
      // it degrades to the fallback label the game view already renders for
      // an unattributed close-up. It cannot fix two players *swapped*
      // between columns; each keeps the other's old attribution.
      await tx
        .update(photo)
        .set({ playerId: null })
        .where(
          memberIds.length > 0
            ? and(
                eq(photo.gameId, gameId),
                eq(photo.kind, "column"),
                isNotNull(photo.playerId),
                notInArray(photo.playerId, memberIds),
              )
            : and(eq(photo.gameId, gameId), eq(photo.kind, "column"), isNotNull(photo.playerId)),
        );

      // Conditional: the concurrent-save guard. Whoever's `UPDATE` lands
      // first wins; a second concurrent save of this same draft finds
      // `rowsAffected === 0` and rolls back everything it just did.
      const draftUpdate = await tx
        .update(draftTable)
        .set({ savedGameId: gameId })
        .where(and(eq(draftTable.id, draftId), isNull(draftTable.savedGameId)));
      if ((draftUpdate.rowsAffected ?? 0) === 0) {
        throw new ConcurrentEditSaveError();
      }
    });

    log.info("games.edit_saved", { draftId, gameId });
    return { gameId, alreadySaved: false, wasEdit: true };
  } catch (error) {
    if (error instanceof ConcurrentEditSaveError) {
      // Someone else's save of this same draft landed first. Ours rolled
      // back in full; theirs is the real one.
      const winner = (
        await db.select().from(draftTable).where(eq(draftTable.id, draftId))
      )[0];
      if (winner?.savedGameId) {
        return { gameId: winner.savedGameId, alreadySaved: true, wasEdit: true };
      }
    }
    throw error;
  }
}
