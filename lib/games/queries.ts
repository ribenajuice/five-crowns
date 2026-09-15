/**
 * The two read queries behind the games list and the game view, extended by
 * Stage 4 (criteria 262–264) with a venue and a roster filter on the list.
 *
 * `docs/ARCHITECTURE.md` § "The Stage 2 interface" and `lib/games/types.ts`
 * (already committed) are the contract; these functions return exactly those
 * shapes so the pages only render them.
 */

import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  game,
  gamePlayer,
  location,
  photo,
  player,
  roster,
  rosterMember,
  roundScore,
} from "@/lib/db/schema";
import { getPhotoStorage } from "@/lib/photos";
import {
  determineWinners,
  rosterDisplayName,
  winningScore,
  type PlayerScore,
} from "@/lib/scoring";

import type { GameColumn, GameDetail, GameListItem } from "./types";

/** A resolved `?location=` clause (criteria 262–263) — `"none"` reads as `?location=none` (criterion 251). */
export type ResolvedLocationFilter = { kind: "none" } | { kind: "venue"; id: string; name: string };

export interface ResolvedRosterFilter {
  id: string;
  name: string;
}

export interface ResolvedGamesFilter {
  /** `undefined` iff `?location=` wasn't supplied at all — distinct from "supplied but invalid" (`resolveGamesFilter` returns `null` for that). */
  location?: ResolvedLocationFilter;
  roster?: ResolvedRosterFilter;
}

export interface GamesListFilterInput {
  /** The raw `?location=` value — a location id, or the literal `"none"` (criterion 251). */
  location?: string;
  /** The raw `?roster=` value — a roster id. */
  roster?: string;
}

/**
 * Resolves and validates `?location=`/`?roster=` into a clause `listGames`
 * can filter by and a page can render a heading from (criteria 262–263).
 * ⚠️ **`null` when either supplied value doesn't resolve to a real, existing
 * location or roster** — the caller's own signal to render the app's own 404
 * rather than silently falling back to the unfiltered list, which criterion
 * 263 forbids. A value that's simply valid-but-empty (a real venue with zero
 * games, say) is not this case at all — that's `listGames`' own job, and
 * still renders through this function's ordinary, non-`null` result.
 *
 * Two bounded queries at most (one per filter actually supplied), never one
 * per candidate or a query that grows with the archive. ⚠️ **`?location=` and
 * `?roster=` resolve concurrently** (code review: neither branch reads the
 * other's result, so the combined-filter case — Stage 4's own reason this
 * function accepts both — paid up to three sequential round-trips for no
 * reason) — only the roster branch's own two queries stay sequential
 * (`memberRows` needs `rosterRow.id`).
 */
export async function resolveGamesFilter(
  input: GamesListFilterInput,
): Promise<ResolvedGamesFilter | null> {
  const [locationFilter, rosterFilter] = await Promise.all([
    resolveLocationFilter(input.location),
    resolveRosterFilter(input.roster),
  ]);

  if (locationFilter === null || rosterFilter === null) return null;
  return { location: locationFilter, roster: rosterFilter };
}

async function resolveLocationFilter(
  rawLocation: string | undefined,
): Promise<ResolvedLocationFilter | undefined | null> {
  if (rawLocation === undefined) return undefined;
  if (rawLocation === "none") return { kind: "none" };

  const db = getDb();
  const row = (
    await db.select({ id: location.id, name: location.name }).from(location).where(eq(location.id, rawLocation))
  )[0];
  if (!row) return null;
  return { kind: "venue", id: row.id, name: row.name };
}

async function resolveRosterFilter(
  rawRoster: string | undefined,
): Promise<ResolvedRosterFilter | undefined | null> {
  if (rawRoster === undefined) return undefined;

  const db = getDb();
  const rosterRow = (
    await db.select({ id: roster.id, name: roster.name }).from(roster).where(eq(roster.id, rawRoster))
  )[0];
  if (!rosterRow) return null;

  const memberRows = await db
    .select({ displayName: player.displayName })
    .from(rosterMember)
    .innerJoin(player, eq(rosterMember.playerId, player.id))
    .where(eq(rosterMember.rosterId, rosterRow.id));
  return {
    id: rosterRow.id,
    name: rosterRow.name ?? rosterDisplayName(memberRows.map((m) => m.displayName)),
  };
}

interface GamePlayerRow {
  gameId: string;
  playerId: string;
  displayName: string;
  columnOrder: number;
  finalScore: number;
}

