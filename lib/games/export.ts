/**
 * The score CSV's grain and columns — the founder's own copy of the numbers
 * (PRD "Decisions taken in this spec" item 8; criteria 102-109).
 *
 * One row per player per game, wide: the eleven running totals and eleven
 * derived hands as columns. Deliberately reuses the same joins and the same
 * scoring functions (`determineWinners`, `rosterDisplayName`) as
 * `lib/games/queries.ts` — the file the games list and the game view are
 * built from — so the download and the screen can never disagree (criterion
 * 105).
 *
 * ⚠️ **Permanent criterion 107**: this module touches only
 * `game`/`game_player`/`round_score`/`player`/`roster`/`location`. None of
 * those tables ever holds a secret (`lib/db/schema.ts`'s header comment), so
 * an export built from this query cannot contain the Anthropic key, either
 * password hash, the session secret or an SSM parameter value — true by
 * construction, and re-checked by a grep test in `tests/api/export.test.ts`
 * on every future change to this file or the route that calls it.
 */

import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  game,
  gamePlayer,
  location,
  player,
  roster,
  roundScore,
} from "@/lib/db/schema";
import { determineWinners, rosterDisplayName, type PlayerScore } from "@/lib/scoring";
import { HANDS_PER_GAME } from "@/lib/scoring/constants";

/** Columns, in the exact order PRD criterion 103 specifies. */
export const EXPORT_COLUMNS = [
  "game_id",
  "played_on",
  "location",
  "roster_name",
  "roster_size",
  "player_name",
  "column_order",
  "sheet_name",
  "final_score",
  "is_winner",
  ...Array.from({ length: HANDS_PER_GAME }, (_, i) => `rt_${i + 1}`),
  ...Array.from({ length: HANDS_PER_GAME }, (_, i) => `hand_${i + 1}`),
] as const;

/**
 * The only four columns that carry free text typed by a human — a location,
 * a roster name, a player's display name, the handwritten sheet name — as
 * opposed to an id, a date, a count or a derived score the app computes
 * itself. Every other column is charset-restricted or numeric by construction
 * and cannot open with a spreadsheet formula-injection character. Derived
 * from {@link EXPORT_COLUMNS} rather than hardcoded so a future reordering of
 * the columns can't silently stop defusing the right ones (`csv.ts`'s
 * `csvSafeTextField`, called via `buildCsv`'s `unsafeTextIndices`).
 */
export const UNSAFE_TEXT_COLUMN_INDICES = new Set(
  (["location", "roster_name", "player_name", "sheet_name"] as const).map((name) =>
    EXPORT_COLUMNS.indexOf(name),
  ),
);

export interface ExportRow {
  gameId: string;
  playedOn: string;
  /** "" when the game has no location — never "No location" (criterion 105). */
  location: string;
  /** `roster.name`, or the same auto-name the app displays (criterion 105). */
  rosterName: string;
  rosterSize: number;
  playerName: string;
  columnOrder: number;
  /** The handwritten name as transcribed. "" when none was recorded. */
  sheetName: string;
  finalScore: number;
  /** True on every row of a shared win, never just one (criterion 106). */
  isWinner: boolean;
  /** Exactly `HANDS_PER_GAME` stored running totals, in hand order. */
  runningTotals: number[];
  /** Exactly `HANDS_PER_GAME` stored derived hand scores, in hand order. */
  handScores: number[];
}

/**
 * Every player-game row in the record, oldest game first and each game's
 * players in the paper's column order. Order is not part of the acceptance
 * criteria, just a stable, readable default for a file someone opens once a
 * quarter.
 */
export async function listExportRows(): Promise<ExportRow[]> {
  const db = getDb();

  const games = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      locationName: location.name,
      rosterName: roster.name,
      rosterSize: roster.size,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id))
    .orderBy(asc(game.playedOn), asc(game.createdAt));

  if (games.length === 0) return [];

  const gameIds = games.map((g) => g.id);

  const players = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      sheetName: gamePlayer.sheetName,
      columnOrder: gamePlayer.columnOrder,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(inArray(gamePlayer.gameId, gameIds))
    .orderBy(asc(gamePlayer.columnOrder));

  const rounds = await db
    .select({
      gameId: roundScore.gameId,
      playerId: roundScore.playerId,
      hand: roundScore.hand,
      runningTotal: roundScore.runningTotal,
      score: roundScore.score,
    })
    .from(roundScore)
    .where(inArray(roundScore.gameId, gameIds))
    .orderBy(asc(roundScore.hand));

  const roundsByGamePlayer = new Map<string, { runningTotal: number; score: number }[]>();
  for (const r of rounds) {
    const key = `${r.gameId}:${r.playerId}`;
    const arr = roundsByGamePlayer.get(key) ?? [];
    arr[r.hand - 1] = { runningTotal: r.runningTotal, score: r.score };
    roundsByGamePlayer.set(key, arr);
  }

  const playersByGame = new Map<string, typeof players>();
  for (const p of players) {
    const arr = playersByGame.get(p.gameId) ?? [];
    arr.push(p);
    playersByGame.set(p.gameId, arr);
  }

  const rows: ExportRow[] = [];
  for (const g of games) {
    const gamePlayers = (playersByGame.get(g.id) ?? []).sort(
      (a, b) => a.columnOrder - b.columnOrder,
    );
    const scores: PlayerScore[] = gamePlayers.map((p) => ({
      playerId: p.playerId,
      score: p.finalScore,
    }));
    const winnerIds = new Set(determineWinners(scores));
    const rosterName = g.rosterName ?? rosterDisplayName(gamePlayers.map((p) => p.displayName));

    for (const p of gamePlayers) {
      const playerRounds = roundsByGamePlayer.get(`${g.id}:${p.playerId}`) ?? [];
      rows.push({
        gameId: g.id,
        playedOn: g.playedOn,
        location: g.locationName ?? "",
        rosterName,
        rosterSize: g.rosterSize,
        playerName: p.displayName,
        columnOrder: p.columnOrder,
        sheetName: p.sheetName ?? "",
        finalScore: p.finalScore,
        isWinner: winnerIds.has(p.playerId),
        runningTotals: Array.from(
          { length: HANDS_PER_GAME },
          (_, i) => playerRounds[i]?.runningTotal ?? 0,
        ),
        handScores: Array.from(
          { length: HANDS_PER_GAME },
          (_, i) => playerRounds[i]?.score ?? 0,
        ),
      });
    }
  }

  return rows;
}

/** One `ExportRow` flattened into the CSV's exact column order. */
export function exportRowToCsvValues(row: ExportRow): (string | number | boolean)[] {
  return [
    row.gameId,
    row.playedOn,
    row.location,
    row.rosterName,
    row.rosterSize,
    row.playerName,
    row.columnOrder,
    row.sheetName,
    row.finalScore,
    row.isWinner,
    ...row.runningTotals,
    ...row.handScores,
  ];
}
