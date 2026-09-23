/**
 * Shared resolvers between the two things that write a `game` row:
 * `saveGame` (`lib/games/save.ts`, a new game) and `saveEditedGame`
 * (`lib/games/save-edit.ts`, an edit of an existing one).
 *
 * `docs/DECISIONS.md`, 2026-09-14, "Editing a saved game": moved out of
 * `save.ts` unchanged so the two paths can never drift apart on how a
 * location or player id resolves, or how a roster is upserted — criterion
 * 118's re-match is exactly `upsertRoster`, called by both.
 *
 * Pure database logic: no photo handling, no grid validation, nothing that
 * differs between "insert a game" and "update one in place". That part stays
 * in each caller.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { schema } from "@/lib/db";
import {
  gamePlayer,
  location,
  photo,
  player,
  roster,
  rosterMember,
  roundScore,
} from "@/lib/db/schema";
import { nameKey, type DraftColumn, type DraftState } from "@/lib/draft/state";
import { deriveHandScores, finalScore, rosterSignature } from "@/lib/scoring";
import type { CellValue, GridValidation } from "@/lib/scoring";

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
  /**
   * True for a draft with `editingGameId` set — the route answers 200 rather
   * than 201 either way, because nothing was ever created (criterion 123 /
   * "The edit — correcting a saved game").
   */
  wasEdit?: boolean;
}

export function nowIso(): string {
  // Matches the schema's own default: strftime('%Y-%m-%dT%H:%M:%fZ','now').
  return new Date().toISOString();
}

/** The `tx` handle `db.transaction(async (tx) => ...)` hands its callback. */
export type Tx = Parameters<
  Parameters<LibSQLDatabase<typeof schema>["transaction"]>[0]
>[0];

