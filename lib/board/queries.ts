/**
 * The records board — PRD criteria 179–191, 196.
 *
 * `getBoard()` is the board's one entry point: three bounded queries (every
 * game, every `game_player` row, every `round_score` row), then everything
 * else — winners, streaks, averages, rounds won, who holds what — is worked
 * out from those rows in memory using `lib/scoring`'s pure definitions.
 *
 * ⚠️ **Nothing here is cached, precomputed or summarised** (criterion 189): a
 * delete, an edit or a merge (both M2 features) is reflected on the very next
 * call, because there is nothing to invalidate.
 *
 * ⚠️ **The query count does not grow with the archive** (criterion 190): three
 * `db.select(...)` calls, full stop, however many games or players exist —
 * every per-player and per-game step below is a loop over rows already in
 * memory, never a fresh query. See `tests/board/queries.test.ts` for the
 * query-count assertion this claim is checked against.
 *
 * ⚠️ **No withholding** (criteria 183–184, struck): every player with at
 * least one game is eligible for every record, from the first saved game.
 * `EARLY_DAYS_BELOW` is a caveat threshold for the board's own archive-size
 * line, not a gate on anything below it.
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster, roundScore } from "@/lib/db/schema";
import {
  averageFinalScore,
  determineWinners,
  longestStreak,
  roundsWon,
  rosterDisplayName,
  winningScore,
  type GameHandScoreRow,
  type PlayerScore,
  type StreakGame,
} from "@/lib/scoring";

/**
 * Under this many games in the whole archive, the board carries the
 * early-days line (criterion 183). A caveat threshold, not a gate — every
 * record is shown in full either side of it.
 */
export const EARLY_DAYS_BELOW = 10;

/** One record's holder, with their own sample — criterion 182 requires this beside every holder's name. */
export interface RecordHolder {
  playerId: string;
  displayName: string;
  /** This holder's own game count. Never the archive's — a joint holder can have a very different one. */
  gamesPlayed: number;
}

/**
 * One game behind a record's number, in exactly `GameRowProps`'s shape
 * (`components/GameRow.tsx`) plus the annotations two specific drill-throughs
 * need — so the frontend can pass one of these straight into the existing,
 * unmodified `GameRow` (design system: "the plain, unmodified `GameRow` list").
 */
export interface RecordGame {
  id: string;
  playedOn: string;
  /** Null renders as "No location", same as the games list. */
  locationName: string | null;
  rosterId: string;
  rosterName: string;
  /** This game's own winner(s) by display name — not necessarily this record's holder(s). */
  winners: string[];
  winningScore: number;
  /**
   * "Most rounds won" drill-through only (criterion 186): how many of the 11
   * hands each contributing holder took in this particular game. Almost
   * always one entry; more than one only when the record is jointly held and
   * more than one holder took hands in this same game.
   */
  roundsWonByHolder?: { displayName: string; rounds: number }[];
  /**
   * Joint-streak drill-through only: whose streak this game belongs to, set
   * only when the record is held by more than one player **and** this
   * particular game belongs to just one of their runs — otherwise the list
   * would read as one continuous run it isn't (design system, "records
   * board", streak-holder annotation).
   */
  streakOwner?: string;
}

export type BoardRecordKey =
  | "mostWins"
  | "mostWinsInARow"
  | "lowestAverageScore"
  | "mostRoundsWon"
  | "stalwart";

export interface BoardRecord {
  key: BoardRecordKey;
  /**
   * `null` only when nobody has yet done the thing this record measures
   * (criterion 185) — a real, permanent possibility for records not yet
   * built (the drought, Stage 2, over a group where everyone has won) but
   * ⚠️ **not reachable by any of Stage 1's five records against a non-empty
   * archive**: every game has a winner, so most-wins, the streak, the
   * average and the stalwart always have at least one holder, and every hand
   * has a round winner. Handled here anyway, defensively, since the board
   * renders through one shared path regardless of record.
   */
  value: number | null;
  /** All of them, alphabetical by display name. Never truncated, never "and N others" (criterion 181). */
  holders: RecordHolder[];
  /** Exactly the games the number was computed from (criterion 186). Empty iff `holders` is empty. */
  games: RecordGame[];
}

export type Board =
  | { empty: true }
  | {
      empty: false;
      /** The whole archive's size, stated once (criterion 182). */
      archiveGameCount: number;
      /** `archiveGameCount < EARLY_DAYS_BELOW` — the board's one early-days line (criterion 183). */
      earlyDays: boolean;
      records: BoardRecord[];
    };

