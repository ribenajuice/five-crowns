/**
 * `saveGame` — the Stage 2 save transaction.
 *
 * `docs/ARCHITECTURE.md` § "The save" is the prose version; this is the
 * executable one. Called from `POST /api/games`.
 *
 * Order of operations, exactly as the contract describes:
 *   0. Persist `state` to the draft (whatever happens next, corrections typed
 *      just before pressing save are never lost).
 *   1. Check the sheet photo exists, **before** the transaction (criteria 9, 10).
 *   2. Re-validate the grid server-side — never trust the client's checks.
 *   3. One transaction: resolve-or-create the location and players, upsert the
 *      roster on its signature, insert the game and its rows, link the photo
 *      and the draft.
 *
 * ⚠️ **Idempotent.** A draft that has already been saved returns its `gameId`
 * without touching the database again. The race between two concurrent saves
 * of the same draft is closed *inside* the transaction with a conditional
 * update on `photo.game_id IS NULL`; `photo_one_sheet_per_game` is the
 * database-level backstop.
 *
 * ⚠️ **Security review, MEDIUM 2.** `state.columns[].playerId` and
 * `state.locationId` are client-supplied ids — a crafted request could name
 * an id that was never actually offered by `GET /api/players` or
 * `GET /api/locations`, or one belonging to a player already merged away
 * (Milestone 2). Every such id is looked up inside the transaction and the
 * save is refused (422) if it doesn't resolve to a real, non-merged row.
 * `PRAGMA foreign_keys = ON` is also attempted as defence in depth — see the
 * comment at its call site for why it's best-effort, not the guarantee.
 *
 * ⚠️ **M2 Stage 2 dispatch.** A draft carrying `editing_game_id` is an edit of
 * an existing game, not a new one — `saveEditedGame` (`lib/games/save-edit.ts`)
 * owns that whole transaction. This file dispatches to it right after its own
 * `savedGameId` idempotency check and otherwise runs exactly as M1 left it.
 * `docs/DECISIONS.md`, 2026-09-14, "Editing a saved game".
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  draft as draftTable,
  game,
  gamePlayer,
  photo,
  roundScore,
} from "@/lib/db/schema";
import { toGridColumns, type DraftState } from "@/lib/draft/state";
import { getPhotoStorage } from "@/lib/photos";
import { deriveHandScores, finalScore, validateGrid } from "@/lib/scoring";
import { describeError, log } from "@/lib/log";

import {
  assertNoDuplicatePlayers,
  nowIso,
  resolveLocation,
  resolvePlayers,
  upsertRoster,
  DraftNotFoundError,
  InvalidGridError,
  InvalidReferenceError,
  MissingPhotoError,
  type SaveGameResult,
} from "./resolve";
import { saveEditedGame } from "./save-edit";

// Re-exported so existing imports (`app/api/games/route.ts`, the test suite)
// keep working unchanged now that these live in `lib/games/resolve.ts`.
export { DraftNotFoundError, InvalidGridError, InvalidReferenceError, MissingPhotoError };
export type { SaveGameResult };

/** Race-guard sentinel: thrown inside the transaction, caught just outside it. */
class ConcurrentSaveError extends Error {
  override name = "ConcurrentSaveError";
}

