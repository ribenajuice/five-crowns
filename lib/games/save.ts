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
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

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
import { describeError, log } from "@/lib/log";

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

/**
 * ⚠️ Security review MEDIUM 2: a client-supplied `playerId` or `locationId`
 * that doesn't resolve to a real, usable row. Mapped to 422 by the route,
 * same status as `InvalidGridError` — it's the same family of "this save
 * cannot go ahead" failure, just discovered a step later.
 */
export class InvalidReferenceError extends Error {
  override name = "InvalidReferenceError";
  constructor(
    public readonly kind: "player" | "location",
    public readonly id: string,
  ) {
    super(`That ${kind} no longer exists. Pick again.`);
  }
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
  if (state.locationId) {
    // ⚠️ Security review MEDIUM 2: a client-supplied id, looked up for real.
    const found = (
      await tx.select().from(location).where(eq(location.id, state.locationId))
    )[0];
    if (!found) throw new InvalidReferenceError("location", state.locationId);
    return state.locationId;
  }
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
 * Resolve every column to a player id.
 *
 * - An existing player (`column.playerId`) is looked up for real and must
 *   exist with no `merged_into_id` (security review MEDIUM 2).
 * - A pending name (`column.newPlayerName`) resolves by `name_key` against an
 *   existing player first — ⚠️ security review LOW 4: without this, retyping
 *   an existing player's name as "someone new" minted a second row for the
 *   same person — and only creates one when no match exists, grouped by
 *   `nameKey` so two columns with the same new name share one new player.
 *
 * `assertNoDuplicatePlayers`, called on the result, is what turns a name that
 * resolves onto a player already used in another column into `duplicate_player`
 * (criterion: caught *after* resolution, because before it a pending name and
 * an existing player's id are different `columnPlayerKey`s and look distinct).
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
      const found = (
        await tx.select().from(player).where(eq(player.id, column.playerId))
      )[0];
      if (!found || found.mergedIntoId) {
        throw new InvalidReferenceError("player", column.playerId);
      }
      playerId = column.playerId;
    } else if (column.newPlayerName) {
      const key = nameKey(column.newPlayerName);
      const cached = newPlayerIdByKey.get(key);
      if (cached) {
        playerId = cached;
      } else {
        const existing = (
          await tx.select().from(player).where(eq(player.nameKey, key))
        )[0];
        if (existing) {
          playerId = existing.id;
        } else {
          const newId = randomUUID();
          await tx
            .insert(player)
            .values({
              id: newId,
              displayName: column.newPlayerName.trim(),
              slug: uniqueSlug(column.newPlayerName),
              nameKey: key,
            })
            .onConflictDoNothing({ target: player.nameKey });

          const row = (
            await tx.select().from(player).where(eq(player.nameKey, key))
          )[0];
          playerId = (row?.id as string) ?? newId;
        }
        newPlayerIdByKey.set(key, playerId);
      }
    } else {
      // validateGrid's unassigned_column check already rejected this shape.
      throw new Error("A column reached resolution with no player.");
    }

    resolved.push({ column, playerId });
  }

  return resolved;
}

/**
 * ⚠️ Security review LOW 4. Genuinely reachable now that pending names
 * resolve against existing players: an existing player picked directly in one
 * column and typed as "someone new" (in a name that resolves to them) in
 * another now collide here rather than earlier, since their `columnPlayerKey`s
 * — `id:x` versus `new:namekey` — look different until resolution.
 */
function assertNoDuplicatePlayers(resolved: ResolvedColumn[]): void {
  const seenAt = new Map<string, string>();
  for (const { column, playerId } of resolved) {
    const firstColumnId = seenAt.get(playerId);
    if (firstColumnId) {
      throw new InvalidGridError({
        ok: false,
        columns: {},
        issues: [
          {
            code: "duplicate_player",
            message:
              "The same player is picked for more than one column. Pick a different player for each.",
            indices: [],
            columnIds: [firstColumnId, column.id],
          },
        ],
      });
    }
    seenAt.set(playerId, column.id);
  }
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