interface GameRow {
  id: string;
  playedOn: string;
  createdAt: string;
  locationName: string | null;
  rosterId: string;
  rosterName: string | null;
}

interface GamePlayerRow {
  gameId: string;
  playerId: string;
  displayName: string;
  finalScore: number;
}

/** Every game a given player played, chronological facts only — the shape every per-player record is built from. */
interface PlayerGameFact {
  gameId: string;
  playedOn: string;
  createdAt: string;
  finalScore: number;
  won: boolean;
}

/**
 * The whole records board, computed fresh from stored rows — three queries,
 * everything else in memory. See the module doc comment above for the
 * criteria this satisfies.
 */
export async function getBoard(): Promise<Board> {
  const db = getDb();

  // Query 1 of 3: every game, with its location and roster names attached.
  const gameRows: GameRow[] = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      createdAt: game.createdAt,
      locationName: location.name,
      rosterId: game.rosterId,
      rosterName: roster.name,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id));

  if (gameRows.length === 0) return { empty: true };

  // Query 2 of 3: every game_player row, with display names attached.
  const gamePlayerRows: GamePlayerRow[] = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id));

  // Query 3 of 3: every round_score row in the archive, for "most rounds won".
  const roundScoreRows: GameHandScoreRow[] = await db
    .select({
      gameId: roundScore.gameId,
      playerId: roundScore.playerId,
      hand: roundScore.hand,
      score: roundScore.score,
    })
    .from(roundScore);

  // ---------------------------------------------------------------------
  // Everything below is in-memory work over the three row sets above — no
  // further database access, and none of it re-runs per player or per game.
  // ---------------------------------------------------------------------

  const gamesById = new Map(gameRows.map((g) => [g.id, g]));

  const gamePlayersByGame = new Map<string, GamePlayerRow[]>();
  for (const row of gamePlayerRows) {
    const arr = gamePlayersByGame.get(row.gameId) ?? [];
    arr.push(row);
    gamePlayersByGame.set(row.gameId, arr);
  }

  // Each game's winner(s) and effective roster name, computed once and reused by every drill-through.
  const winnerIdsByGame = new Map<string, string[]>();
  const rosterNameByGame = new Map<string, string>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    winnerIdsByGame.set(gameId, determineWinners(scores));
    const g = gamesById.get(gameId)!;
    rosterNameByGame.set(gameId, g.rosterName ?? rosterDisplayName(rows.map((r) => r.displayName)));
  }

  // Every player's own games, chronological facts — the single pass every per-player record reads from.
  const displayNameByPlayer = new Map<string, string>();
  const gamesByPlayer = new Map<string, PlayerGameFact[]>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const winnerIds = new Set(winnerIdsByGame.get(gameId));
    const g = gamesById.get(gameId)!;
    for (const row of rows) {
      displayNameByPlayer.set(row.playerId, row.displayName);
      const arr = gamesByPlayer.get(row.playerId) ?? [];
      arr.push({
        gameId,
        playedOn: g.playedOn,
        createdAt: g.createdAt,
        finalScore: row.finalScore,
        won: winnerIds.has(row.playerId),
      });
      gamesByPlayer.set(row.playerId, arr);
    }
  }

  function sortNewestFirst(a: string, b: string): number {
    const ga = gamesById.get(a)!;
    const gb = gamesById.get(b)!;
    if (ga.playedOn !== gb.playedOn) return ga.playedOn < gb.playedOn ? 1 : -1;
    if (ga.createdAt !== gb.createdAt) return ga.createdAt < gb.createdAt ? 1 : -1;
    return 0;
  }

  function toRecordGame(
    gameId: string,
    extra: Pick<RecordGame, "roundsWonByHolder" | "streakOwner"> = {},
  ): RecordGame {
    const g = gamesById.get(gameId)!;
    const rows = gamePlayersByGame.get(gameId) ?? [];
    const winnerIds = new Set(winnerIdsByGame.get(gameId));
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    return {
      id: g.id,
      playedOn: g.playedOn,
      locationName: g.locationName,
      rosterId: g.rosterId,
      rosterName: rosterNameByGame.get(gameId)!,
      winners: rows.filter((r) => winnerIds.has(r.playerId)).map((r) => r.displayName),
      winningScore: winningScore(scores) ?? 0,
      ...extra,
    };
  }

  function holder(playerId: string): RecordHolder {
    return {
      playerId,
      displayName: displayNameByPlayer.get(playerId)!,
      gamesPlayed: gamesByPlayer.get(playerId)?.length ?? 0,
    };
  }

  function sortedHolders(ids: readonly string[]): RecordHolder[] {
    return ids
      .map(holder)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  }

  /** Every player id tied for the best value in `values` — "best" per `better(candidate, currentBest)`. */
  function bestHolders(values: Map<string, number>, better: (candidate: number, currentBest: number) => boolean): string[] {
    let best: number | null = null;
    for (const value of values.values()) {
      if (best === null || better(value, best)) best = value;
    }
    if (best === null) return [];
    return [...values.entries()].filter(([, value]) => value === best).map(([playerId]) => playerId);
  }

  const higherIsBetter = (candidate: number, best: number) => candidate > best;
  const lowerIsBetter = (candidate: number, best: number) => candidate < best;

  // ----------------------------------------------------------------- most wins
  const winsByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) {
    winsByPlayer.set(playerId, games.filter((g) => g.won).length);
  }
  const mostWinsHolderIds = bestHolders(winsByPlayer, higherIsBetter);
  const mostWins: BoardRecord =
    mostWinsHolderIds.length === 0
      ? { key: "mostWins", value: null, holders: [], games: [] }
      : {
          key: "mostWins",
          value: winsByPlayer.get(mostWinsHolderIds[0]!)!,
          holders: sortedHolders(mostWinsHolderIds),
          games: unionGames(
            mostWinsHolderIds,
            (playerId) => gamesByPlayer.get(playerId)!.filter((g) => g.won).map((g) => g.gameId),
          ).sort(sortNewestFirst).map((id) => toRecordGame(id)),
        };

  // --------------------------------------------------------- most wins in a row
  const streakByPlayer = new Map<string, { length: number; gameIds: string[] }>();
  for (const [playerId, games] of gamesByPlayer) {
    const streakGames: StreakGame[] = games.map((g) => ({
      gameId: g.gameId,
      playedOn: g.playedOn,
      createdAt: g.createdAt,
      won: g.won,
    }));
    streakByPlayer.set(playerId, longestStreak(streakGames));
  }
  const streakLengthByPlayer = new Map<string, number>();
  for (const [playerId, s] of streakByPlayer) streakLengthByPlayer.set(playerId, s.length);
  const mostWinsInARowHolderIds = bestHolders(streakLengthByPlayer, higherIsBetter);
  const mostWinsInARow: BoardRecord =
    mostWinsInARowHolderIds.length === 0
      ? { key: "mostWinsInARow", value: null, holders: [], games: [] }
      : {
          key: "mostWinsInARow",
          value: streakLengthByPlayer.get(mostWinsInARowHolderIds[0]!)!,
          holders: sortedHolders(mostWinsInARowHolderIds),
          games: streakDrillThrough(mostWinsInARowHolderIds, streakByPlayer, displayNameByPlayer, toRecordGame, sortNewestFirst),
        };

  // ----------------------------------------------------------- lowest average
  const averageByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) {
    const avg = averageFinalScore(games.map((g) => g.finalScore));
    if (avg) averageByPlayer.set(playerId, avg.average);
  }
  const lowestAverageHolderIds = bestHolders(averageByPlayer, lowerIsBetter);
  const lowestAverageScore: BoardRecord =
    lowestAverageHolderIds.length === 0
      ? { key: "lowestAverageScore", value: null, holders: [], games: [] }
      : {
          key: "lowestAverageScore",
          value: averageByPlayer.get(lowestAverageHolderIds[0]!)!,
          holders: sortedHolders(lowestAverageHolderIds),
          games: unionGames(
            lowestAverageHolderIds,
            (playerId) => gamesByPlayer.get(playerId)!.map((g) => g.gameId),
          ).sort(sortNewestFirst).map((id) => toRecordGame(id)),
        };

  // ---------------------------------------------------------- most rounds won
  const { totalByPlayer: roundsWonByPlayer, byPlayerAndGame: roundsWonByPlayerAndGame } = roundsWon(roundScoreRows);
  const mostRoundsWonHolderIds = bestHolders(roundsWonByPlayer, higherIsBetter);
  const mostRoundsWon: BoardRecord =
    mostRoundsWonHolderIds.length === 0
      ? { key: "mostRoundsWon", value: null, holders: [], games: [] }
      : {
          key: "mostRoundsWon",
          value: roundsWonByPlayer.get(mostRoundsWonHolderIds[0]!)!,
          holders: sortedHolders(mostRoundsWonHolderIds),
          games: roundsWonDrillThrough(mostRoundsWonHolderIds, roundsWonByPlayerAndGame, displayNameByPlayer, toRecordGame, sortNewestFirst),
        };

  // ---------------------------------------------------------------- stalwart
  const gamesPlayedByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) gamesPlayedByPlayer.set(playerId, games.length);
  const stalwartHolderIds = bestHolders(gamesPlayedByPlayer, higherIsBetter);
  const stalwart: BoardRecord =
    stalwartHolderIds.length === 0
      ? { key: "stalwart", value: null, holders: [], games: [] }
      : {
          key: "stalwart",
          value: gamesPlayedByPlayer.get(stalwartHolderIds[0]!)!,
          holders: sortedHolders(stalwartHolderIds),
          games: unionGames(
            stalwartHolderIds,
            (playerId) => gamesByPlayer.get(playerId)!.map((g) => g.gameId),
          ).sort(sortNewestFirst).map((id) => toRecordGame(id)),
        };

  return {
    empty: false,
    archiveGameCount: gameRows.length,
    earlyDays: gameRows.length < EARLY_DAYS_BELOW,
    records: [mostWins, mostWinsInARow, lowestAverageScore, mostRoundsWon, stalwart],
  };
}

