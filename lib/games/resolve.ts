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

import { eq } from "drizzle-orm";

import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { schema } from "@/lib/db";
import { location, player, roster, rosterMember } from "@/lib/db/schema";
import { nameKey, type DraftColumn, type DraftState } from "@/lib/draft/state";
import { rosterSignature } from "@/lib/scoring";
import type { GridValidation } from "@/lib/scoring";

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
export async function resolvePlayers(
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