export async function saveGame(
  draftId: string,
  state: DraftState,
): Promise<SaveGameResult> {
  const db = getDb();

  const existing = (
    await db.select().from(draftTable).where(eq(draftTable.id, draftId))
  )[0];
  if (!existing) throw new DraftNotFoundError(draftId);

  if (existing.savedGameId) {
    return {
      gameId: existing.savedGameId,
      alreadySaved: true,
      wasEdit: existing.editingGameId !== null,
    };
  }

  // M2 Stage 2: an edit draft never runs the new-game path below — it updates
  // the game it names in place. `docs/ARCHITECTURE.md` § "The edit".
  if (existing.editingGameId) {
    return saveEditedGame(existing, state);
  }

  // Step 0 — persist the state, whatever happens next.
  await db
    .update(draftTable)
    .set({ stateJson: JSON.stringify(state), updatedAt: nowIso() })
    .where(eq(draftTable.id, draftId));

  // Step 1 — the photo, before the transaction (criteria 9, 10).
  const sheetPhoto = (
    await db
      .select()
      .from(photo)
      .where(and(eq(photo.draftId, draftId), eq(photo.kind, "sheet")))
  )[0];
  if (!sheetPhoto) throw new MissingPhotoError("No sheet photo for this draft.");

  const storage = getPhotoStorage();
  const [hasOriginal, hasModel] = await Promise.all([
    storage.objectExists(sheetPhoto.id, "original"),
    storage.objectExists(sheetPhoto.id, "model"),
  ]);
  if (!hasOriginal || !hasModel) {
    throw new MissingPhotoError("The sheet photo is missing an object in storage.");
  }

  // Step 2 — re-validate and re-derive server-side. Never trust the client.
  const gridColumns = toGridColumns(state);
  const validation = validateGrid(gridColumns);
  if (!validation.ok) throw new InvalidGridError(validation);

  const valuesByColumnId = new Map(gridColumns.map((c) => [c.id, c.values]));
  const orderedColumns = [...state.columns].sort((a, b) => a.order - b.order);

  // ⚠️ Best-effort defence in depth (security review MEDIUM 2), not the
  // guarantee — SQLite treats `PRAGMA foreign_keys` as a no-op once a
  // transaction has begun, so it has to run out here, on `db`, before
  // `db.transaction()` opens one. Whether that setting actually survives
  // into the transaction that follows depends on the connection persisting
  // across both calls, which the native driver (tests, local dev) does and
  // Turso's HTTP driver may not. Failure is swallowed and logged; the
  // explicit `InvalidReferenceError` checks below are what actually enforces
  // this, on every driver, every time.
  try {
    await db.run(sql`PRAGMA foreign_keys = ON`);
  } catch (error) {
    log.warn("games.save.pragma_foreign_keys_failed", describeError(error));
  }

  try {
    const gameId = await db.transaction(async (tx) => {
      // Guard the double-submit race: re-check inside the transaction.
      const fresh = (
        await tx.select().from(draftTable).where(eq(draftTable.id, draftId))
      )[0];
      if (fresh?.savedGameId) {
        throw new AlreadySavedInTransaction(fresh.savedGameId);
      }

      const locationId = await resolveLocation(tx, state);
      const resolved = await resolvePlayers(tx, orderedColumns);
      assertNoDuplicatePlayers(resolved);

      const memberIds = resolved.map((r) => r.playerId);
      const rosterId = await upsertRoster(tx, memberIds);

      const newGameId = randomUUID();
      await tx.insert(game).values({
        id: newGameId,
        playedOn: state.playedOn,
        locationId,
        rosterId,
      });

      for (const { column, playerId } of resolved) {
        const values = valuesByColumnId.get(column.id) ?? [];
        const handScores = deriveHandScores(values);
        const final = finalScore(values);
        if (final === null) {
          // Cannot happen: validateGrid already rejected any column with an
          // unread or missing final cell. Defensive, not reachable in tests.
          throw new InvalidGridError(validation);
        }

        await tx.insert(gamePlayer).values({
          gameId: newGameId,
          playerId,
          columnOrder: column.order,
          sheetName: column.sheetName,
          finalScore: final,
        });

        await tx.insert(roundScore).values(
          values.map((value, index) => ({
            gameId: newGameId,
            playerId,
            hand: index + 1,
            runningTotal: value as number,
            score: handScores[index] as number,
          })),
        );

        // PRD criterion 71: every close-up taken during review attaches to
        // this game and the player its column resolved to — including one
        // whose reading was later rejected (it's still evidence of what the
        // paper said, same reasoning as the sheet photo). `draft_column_id`
        // was set at upload time (`POST /api/uploads`, kind:'column'); a
        // draft can be edited after a close-up is taken (reassign the
        // player, reorder), so this resolves it fresh here rather than
        // trusting anything decided when the photo was shot.
        //
        // ⚠️ Security review: `column.id` comes from the request body
        // (`state`), so the WHERE is scoped to `draftId` too — otherwise a
        // crafted save naming another draft's column id could re-parent that
        // draft's close-ups onto this game. `isNull(gameId)` also stops this
        // from ever re-parenting a photo already attached to a previously
        // saved game.
        await tx
          .update(photo)
          .set({ gameId: newGameId, playerId })
          .where(
            and(
              eq(photo.draftColumnId, column.id),
              eq(photo.kind, "column"),
              eq(photo.draftId, draftId),
              isNull(photo.gameId),
            ),
          );
      }

      // PRD criterion 71, continued: a close-up whose *column* was removed
      // by a structural repair (`removeColumn` in `lib/ui/draft-edits.ts`)
      // before save. `removeColumn` is pure client-side draft-state editing
      // — it has no way to touch the `photo` table, and shouldn't, since the
      // photo is still real evidence of what the paper said even though the
      // column it was shot for no longer exists in this save. Rather than
      // leaving it orphaned forever (draftColumnId pointing at nothing,
      // gameId/playerId null forever), attach it to this game with a null
      // playerId — the game view already renders a close-up under a
      // fallback label when it can't resolve a player for it. Scoped to
      // `draftId` and `isNull(gameId)` for the same reasons as the loop
      // above.
      const survivingColumnIds = orderedColumns.map((c) => c.id);
      await tx
        .update(photo)
        .set({ gameId: newGameId })
        .where(
          survivingColumnIds.length > 0
            ? and(
                eq(photo.kind, "column"),
                eq(photo.draftId, draftId),
                isNull(photo.gameId),
                notInArray(photo.draftColumnId, survivingColumnIds),
              )
            : and(eq(photo.kind, "column"), eq(photo.draftId, draftId), isNull(photo.gameId)),
        );

      // Conditional: the backstop for a concurrent save of the same draft.
      const photoLink = await tx
        .update(photo)
        .set({ gameId: newGameId })
        .where(and(eq(photo.id, sheetPhoto.id), isNull(photo.gameId)));
      if ((photoLink.rowsAffected ?? 0) === 0) {
        throw new ConcurrentSaveError();
      }

      await tx
        .update(draftTable)
        .set({ savedGameId: newGameId })
        .where(eq(draftTable.id, draftId));

      return newGameId;
    });

    log.info("games.saved", { draftId, gameId });
    return { gameId, alreadySaved: false };
  } catch (error) {
    if (error instanceof AlreadySavedInTransaction) {
      return { gameId: error.gameId, alreadySaved: true };
    }
    if (error instanceof ConcurrentSaveError) {
      // Someone else's save landed first. Ours rolled back in full; theirs is
      // the real one — read it back.
      const winner = (
        await db.select().from(draftTable).where(eq(draftTable.id, draftId))
      )[0];
      if (winner?.savedGameId) {
        return { gameId: winner.savedGameId, alreadySaved: true };
      }
    }
    throw error;
  }
}

/** Race-guard sentinel: thrown inside the transaction, caught just outside it. */
class AlreadySavedInTransaction extends Error {
  override name = "AlreadySavedInTransaction";
  constructor(public readonly gameId: string) {
    super("This draft was saved by a concurrent request.");
  }
}
