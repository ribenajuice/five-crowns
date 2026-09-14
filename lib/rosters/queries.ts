/**
 * The rosters index and roster page — PRD criteria 137–139.
 *
 * Same shape and conventions as `lib/games/queries.ts` and
 * `lib/players/queries.ts`: pure read queries, winners always derived at read
 * time, nothing cached.
 */

import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster, rosterMember } from "@/lib/db/schema";
import { compareDisplayNames, determineWinners, rosterDisplayName, type PlayerScore } from "@/lib/scoring";

export interface RosterMemberRow {
  playerId: string;
  displayName: string;
}

/**
 * Every roster's members, by roster id, for however many rosters exist.
 * Shared by the index, the page and the rename duplicate check
 * (`lib/rosters/rename.ts`) so all three agree on what a roster's members are.
 */
export async function membersByRoster(): Promise<Map<string, RosterMemberRow[]>> {
  const db = getDb();
  const rows = await db
    .select({
      rosterId: rosterMember.rosterId,
      playerId: rosterMember.playerId,
      displayName: player.displayName,
    })
    .from(rosterMember)
    .innerJoin(player, eq(rosterMember.playerId, player.id));

  const byRoster = new Map<string, RosterMemberRow[]>();
  for (const row of rows) {
    const arr = byRoster.get(row.rosterId) ?? [];
    arr.push({ playerId: row.playerId, displayName: row.displayName });
    byRoster.set(row.rosterId, arr);
  }
  return byRoster;
}

/** `roster.name` if custom, else the auto-name built from its members. */
export function effectiveRosterName(
  rosterRow: { name: string | null },
  members: RosterMemberRow[],
): string {
  return rosterRow.name ?? rosterDisplayName(members.map((m) => m.displayName));
}

export interface RosterListItem {
  id: string;
  /** Custom name, or `null` if this roster is still on its auto-name. */
  name: string | null;
  displayName: string;
  members: string[];
  gamesPlayed: number;
}

/** Only rosters with at least one game (criterion 137). Alphabetical by display name. */
export async function listRosters(): Promise<RosterListItem[]> {
  const db = getDb();

  const gameCounts = await db.select({ rosterId: game.rosterId }).from(game);
  const gamesPlayedByRoster = new Map<string, number>();
  for (const row of gameCounts) {
    gamesPlayedByRoster.set(row.rosterId, (gamesPlayedByRoster.get(row.rosterId) ?? 0) + 1);
  }

  const rosterIdsWithGames = [...gamesPlayedByRoster.keys()];
  if (rosterIdsWithGames.length === 0) return [];

  const rosterRows = await db
    .select({ id: roster.id, name: roster.name })
    .from(roster)
    .where(inArray(roster.id, rosterIdsWithGames));

  const byRoster = await membersByRoster();

  const items = rosterRows.map((r): RosterListItem => {
    const members = byRoster.get(r.id) ?? [];
    return {
      id: r.id,
      name: r.name,
      displayName: effectiveRosterName(r, members),
      members: members.map((m) => m.displayName),
      gamesPlayed: gamesPlayedByRoster.get(r.id) ?? 0,
    };
  });

  return items.sort((a, b) => compareDisplayNames(a.displayName, b.displayName));
}

export interface RosterPageMember {
  playerId: string;
  displayName: string;
  wins: number;
  /** wins / gamesPlayed, a fraction — this roster's games only (criterion 138). */
  winRate: number;
}

export interface RosterPageGame {
  gameId: string;
  playedOn: string;
  locationName: string | null;
  winners: string[];
}

export interface RosterPage {
  id: string;
  name: string | null;
  displayName: string;
  members: RosterPageMember[];
  gamesPlayed: number;
  /** Newest first. */
  games: RosterPageGame[];
}

/** `null` when no such roster exists. */
export async function getRosterPage(id: string): Promise<RosterPage | null> {
  const db = getDb();

  const rosterRow = (await db.select().from(roster).where(eq(roster.id, id)))[0];
  if (!rosterRow) return null;

  const byRoster = await membersByRoster();
  const members = byRoster.get(id) ?? [];
  const displayName = effectiveRosterName(rosterRow, members);

  const gameRows = await db
    .select({ id: game.id, playedOn: game.playedOn, locationName: location.name })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .where(eq(game.rosterId, id))
    .orderBy(desc(game.playedOn), desc(game.createdAt));

  const gameIds = gameRows.map((g) => g.id);
  const gamePlayerRows =
    gameIds.length === 0
      ? []
      : await db
          .select({
            gameId: gamePlayer.gameId,
            playerId: gamePlayer.playerId,
            finalScore: gamePlayer.finalScore,
          })
          .from(gamePlayer)
          .where(inArray(gamePlayer.gameId, gameIds));

  const byGame = new Map<string, typeof gamePlayerRows>();
  for (const row of gamePlayerRows) {
    const arr = byGame.get(row.gameId) ?? [];
    arr.push(row);
    byGame.set(row.gameId, arr);
  }

  const winsByPlayer = new Map<string, number>();
  const games: RosterPageGame[] = gameRows.map((g) => {
    const rows = byGame.get(g.id) ?? [];
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    const winnerIds = determineWinners(scores);
    for (const winnerId of winnerIds) {
      winsByPlayer.set(winnerId, (winsByPlayer.get(winnerId) ?? 0) + 1);
    }
    const winnerNames = winnerIds
      .map((wid) => members.find((m) => m.playerId === wid)?.displayName)
      .filter((name): name is string => Boolean(name));

    return {
      gameId: g.id,
      playedOn: g.playedOn,
      locationName: g.locationName,
      winners: winnerNames,
    };
  });

  const gamesPlayed = gameRows.length;
  const memberStats: RosterPageMember[] = members.map((m) => {
    const wins = winsByPlayer.get(m.playerId) ?? 0;
    return {
      playerId: m.playerId,
      displayName: m.displayName,
      wins,
      winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    };
  });

  return {
    id: rosterRow.id,
    name: rosterRow.name,
    displayName,
    members: memberStats,
    gamesPlayed,
    games,
  };
}
