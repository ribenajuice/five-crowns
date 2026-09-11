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
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { getDb, schema } from "@/lib/db";
import {
  draft as draftTable,
  game,
  gamePlayer,
  location,
  photo,
  player,
  roster,
  rosterMember,
  roundScore,
} from "@/lib/db/schema";
import {
  nameKey,
  toGridColumns,
  type DraftColumn,
  type DraftState,
} from "@/lib/draft/state";
import { getPhotoStorage } from "@/lib/photos";
import {
  deriveHandScores,
  finalScore,
  rosterSignature,
  validateGrid,
  type GridValidation,
} from "@/lib/scoring";
import { log } from "@/lib/log";

import { uniqueSlug } from "./slug";

export class DraftNotFoundError extends Error {
  override name = "DraftNotFoundError";
}

export class InvalidGridError extends Error {
  override name = "InvalidGridError";
  constructor(public readonly validation: GridValidation) {
    super("The grid fails a hard check and cannot be saved.");
  }
}

export class MissingPhotoError extends Error {
  override name = "MissingPhotoError";
}

export interface SaveGameResult {
  gameId: string;
  /** True when this call found an already-saved draft rather than saving it. */
  alreadySaved: boolean;
}

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
    return { gameId: existing.savedGameId, alreadySaved: true };
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
      }

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

function nowIso(): string {
  // Matches the schema's own default: strftime('%Y-%m-%dT%H:%M:%fZ','now').
  return new Date().toISOString();
}

/** The `tx` handle `db.transaction(async (tx) => ...)` hands its callback. */
type Tx = Parameters<
  Parameters<LibSQLDatabase<typeof schema>["transaction"]>[0]
>[0];

async function resolveLocation(
  tx: Tx,
  state: DraftState,
): Promise<string | null> {
  if (state.locationId) return state.locationId;
  if (!state.newLocationName) return null;

  const key = nameKey(state.newLocationName);
  const found = (
    await tx.select().from(location).where(eq(location.nameKey, key))
  )[0];
  if (found) return found.id as string;

  const id = randomUUID();
  await tx
    .insert(location)
    .values({
      id,
      name: state.newLocationName.trim(),
      slug: uniqueSlug(state.newLocationName),
      nameKey: key,
    })
    .onConflictDoNothing({ target: location.nameKey });

  const row = (
    await tx.select().from(location).where(eq(location.nameKey, key))
  )[0];
  return (row?.id as string) ?? id;
}

interface ResolvedColumn {
  column: DraftColumn;
  playerId: string;
}

/**
 * Resolve every column to a player id, creating one player row per distinct
 * pending name (grouped by `nameKey`, so retyping the same new name in two
 * columns creates one player, not two — though `validateGrid`'s
 * `duplicate_player` check, run just before this, already rejects that shape
 * via `columnPlayerKey`). Then re-check for duplicates, defensively.
 */
async function resolvePlayers(
  tx: Tx,
  orderedColumns: DraftColumn[],
): Promise<ResolvedColumn[]> {
  const newPlayerIdByKey = new Map<string, string>();
  const resolved: ResolvedColumn[] = [];

  for (const column of orderedColumns) {
    let playerId: string;

    if (column.playerId) {
      playerId = column.playerId;
    } else if (column.newPlayerName) {
      const key = nameKey(column.newPlayerName);
      const cached = newPlayerIdByKey.get(key);
      if (cached) {
        playerId = cached;
      } else {
        playerId = randomUUID();
        await tx.insert(player).values({
          id: playerId,
          displayName: column.newPlayerName.trim(),
          slug: uniqueSlug(column.newPlayerName),
        });
        newPlayerIdByKey.set(key, playerId);
      }
    } else {
      // validateGrid's unassigned_column check already rejected this shape.
      throw new Error("A column reached resolution with no player.");
    }

    resolved.push({ column, playerId });
  }

  const seen = new Set<string>();
  for (const { playerId } of resolved) {
    if (seen.has(playerId)) {
      throw new Error("duplicate_player survived validation — this is a bug.");
    }
    seen.add(playerId);
  }

  return resolved;
}

async function upsertRoster(tx: Tx, memberIds: string[]): Promise<string> {
  const signature = rosterSignature(memberIds);
  const uniqueMembers = [...new Set(memberIds)];

  const found = (
    await tx.select().from(roster).where(eq(roster.signature, signature))
  )[0];
  if (found) return found.id as string;

  const id = randomUUID();
  await tx
    .insert(roster)
    .values({ id, signature, size: uniqueMembers.length, name: null })
    .onConflictDoNothing({ target: roster.signature });

  const row = (
    await tx.select().from(roster).where(eq(roster.signature, signature))
  )[0];
  const rosterId = (row?.id as string) ?? id;

  await tx
    .insert(rosterMember)
    .values(uniqueMembers.map((playerId) => ({ rosterId, playerId })))
    .onConflictDoNothing();

  return rosterId;
}