/** The de-duplicated union of every holder's own qualifying games. */
function unionGames(holderIds: readonly string[], gamesFor: (playerId: string) => string[]): string[] {
  const ids = new Set<string>();
  for (const playerId of holderIds) {
    for (const gameId of gamesFor(playerId)) ids.add(gameId);
  }
  return [...ids];
}

/**
 * "Most wins in a row"'s drill-through: the union of every holder's own
 * longest run, **oldest → newest** — the one deliberate exception to "newest
 * first" (design system, records board: "a run reads as a run in the order
 * it was played"). When holders' qualifying games differ, a game belonging to
 * only one of them is annotated with whose streak it is.
 */
function streakDrillThrough(
  holderIds: readonly string[],
  streakByPlayer: Map<string, { length: number; gameIds: string[] }>,
  displayNameByPlayer: Map<string, string>,
  toRecordGame: (gameId: string, extra?: Pick<RecordGame, "roundsWonByHolder" | "streakOwner">) => RecordGame,
  sortNewestFirst: (a: string, b: string) => number,
): RecordGame[] {
  const ownersByGame = new Map<string, Set<string>>();
  for (const playerId of holderIds) {
    const displayName = displayNameByPlayer.get(playerId)!;
    for (const gameId of streakByPlayer.get(playerId)!.gameIds) {
      const owners = ownersByGame.get(gameId) ?? new Set<string>();
      owners.add(displayName);
      ownersByGame.set(gameId, owners);
    }
  }

  const gameIds = [...ownersByGame.keys()].sort((a, b) => -sortNewestFirst(a, b));

  return gameIds.map((gameId) => {
    const owners = ownersByGame.get(gameId)!;
    const streakOwner = holderIds.length > 1 && owners.size === 1 ? [...owners][0] : undefined;
    return toRecordGame(gameId, streakOwner ? { streakOwner } : {});
  });
}

