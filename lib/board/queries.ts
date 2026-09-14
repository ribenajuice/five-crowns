/**
 * The records board — PRD criteria 179–191, 196, extended by Stage 2 with
 * two more rows: the drought (213) and the nearly man (216).
 *
 * `getBoard()` is the board's one entry point: **still exactly three bounded
 * queries** (every game, every `game_player` row, every `round_score` row) —
 * Stage 2 adds no query of its own (criterion 219) — then everything else —
 * winners, second places, streaks, droughts, averages, rounds won, who holds
 * what — is worked out from those same rows in memory using `lib/scoring`'s
 * pure definitions.
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
  compareDisplayNames,
  compareNewestFirst,
  determineWinners,
  longestDrought,
  longestStreak,
  roundsWon,
  rosterDisplayName,
  secondPlace,
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
  | "stalwart"
  | "drought"
  | "nearlyMan";

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

  // Queries 2 and 3 of 3: every game_player row (with display names attached)
  // and every round_score row in the archive. Neither depends on the other's
  // result — only the early return above depends on query 1, and only on its
  // emptiness — so they run concurrently.
  const [gamePlayerRows, roundScoreRows]: [GamePlayerRow[], GameHandScoreRow[]] = await Promise.all([
    db
      .select({
        gameId: gamePlayer.gameId,
        playerId: gamePlayer.playerId,
        displayName: player.displayName,
        finalScore: gamePlayer.finalScore,
      })
      .from(gamePlayer)
      .innerJoin(player, eq(gamePlayer.playerId, player.id)),
    db
      .select({
        gameId: roundScore.gameId,
        playerId: roundScore.playerId,
        hand: roundScore.hand,
        score: roundScore.score,
      })
      .from(roundScore),
  ]);

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

  // Each game's winner(s), second place(s) (criterion 214) and effective
  // roster name, computed once and reused by every drill-through.
  const winnerIdsByGame = new Map<string, string[]>();
  const secondPlaceIdsByGame = new Map<string, string[]>();
  const rosterNameByGame = new Map<string, string>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    winnerIdsByGame.set(gameId, determineWinners(scores));
    secondPlaceIdsByGame.set(gameId, secondPlace(scores)?.playerIds ?? []);
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

  // The same games, reshaped once into exactly what `longestStreak` /
  // `longestDrought` need — reused by both the streak and the drought below,
  // rather than each re-mapping every player's games into this shape on its
  // own.
  const streakGamesByPlayer = new Map<string, StreakGame[]>();
  for (const [playerId, games] of gamesByPlayer) {
    streakGamesByPlayer.set(
      playerId,
      games.map((g) => ({ gameId: g.gameId, playedOn: g.playedOn, createdAt: g.createdAt, won: g.won })),
    );
  }

  // Delegates to `lib/scoring`'s one shared chronological comparator — this
  // module's own job is just resolving a game id to the row it needs.
  function sortNewestFirst(a: string, b: string): number {
    return compareNewestFirst(gamesById.get(a)!, gamesById.get(b)!);
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
    return ids.map(holder).sort((a, b) => compareDisplayNames(a.displayName, b.displayName));
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

  /**
   * One record's whole assembly: find the best value(s) in `valuesByPlayer`
   * per `better`, collect every joint holder, and either report "nobody yet"
   * (criterion 185) or assemble the full `BoardRecord` — the ~90-line shape
   * every one of the five Stage 1 records (and Stage 2's upcoming two) was
   * separately repeating. `gamesFor` is the one part that's genuinely
   * different per record: the plain `unionGames(...).sort(sortNewestFirst)`
   * tail for most of them, or a bespoke drill-through (the streak, most
   * rounds won) for the rest.
   */
  function buildRecord(
    key: BoardRecordKey,
    valuesByPlayer: Map<string, number>,
    better: (candidate: number, best: number) => boolean,
    gamesFor: (holderIds: readonly string[]) => RecordGame[],
  ): BoardRecord {
    const holderIds = bestHolders(valuesByPlayer, better);
    if (holderIds.length === 0) {
      return { key, value: null, holders: [], games: [] };
    }
    return {
      key,
      value: valuesByPlayer.get(holderIds[0]!)!,
      holders: sortedHolders(holderIds),
      games: gamesFor(holderIds),
    };
  }

  /** The plain "union of every holder's own qualifying games, newest first" tail three of the five records share. */
  function unionGamesNewestFirst(
    holderIds: readonly string[],
    gamesFor: (playerId: string) => string[],
  ): RecordGame[] {
    return unionGames(holderIds, gamesFor).sort(sortNewestFirst).map((id) => toRecordGame(id));
  }

  // ----------------------------------------------------------------- most wins
  const winsByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) {
    winsByPlayer.set(playerId, games.filter((g) => g.won).length);
  }
  const mostWins = buildRecord("mostWins", winsByPlayer, higherIsBetter, (ids) =>
    unionGamesNewestFirst(ids, (playerId) => gamesByPlayer.get(playerId)!.filter((g) => g.won).map((g) => g.gameId)),
  );

  // --------------------------------------------------------- most wins in a row
  const streakByPlayer = new Map<string, { length: number; gameIds: string[] }>();
  for (const [playerId, streakGames] of streakGamesByPlayer) {
    streakByPlayer.set(playerId, longestStreak(streakGames));
  }
  const streakLengthByPlayer = new Map<string, number>();
  for (const [playerId, s] of streakByPlayer) streakLengthByPlayer.set(playerId, s.length);
  const mostWinsInARow = buildRecord("mostWinsInARow", streakLengthByPlayer, higherIsBetter, (ids) =>
    streakDrillThrough(ids, streakByPlayer, displayNameByPlayer, toRecordGame, sortNewestFirst),
  );

  // ----------------------------------------------------------- lowest average
  const averageByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) {
    const avg = averageFinalScore(games.map((g) => g.finalScore));
    if (avg) averageByPlayer.set(playerId, avg.average);
  }
  const lowestAverageScore = buildRecord("lowestAverageScore", averageByPlayer, lowerIsBetter, (ids) =>
    unionGamesNewestFirst(ids, (playerId) => gamesByPlayer.get(playerId)!.map((g) => g.gameId)),
  );

  // ---------------------------------------------------------- most rounds won
  const { totalByPlayer: roundsWonByPlayer, byPlayerAndGame: roundsWonByPlayerAndGame } = roundsWon(roundScoreRows);
  const mostRoundsWon = buildRecord("mostRoundsWon", roundsWonByPlayer, higherIsBetter, (ids) =>
    roundsWonDrillThrough(ids, roundsWonByPlayerAndGame, displayNameByPlayer, toRecordGame, sortNewestFirst),
  );

  // ---------------------------------------------------------------- stalwart
  const gamesPlayedByPlayer = new Map<string, number>();
  for (const [playerId, games] of gamesByPlayer) gamesPlayedByPlayer.set(playerId, games.length);
  const stalwart = buildRecord("stalwart", gamesPlayedByPlayer, higherIsBetter, (ids) =>
    unionGamesNewestFirst(ids, (playerId) => gamesByPlayer.get(playerId)!.map((g) => g.gameId)),
  );

  // ---------------------------------------------------------------- drought
  // Criterion 212's machinery, negated (`longestDrought`). ⚠️ A drought of
  // *zero* — a player who has never failed to win — does not qualify to hold
  // this record (criterion 217): filtered out here, before `buildRecord` ever
  // sees it, exactly the same "zero never holds the title" shape criterion
  // 199 uses for nemesis. The degenerate all-shared-win archive then leaves
  // this map empty, and `buildRecord` reports the no-holder case on its own.
  const droughtByPlayer = new Map<string, { length: number; gameIds: string[] }>();
  const droughtLengthByPlayer = new Map<string, number>();
  for (const [playerId, streakGames] of streakGamesByPlayer) {
    const drought = longestDrought(streakGames);
    droughtByPlayer.set(playerId, drought);
    if (drought.length > 0) droughtLengthByPlayer.set(playerId, drought.length);
  }
  const droughtRecord = buildRecord("drought", droughtLengthByPlayer, higherIsBetter, (ids) =>
    streakDrillThrough(ids, droughtByPlayer, displayNameByPlayer, toRecordGame, sortNewestFirst),
  );

  // ------------------------------------------------------------ nearly man
  // Criterion 216: most second places (214), a shared second counting in
  // full for each holder. A player only ever appears in this map if they've
  // actually come second at least once, so the "nobody's ever come second"
  // archive (criterion 217) leaves it empty with no filtering needed.
  const secondPlaceGamesByPlayer = new Map<string, string[]>();
  for (const [gameId, playerIds] of secondPlaceIdsByGame) {
    for (const playerId of playerIds) {
      const arr = secondPlaceGamesByPlayer.get(playerId) ?? [];
      arr.push(gameId);
      secondPlaceGamesByPlayer.set(playerId, arr);
    }
  }
  const nearlyManCountByPlayer = new Map<string, number>();
  for (const [playerId, games] of secondPlaceGamesByPlayer) {
    nearlyManCountByPlayer.set(playerId, games.length);
  }
  const nearlyMan = buildRecord("nearlyMan", nearlyManCountByPlayer, higherIsBetter, (ids) =>
    unionGamesNewestFirst(ids, (playerId) => secondPlaceGamesByPlayer.get(playerId) ?? []),
  );

  return {
    empty: false,
    archiveGameCount: gameRows.length,
    earlyDays: gameRows.length < EARLY_DAYS_BELOW,
    records: [mostWins, mostWinsInARow, lowestAverageScore, mostRoundsWon, stalwart, droughtRecord, nearlyMan],
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
  // Keyed by playerId, like every sibling map in this module — never by
  // displayName, which two distinct players could share.
  const ownersByGame = new Map<string, Set<string>>();
  for (const playerId of holderIds) {
    for (const gameId of streakByPlayer.get(playerId)!.gameIds) {
      const owners = ownersByGame.get(gameId) ?? new Set<string>();
      owners.add(playerId);
      ownersByGame.set(gameId, owners);
    }
  }

  const gameIds = [...ownersByGame.keys()].sort((a, b) => -sortNewestFirst(a, b));

  return gameIds.map((gameId) => {
    const owners = ownersByGame.get(gameId)!;
    // Resolve to a display name only at this final point of output.
    const streakOwner =
      holderIds.length > 1 && owners.size === 1
        ? displayNameByPlayer.get([...owners][0]!)!
        : undefined;
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