export async function resolveLocation(
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

export interface ResolvedColumn {
  column: DraftColumn;
  playerId: string;
}

/**
 * Resolve every column to a player id.
 *
 * - An existing player (`column.playerId`) is looked up for real and must
 *   still exist (security review MEDIUM 2). A player merged away
 *   (`lib/players/merge.ts`) is hard-deleted, so this is the same "not found"
 *   check either way — there is no separate "exists but merged away" state.
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
 *
 * ⚠️ Save-latency fix (`docs/PRD.md` "Bug 1 — Save looks frozen", criterion
 * 320): this used to be a per-column loop doing up to two awaited round trips
 * each — the round-trip count grew with the number of players. It now does a
 * fixed, small number of round trips regardless of table size: one batched
 * lookup for every client-supplied `playerId`, one batched lookup for every
 * pending name's `nameKey`, and — only if any pending name is genuinely
 * new — one batched insert plus one batched re-read (the same
 * insert-then-re-read shape the per-column loop used, for the same reason:
 * `onConflictDoNothing` means the id that actually landed on a `nameKey` race
 * might not be the id this call generated). Every `InvalidReferenceError` and
 * every dedup/creation rule below is unchanged; only the number of statements
 * it takes to enforce them is.
 *
 * ⚠️ Code review (2026-09-23): the client-id lookup and the nameKey lookup
 * below are independent and now run via `Promise.all` rather than two
 * sequential `await`s — `docs/DECISIONS.md`, "Promise.all inside
 * db.transaction()" has the full evidence, in short: verified against the
 * actual `@libsql/client/http` + `drizzle-orm/libsql/http` stack this app
 * runs (instrumented fake `fetch`, not a guess) that this driver always talks
 * Hrana **v2** (no version negotiation call is ever made — see
 * `@libsql/hrana-client`'s `openHttp(..., protocolVersion = 2)`), where every
 * statement after a transaction's opening one must wait on that opening
 * statement's own round trip before it's even allowed onto the wire (v2 has
 * no `isAutocommit` guard for the client to skip that wait, unlike v3) — but
 * once that wait is over, statements issued in the same tick land in the
 * driver's stream queue together and get coalesced into a single pipelined
 * HTTP request. `resolveLocation` always runs immediately before this
 * function (`save.ts`, `save-edit.ts`), so that wait is already satisfied by
 * the time these two lookups run — measured: 2 round trips sequential, 1 via
 * `Promise.all`. The trade-off: the nameKey lookup now always runs even when
 * the id lookup is about to fail `InvalidReferenceError` below, instead of
 * being skipped on that (rare) error path — a harmless extra read inside a
 * transaction that's about to roll back anyway.
 */
export async function resolvePlayers(
  tx: Tx,
  orderedColumns: DraftColumn[],
): Promise<ResolvedColumn[]> {
  // Existing players, referenced by a client-supplied id — one lookup for
  // every id in the table, not one per column.
  const uniquePlayerIds = [...new Set(orderedColumns.flatMap((c) => (c.playerId ? [c.playerId] : [])))];

  // Pending names — grouped by `nameKey` so two columns with the same new
  // name still share one new player, exactly as the per-column cache did.
  // Computed up front (pure, in-memory) so its lookup below can run
  // alongside the id lookup rather than after it.
  const nameKeyByColumnId = new Map<string, string>();
  const nameByKey = new Map<string, string>();
  for (const column of orderedColumns) {
    if (column.playerId || !column.newPlayerName) continue;
    const key = nameKey(column.newPlayerName);
    nameKeyByColumnId.set(column.id, key);
    // First occurrence wins, same as the old cache's first insert.
    if (!nameByKey.has(key)) nameByKey.set(key, column.newPlayerName);
  }
  const pendingNameKeys = [...nameByKey.keys()];

  const [existingPlayerRows, existingNameRows] = await Promise.all([
    uniquePlayerIds.length > 0
      ? tx.select({ id: player.id }).from(player).where(inArray(player.id, uniquePlayerIds))
      : Promise.resolve([]),
    pendingNameKeys.length > 0
      ? tx.select().from(player).where(inArray(player.nameKey, pendingNameKeys))
      : Promise.resolve([]),
  ]);

  const existingPlayerIds = new Set<string>();
  for (const row of existingPlayerRows) existingPlayerIds.add(row.id as string);
  // Checked in column order so the id reported on a bad reference matches
  // what the old per-column loop would have thrown first.
  for (const column of orderedColumns) {
    if (column.playerId && !existingPlayerIds.has(column.playerId)) {
      throw new InvalidReferenceError("player", column.playerId);
    }
  }

  const newPlayerIdByKey = new Map<string, string>();
  for (const row of existingNameRows) {
    newPlayerIdByKey.set(row.nameKey, row.id);
  }

  if (pendingNameKeys.length > 0) {
    const missingKeys = pendingNameKeys.filter((key) => !newPlayerIdByKey.has(key));
    if (missingKeys.length > 0) {
      const toInsert = missingKeys.map((key) => {
        const name = nameByKey.get(key)!;
        return {
          id: randomUUID(),
          displayName: name.trim(),
          slug: uniqueSlug(name),
          nameKey: key,
        };
      });

      await tx.insert(player).values(toInsert).onConflictDoNothing({ target: player.nameKey });

      // No defensive fallback needed here (and none present): every key in
      // `missingKeys` was just inserted by us, or already exists because our
      // `onConflictDoNothing` hit someone else's row for that `nameKey` —
      // either way a row with that exact `nameKey` now exists, and this
      // `SELECT` runs on the same transaction/connection right after that
      // `INSERT`, so there is no visibility gap in which it could be missing.
      const resolvedRows = await tx
        .select()
        .from(player)
        .where(inArray(player.nameKey, missingKeys));
      for (const row of resolvedRows) {
        newPlayerIdByKey.set(row.nameKey, row.id);
      }
    }
  }

  const resolved: ResolvedColumn[] = [];
  for (const column of orderedColumns) {
    let playerId: string;

    if (column.playerId) {
      playerId = column.playerId;
    } else if (column.newPlayerName) {
      const key = nameKeyByColumnId.get(column.id)!;
      playerId = newPlayerIdByKey.get(key)!;
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
export function assertNoDuplicatePlayers(resolved: ResolvedColumn[]): void {
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

export async function upsertRoster(tx: Tx, memberIds: string[]): Promise<string> {
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

export interface WriteGameRowsInput {
  /** The game these rows belong to — a fresh id for `saveGame`, the existing one for `saveEditedGame`. */
  gameId: string;
  /** Whose close-up uploads to re-parent — always this draft's own. */
  draftId: string;
  resolved: ResolvedColumn[];
  valuesByColumnId: Map<string, readonly CellValue[]>;
  orderedColumns: DraftColumn[];
  /** Only used to re-throw with full context in the "cannot happen" branch below. */
  validation: GridValidation;
}

/**
 * The per-column `game_player`/`round_score` insert loop and the close-up
 * re-parenting sweep, shared by `saveGame` (a new game) and `saveEditedGame`
 * (an edit of an existing one) — previously duplicated near-verbatim between
 * `lib/games/save.ts` and `lib/games/save-edit.ts`. Extracted here for the
 * same reason `resolveLocation`/`resolvePlayers`/`upsertRoster` already are:
 * one implementation the two save paths can never drift apart on.
 *
 * ⚠️ Deliberately does **not** include the two paths' genuine differences:
 * `saveEditedGame` deletes existing `round_score`/`game_player` rows before
 * calling this (a fresh insert has nothing to delete); `saveGame` inserts the
 * `game` row itself and links the sheet photo with its own concurrent-save
 * guard. Those stay in each caller.
 *
 * ⚠️ Save-latency fix (`docs/PRD.md` "Bug 1 — Save looks frozen", criterion
 * 320): this used to insert `game_player`, insert `round_score` and update
 * `photo` once per column — three round trips per player. All three are now
 * a single batched statement across every resolved column: one multi-row
 * `game_player` insert, one multi-row `round_score` insert, and one `UPDATE
 * photo ... CASE` that sets each matching row's `player_id` from the column
 * it belongs to. `assertNoDuplicatePlayers` (already run on `resolved` before
 * this is called, in both `saveGame` and `saveEditedGame`) is what keeps the
 * `(game_id, player_id)` primary key safe for a multi-row insert. The
 * per-column validity check (`final === null`) stays a plain in-memory loop —
 * it never touched the database.
 *
 * ⚠️ Code review (2026-09-23): the `game_player` insert, the `round_score`
 * insert and the `photo` `CASE` update below are independent (different
 * target rows, no read of one feeding a write to another) and now run via
 * `Promise.all` rather than three sequential `await`s. `docs/DECISIONS.md`,
 * "Promise.all inside db.transaction()" has the full evidence — this is the
 * same finding as `resolvePlayers`' two lookups above, but a bigger win here:
 * by this point in a save, several earlier statements
 * (`resolveLocation`/`resolvePlayers`/`upsertRoster`) have already completed
 * inside this same transaction, so the Hrana v2 "wait for the opening
 * statement" restriction that blocks coalescing on the very first statement
 * of a transaction is long since satisfied. Measured against the real
 * `@libsql/client/http` driver with an instrumented fake `fetch`: 3
 * statements issued after that point cost 3 round trips sequential, 1 via
 * `Promise.all`.
 */
export async function writeGameRows(tx: Tx, input: WriteGameRowsInput): Promise<void> {
  const { gameId, draftId, resolved, valuesByColumnId, orderedColumns, validation } = input;

  const gamePlayerRows: (typeof gamePlayer.$inferInsert)[] = [];
  const roundScoreRows: (typeof roundScore.$inferInsert)[] = [];

  for (const { column, playerId } of resolved) {
    const values = valuesByColumnId.get(column.id) ?? [];
    const handScores = deriveHandScores(values);
    const final = finalScore(values);
    if (final === null) {
      // Cannot happen: validateGrid already rejected any column with an
      // unread or missing final cell. Defensive, not reachable in tests.
      throw new InvalidGridError(validation);
    }

    gamePlayerRows.push({
      gameId,
      playerId,
      columnOrder: column.order,
      sheetName: column.sheetName,
      finalScore: final,
    });

    for (const [index, value] of values.entries()) {
      roundScoreRows.push({
        gameId,
        playerId,
        hand: index + 1,
        runningTotal: value as number,
        score: handScores[index] as number,
      });
    }
  }

  // PRD criterion 71: every close-up taken during review (import or edit)
  // attaches to this game and the player its column resolved to. One
  // statement for every resolved column, rather than one per column: the
  // `WHERE` already scopes to exactly this draft's surviving column ids, and
  // the `CASE` picks the right `player_id` for whichever of those columns a
  // given photo row actually belongs to.
  //
  // ⚠️ Security review: `column.id` comes from the request body (`state`),
  // so the WHERE is scoped to `draftId` too — otherwise a crafted save
  // naming another draft's column id could re-parent that draft's
  // close-ups onto this game. `isNull(gameId)` also stops this from ever
  // re-parenting a photo already attached to a previously saved game.
  //
  // These three writes target disjoint rows (`game_player`, `round_score`,
  // and `photo` respectively — and nothing here reads back what another one
  // of the three just wrote), so they run concurrently rather than one
  // after another; see the doc comment above for why that's a genuine
  // latency win with this driver, not just style.
  const closingWrites: Promise<unknown>[] = [];
  if (gamePlayerRows.length > 0) {
    closingWrites.push(tx.insert(gamePlayer).values(gamePlayerRows));
  }
  if (roundScoreRows.length > 0) {
    closingWrites.push(tx.insert(roundScore).values(roundScoreRows));
  }
  if (resolved.length > 0) {
    const columnIds = resolved.map(({ column }) => column.id);
    const playerIdCase = sql.join(
      resolved.map(({ column, playerId }) => sql`WHEN ${column.id} THEN ${playerId}`),
      sql` `,
    );

    closingWrites.push(
      tx
        .update(photo)
        .set({
          gameId,
          playerId: sql`(CASE ${photo.draftColumnId} ${playerIdCase} END)`,
        })
        .where(
          and(
            inArray(photo.draftColumnId, columnIds),
            eq(photo.kind, "column"),
            eq(photo.draftId, draftId),
            isNull(photo.gameId),
          ),
        ),
    );
  }
  await Promise.all(closingWrites);

  // PRD criterion 71, continued: a close-up whose *column* was removed by a
  // structural repair before save still attaches to this game, with a null
  // playerId — the game view already renders a fallback label for it.
  const survivingColumnIds = orderedColumns.map((c) => c.id);
  await tx
    .update(photo)
    .set({ gameId })
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
}
