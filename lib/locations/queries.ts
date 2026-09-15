/**
 * The places index — PRD criterion 140, extended by Stage 4 with each
 * venue's own table average (criteria 259, 252) — and the venue page
 * (criteria 260–261, open question 9's answer (c)).
 *
 * Every location, including one that has never hosted a game — it must still
 * be listed with a 0 count and still be pickable on the review screen, which
 * this query change does nothing to affect (`GET /api/locations` is untouched).
 */

import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster } from "@/lib/db/schema";
import {
  averageFinalScore,
  compareDisplayNames,
  determineWinners,
  rosterDisplayName,
  venueBreakdown,
  type PlayerScore,
  type VenueParticipation,
} from "@/lib/scoring";

export interface PlaceTableAverage {
  average: number;
  gamesPlayed: number;
  /** How many final scores that average is drawn from (criterion 252's dual sample). */
  scoresCount: number;
}

export interface PlaceListItem {
  id: string;
  name: string;
  gamesPlayed: number;
  /** `null` for a never-used venue (criterion 259: the no-data string stands in, not a zero average). */
  tableAverage: PlaceTableAverage | null;
}

/**
 * Every location, alphabetical, 0-game locations included (criterion 140),
 * each with its own table average and dual sample (criterion 259). **Two
 * bounded queries, whatever the archive's size or venue count** (criterion
 * 273): every location, and every `game_player` row tagged with its game's
 * own `location_id` — grouped in memory, never a per-venue query in a loop.
 */
export async function listPlaces(): Promise<PlaceListItem[]> {
  const db = getDb();

  const locations = await db.select({ id: location.id, name: location.name }).from(location);

  if (locations.length === 0) return [];

  const scoreRows = await db
    .select({ gameId: gamePlayer.gameId, locationId: game.locationId, finalScore: gamePlayer.finalScore })
    .from(gamePlayer)
    .innerJoin(game, eq(gamePlayer.gameId, game.id));

  const gameIdsByLocation = new Map<string, Set<string>>();
  const scoresByLocation = new Map<string, number[]>();
  for (const row of scoreRows) {
    if (!row.locationId) continue;
    const ids = gameIdsByLocation.get(row.locationId) ?? new Set<string>();
    ids.add(row.gameId);
    gameIdsByLocation.set(row.locationId, ids);
    const scores = scoresByLocation.get(row.locationId) ?? [];
    scores.push(row.finalScore);
    scoresByLocation.set(row.locationId, scores);
  }

  return locations
    .map((l): PlaceListItem => {
      const gamesPlayed = gameIdsByLocation.get(l.id)?.size ?? 0;
      const scores = scoresByLocation.get(l.id) ?? [];
      const avg = averageFinalScore(scores);
      return {
        id: l.id,
        name: l.name,
        gamesPlayed,
        tableAverage: avg ? { average: avg.average, gamesPlayed, scoresCount: scores.length } : null,
      };
    })
    .sort((a, b) => compareDisplayNames(a.name, b.name));
}

/**
 * One place by id, with its own games-played count — `null` for a made-up id
 * (a 404, same rule every other id-addressed page in this app follows).
 * Stage 4: the merge-picker and merge-confirm screens (PRD criteria 163–166)
 * need exactly this, and there is no place page to otherwise reuse.
 */
export async function getPlace(id: string): Promise<PlaceListItem | null> {
  const db = getDb();

  const row = (
    await db.select({ id: location.id, name: location.name }).from(location).where(eq(location.id, id))
  )[0];
  if (!row) return null;

  const gameRows = await db
    .select({ locationId: game.locationId })
    .from(game)
    .where(eq(game.locationId, id));

  return { id: row.id, name: row.name, gamesPlayed: gameRows.length, tableAverage: null };
}

/* ------------------------------------------------- the venue page (259-261) */

export interface VenuePagePlayerRow {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  /** `wins / gamesPlayed`, a fraction 0–1. */
  winRate: number;
  average: number;
}

/** In `GameRowProps`'s own shape (`components/GameRow.tsx`) minus `locationName` — implicit on this venue's own page, same convention `RosterPageGame` already uses for a roster's own redundant self-reference. */
export interface VenuePageGame {
  id: string;
  playedOn: string;
  rosterId: string;
  rosterName: string;
  winners: string[];
}

