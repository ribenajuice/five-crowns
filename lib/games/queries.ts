/**
 * The two read queries behind the games list and the game view.
 *
 * `docs/ARCHITECTURE.md` § "The Stage 2 interface" and `lib/games/types.ts`
 * (already committed) are the contract; these functions return exactly those
 * shapes so the pages only render them.
 */

import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  game,
  gamePlayer,
  location,
  photo,
  player,
  roster,
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

/** Newest first by `played_on`, then `created_at` (criterion 69). */
export async function listGames(): Promise<GameListItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      locationName: location.name,
      rosterName: roster.name,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id))
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

  return {
    id: gameRow.id,
    playedOn: gameRow.playedOn,
    locationName: gameRow.locationName,
    rosterName,
    columns,
    winners,
    winningScore: winningScore(scores) ?? 0,
    sheetPhoto,
  };
}