/**
 * "Most rounds won"'s drill-through: every game any holder took at least one
 * hand in, newest first, each row carrying how many of the 11 hands each
 * contributing holder took there (design system: "{Player} took {n} of 11
 * rounds").
 */
function roundsWonDrillThrough(
  holderIds: readonly string[],
  byPlayerAndGame: Map<string, Map<string, number>>,
  displayNameByPlayer: Map<string, string>,
  toRecordGame: (gameId: string, extra?: Pick<RecordGame, "roundsWonByHolder" | "streakOwner">) => RecordGame,
  sortNewestFirst: (a: string, b: string) => number,
): RecordGame[] {
  const gameIds = new Set<string>();
  for (const playerId of holderIds) {
    for (const gameId of byPlayerAndGame.get(playerId)?.keys() ?? []) gameIds.add(gameId);
  }

  return [...gameIds]
    .sort(sortNewestFirst)
    .map((gameId) => {
      const roundsWonByHolder = holderIds
        .map((playerId) => ({
          displayName: displayNameByPlayer.get(playerId)!,
          rounds: byPlayerAndGame.get(playerId)?.get(gameId) ?? 0,
        }))
        .filter((entry) => entry.rounds > 0);
      return toRecordGame(gameId, { roundsWonByHolder });
    });
}