async function gamePlayersFor(gameIds: string[]): Promise<GamePlayerRow[]> {
  if (gameIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      columnOrder: gamePlayer.columnOrder,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(inArray(gamePlayer.gameId, gameIds))
    .orderBy(gamePlayer.columnOrder);
  return rows;
}

export interface ListGamesFilter {
  location?: ResolvedLocationFilter;
  rosterId?: string;
}

/**
 * Newest first by `played_on`, then `created_at` (criterion 69) — **order,
 * row format and paging unchanged** whether or not a filter is applied
 * (criterion 262). `filter` narrows which rows this query fetches; it never
 * changes how a row renders (criterion 264: the filtered list, a record
 * drill-through and the plain list all share this one function/shape).
 *
 * `filter.location`/`filter.rosterId` are expected to already be validated
 * (`resolveGamesFilter`, above) — this function only turns an already-real
 * id into a `WHERE` clause; it does not itself decide whether an id exists.
 */
export async function listGames(filter?: ListGamesFilter): Promise<GameListItem[]> {
  const db = getDb();

  const locationCondition =
    filter?.location?.kind === "venue"
      ? eq(game.locationId, filter.location.id)
      : filter?.location?.kind === "none"
        ? isNull(game.locationId)
        : undefined;
  const rosterCondition = filter?.rosterId ? eq(game.rosterId, filter.rosterId) : undefined;

  const rows = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      locationName: location.name,
      rosterId: game.rosterId,
      rosterName: roster.name,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id))
    .where(and(locationCondition, rosterCondition))
    .orderBy(desc(game.playedOn), desc(game.createdAt));

  if (rows.length === 0) return [];

  const players = await gamePlayersFor(rows.map((r) => r.id));
  const byGame = new Map<string, GamePlayerRow[]>();
  for (const p of players) {
    const arr = byGame.get(p.gameId) ?? [];
    arr.push(p);
    byGame.set(p.gameId, arr);
  }

  return rows.map((row): GameListItem => {
    const gamePlayers = (byGame.get(row.id) ?? []).sort(
      (a, b) => a.columnOrder - b.columnOrder,
    );
    const scores: PlayerScore[] = gamePlayers.map((p) => ({
      playerId: p.playerId,
      score: p.finalScore,
    }));
    const winnerIds = new Set(determineWinners(scores));
    const winners = gamePlayers
      .filter((p) => winnerIds.has(p.playerId))
      .map((p) => p.displayName);

    return {
      id: row.id,
      playedOn: row.playedOn,
      locationName: row.locationName,
      rosterId: row.rosterId,
      rosterName: row.rosterName ?? rosterDisplayName(gamePlayers.map((p) => p.displayName)),
      winners,
      winningScore: winningScore(scores) ?? 0,
    };
  });
}

/** `null` when no such game exists. */
export async function getGame(id: string): Promise<GameDetail | null> {
  const db = getDb();

  const gameRow = (
    await db
      .select({
        id: game.id,
        playedOn: game.playedOn,
        locationName: location.name,
        rosterId: game.rosterId,
        rosterName: roster.name,
      })
      .from(game)
      .leftJoin(location, eq(game.locationId, location.id))
      .innerJoin(roster, eq(game.rosterId, roster.id))
      .where(eq(game.id, id))
  )[0];
  if (!gameRow) return null;

  const playerRows = await db
    .select({
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      sheetName: gamePlayer.sheetName,
      columnOrder: gamePlayer.columnOrder,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(eq(gamePlayer.gameId, id))
    .orderBy(gamePlayer.columnOrder);

  const roundRows = await db
    .select({
      playerId: roundScore.playerId,
      hand: roundScore.hand,
      runningTotal: roundScore.runningTotal,
      score: roundScore.score,
    })
    .from(roundScore)
    .where(eq(roundScore.gameId, id))
    .orderBy(roundScore.hand);

  const roundsByPlayer = new Map<string, { runningTotal: number; score: number }[]>();
  for (const r of roundRows) {
    const arr = roundsByPlayer.get(r.playerId) ?? [];
    arr[r.hand - 1] = { runningTotal: r.runningTotal, score: r.score };
    roundsByPlayer.set(r.playerId, arr);
  }

  const scores: PlayerScore[] = playerRows.map((p) => ({
    playerId: p.playerId,
    score: p.finalScore,
  }));
  const winnerIds = new Set(determineWinners(scores));

  const columns: GameColumn[] = playerRows.map((p) => {
    const rounds = roundsByPlayer.get(p.playerId) ?? [];
    return {
      playerId: p.playerId,
      displayName: p.displayName,
      sheetName: p.sheetName,
      columnOrder: p.columnOrder,
      runningTotals: rounds.map((r) => r.runningTotal),
      handScores: rounds.map((r) => r.score),
      finalScore: p.finalScore,
      isWinner: winnerIds.has(p.playerId),
    };
  });

  const winners = playerRows
    .filter((p) => winnerIds.has(p.playerId))
    .map((p) => p.displayName);

  const rosterName =
    gameRow.rosterName ?? rosterDisplayName(playerRows.map((p) => p.displayName));

  const sheetPhotoRow = (
    await db
      .select()
      .from(photo)
      .where(and(eq(photo.gameId, id), eq(photo.kind, "sheet")))
  )[0];

  let sheetPhoto: GameDetail["sheetPhoto"] = null;
  if (sheetPhotoRow) {
    const storage = getPhotoStorage();
    const exists = await storage.objectExists(sheetPhotoRow.id, "original");
    if (exists) {
      const presigned = await storage.presignGet(sheetPhotoRow.id, "original");
      sheetPhoto = {
        url: presigned.url,
        expiresAt: presigned.expiresAt,
        width: sheetPhotoRow.width,
        height: sheetPhotoRow.height,
      };
    }
  }

  const closeUpRows = await db
    .select()
    .from(photo)
    .where(and(eq(photo.gameId, id), eq(photo.kind, "column")))
    .orderBy(desc(photo.createdAt));

  const storage = getPhotoStorage();
  const closeUpEntries = await Promise.all(
    closeUpRows.map(async (row) => {
      // `playerId` is null when the close-up's column was removed by a
      // structural repair before save (`lib/games/save.ts`'s orphaned-photo
      // sweep) — still rendered, just with nobody to attribute it to.
      const exists = await storage.objectExists(row.id, "original");
      if (!exists) return null;
      const presigned = await storage.presignGet(row.id, "original");
      return {
        playerId: row.playerId,
        url: presigned.url,
        expiresAt: presigned.expiresAt,
        width: row.width,
        height: row.height,
      };
    }),
  );
  const closeUps: GameDetail["closeUps"] = closeUpEntries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );

  return {
    id: gameRow.id,
    playedOn: gameRow.playedOn,
    locationName: gameRow.locationName,
    rosterId: gameRow.rosterId,
    rosterName,
    columns,
    winners,
    winningScore: winningScore(scores) ?? 0,
    sheetPhoto,
    closeUps,
  };
}