export interface VenuePage {
  id: string;
  name: string;
  gamesPlayed: number;
  /** `null` for a venue with zero games (criterion 260: an empty state, not a page of zeros). */
  tableAverage: PlaceTableAverage | null;
  /** Ordered by games here descending, then alphabetically (criterion 261) — no ranking decoration. `[]` iff `gamesPlayed` is 0. */
  players: VenuePagePlayerRow[];
  /** Newest first — the games list's own row format (criterion 264). `[]` iff `gamesPlayed` is 0. */
  games: VenuePageGame[];
}

/**
 * A venue's own page (criteria 260–261) — `null` for a made-up or deleted
 * venue id (the app's own 404, M2 criterion 130). **Three bounded queries
 * regardless of the archive's size or venue count** (criterion 273): the
 * location row, this venue's own games, and every `game_player` row in those
 * games — nothing per-player or per-game in a loop.
 *
 * The per-player table (`players`) is built on `venueBreakdown` (criterion
 * 250) — the identical function `lib/players/rivalry.ts`'s
 * `getPlayerVenueStats` calls from a player's own side (decision 29,
 * criterion 257): neither caller re-derives a mean or a win rate.
 */
export async function getVenuePage(id: string): Promise<VenuePage | null> {
  const db = getDb();

  // Queries 1 and 2 of up to 3: the location row, and this venue's own
  // games — neither depends on the other's result (query 2 filters by the
  // `id` argument itself, not by anything query 1 returns), so both run
  // concurrently (code review: these two ran as sequential awaits with
  // nothing between them). A made-up id still discards the games result and
  // 404s below, exactly as before — the wasted query only happens on that
  // rare path, not on every real venue's page load.
  const [row, gameRows] = await Promise.all([
    db.select({ id: location.id, name: location.name }).from(location).where(eq(location.id, id)).then((rows) => rows[0]),
    db
      .select({
        id: game.id,
        playedOn: game.playedOn,
        createdAt: game.createdAt,
        rosterId: game.rosterId,
        rosterName: roster.name,
      })
      .from(game)
      .innerJoin(roster, eq(game.rosterId, roster.id))
      .where(eq(game.locationId, id))
      .orderBy(desc(game.playedOn), desc(game.createdAt)),
  ]);
  if (!row) return null;

  if (gameRows.length === 0) {
    return { id: row.id, name: row.name, gamesPlayed: 0, tableAverage: null, players: [], games: [] };
  }

  const gameIds = gameRows.map((g) => g.id);
  const gamePlayerRows = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(inArray(gamePlayer.gameId, gameIds));

  const byGame = new Map<string, typeof gamePlayerRows>();
  for (const r of gamePlayerRows) {
    const arr = byGame.get(r.gameId) ?? [];
    arr.push(r);
    byGame.set(r.gameId, arr);
  }

  const displayNameByPlayer = new Map<string, string>();
  const participations: VenueParticipation[] = [];
  const games: VenuePageGame[] = gameRows.map((g) => {
    const rows = byGame.get(g.id) ?? [];
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    const winnerIds = new Set(determineWinners(scores));
    for (const r of rows) {
      displayNameByPlayer.set(r.playerId, r.displayName);
      participations.push({
        locationId: id,
        locationName: row.name,
        playerId: r.playerId,
        finalScore: r.finalScore,
        won: winnerIds.has(r.playerId),
      });
    }
    return {
      id: g.id,
      playedOn: g.playedOn,
      rosterId: g.rosterId,
      rosterName: g.rosterName ?? rosterDisplayName(rows.map((r) => r.displayName)),
      winners: rows.filter((r) => winnerIds.has(r.playerId)).map((r) => r.displayName),
    };
  });

  const tableAverageResult = averageFinalScore(gamePlayerRows.map((r) => r.finalScore))!;

  const players: VenuePagePlayerRow[] = venueBreakdown(participations)
    .map((b) => ({
      playerId: b.playerId,
      displayName: displayNameByPlayer.get(b.playerId)!,
      gamesPlayed: b.gamesPlayed,
      wins: b.wins,
      winRate: b.winRate,
      average: b.average,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || compareDisplayNames(a.displayName, b.displayName));

  return {
    id: row.id,
    name: row.name,
    gamesPlayed: gameRows.length,
    tableAverage: {
      average: tableAverageResult.average,
      gamesPlayed: gameRows.length,
      scoresCount: gamePlayerRows.length,
    },
    players,
    games,
  };
}
