/**
 * The players index and player page — PRD criteria 132–136.
 *
 * Mirrors `lib/games/queries.ts`'s shape and conventions: pure read queries,
 * no caching, winners always derived from `game_player.final_score` at read
 * time (criterion 129 — nothing here is a stored total).
 */

import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster } from "@/lib/db/schema";
import { compareDisplayNames, determineWinners, rosterDisplayName, type PlayerScore } from "@/lib/scoring";

export interface PlayerListItem {
  id: string;
  displayName: string;
  gamesPlayed: number;
}

/** Every player, including one on zero games (criterion 132). Alphabetical. */
export async function listPlayers(): Promise<PlayerListItem[]> {
  const db = getDb();

  const players = await db.select({ id: player.id, displayName: player.displayName }).from(player);

  if (players.length === 0) return [];

  const counts = await db
    .select({ playerId: gamePlayer.playerId, gameId: gamePlayer.gameId })
    .from(gamePlayer);

  const gamesPlayedByPlayer = new Map<string, number>();
  for (const row of counts) {
    gamesPlayedByPlayer.set(row.playerId, (gamesPlayedByPlayer.get(row.playerId) ?? 0) + 1);
  }

  return players
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      gamesPlayed: gamesPlayedByPlayer.get(p.id) ?? 0,
    }))
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));
}

export interface PlayerPageGame {
  gameId: string;
  playedOn: string;
  /** Null renders as "No location", matching the games list. */
  locationName: string | null;
  rosterId: string;
  rosterName: string;
  /** This player's own final score in this game. */
  finalScore: number;
  isWinner: boolean;
}

export interface PlayerPage {
  id: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  /**
   * wins / gamesPlayed, as a fraction (0–1) — `null` when `gamesPlayed` is 0,
   * since there is no sample to state a rate against (criterion 136). Round
   * to one decimal place of a *percentage* at render time (criterion 133);
   * this stays a plain fraction so the frontend controls the formatting.
   */
  winRate: number | null;
  /** Newest first (criterion 133). */
  games: PlayerPageGame[];
}

/** `null` when no such player exists (a 404, not an empty state). */
export async function getPlayerPage(id: string): Promise<PlayerPage | null> {
  const db = getDb();

  const playerRow = (
    await db.select({ id: player.id, displayName: player.displayName }).from(player).where(eq(player.id, id))
  )[0];
  if (!playerRow) return null;

  const participations = await db
    .select({ gameId: gamePlayer.gameId })
    .from(gamePlayer)
    .where(eq(gamePlayer.playerId, id));

  if (participations.length === 0) {
    return {
      id: playerRow.id,
      displayName: playerRow.displayName,
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    };
  }

  const gameIds = participations.map((p) => p.gameId);

  const gameRows = await db
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
    .where(inArray(game.id, gameIds))
    .orderBy(desc(game.playedOn), desc(game.createdAt));

  const allPlayersInThoseGames = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(inArray(gamePlayer.gameId, gameIds));

  const byGame = new Map<string, typeof allPlayersInThoseGames>();
  for (const row of allPlayersInThoseGames) {
    const arr = byGame.get(row.gameId) ?? [];
    arr.push(row);
    byGame.set(row.gameId, arr);
  }

  let wins = 0;
  const games: PlayerPageGame[] = gameRows.map((g) => {
    const gamePlayers = byGame.get(g.id) ?? [];
    const scores: PlayerScore[] = gamePlayers.map((p) => ({ playerId: p.playerId, score: p.finalScore }));
    // ⚠️ Criterion 134: a shared win counts in full for each player it belongs
    // to — `determineWinners` already returns every tied holder, so simply
    // checking membership in that set (rather than "was I the only one")
    // gives every winner of a shared game a win, with no special-casing here.
    const winnerIds = new Set(determineWinners(scores));
    const isWinner = winnerIds.has(id);
    if (isWinner) wins += 1;

    const mine = gamePlayers.find((p) => p.playerId === id)!;

    return {
      gameId: g.id,
      playedOn: g.playedOn,
      locationName: g.locationName,
      rosterId: g.rosterId,
      rosterName: g.rosterName ?? rosterDisplayName(gamePlayers.map((p) => p.displayName)),
      finalScore: mine.finalScore,
      isWinner,
    };
  });

  return {
    id: playerRow.id,
    displayName: playerRow.displayName,
    gamesPlayed: gameRows.length,
    wins,
    winRate: gameRows.length > 0 ? wins / gameRows.length : null,
    games,
  };
}
