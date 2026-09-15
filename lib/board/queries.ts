/**
 * The records board — PRD criteria 179–191, 196, extended by Stage 2 with
 * two more rows (the drought, 213, and the nearly man, 216), by Stage 3 with
 * five single-event records (criteria 228–235): best/worst game ever, the
 * catastrophe, cleanest sheet and biggest hammering, and by Stage 4 with a
 * thirteenth, home advantage (criteria 253–254, 268–269).
 *
 * `getBoard()` is the board's one entry point: **still exactly three bounded
 * queries** (every game, every `game_player` row, every `round_score` row) —
 * neither Stage 2, Stage 3 nor Stage 4 adds a query of its own (criteria 219,
 * 248, 273) — then everything else — winners, second places, streaks,
 * droughts, averages, rounds won, single-event extremes, home advantage, who
 * holds what — is worked out from those same rows in memory using
 * `lib/scoring`'s pure definitions. Stage 4 only widens query 1's own
 * `SELECT` list with `game.location_id` (already stored since Milestone 1) —
 * not a fourth query.
 *
 * ⚠️ **Stage 3's five records are a different animal from the other seven**
 * (spec decision 17) and are returned separately, on `singleEventRecords`,
 * rather than folded into `records`: their holders are (player, game)
 * instances — the same player can appear twice, once per game — not unique
 * players with a career game count, so `RecordHolder`'s shape (which a
 * single-event holder would either lie about or leave blank) never applies
 * to them. ⚠️ **Home advantage is a third animal again** (Stage 4): its
 * holder unit is a (player, venue) pair, so it gets its own `homeAdvantage`
 * field rather than fitting into either array — see `HomeAdvantageBoardRecord`'s
 * own doc comment. A caller building the thirteen-card board concatenates
 * `records`, `singleEventRecords` and `homeAdvantage` in `docs/DESIGN-SYSTEM.md`'s
 * fixed order (criteria 235, 270); this module doesn't impose an order across
 * them itself.
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
 * ⚠️ **Shared with `lib/board/facts.ts`** (code review fix, Milestone 4):
 * `getBoardData()` below is the module's actual three-query fetch, exposed
 * publicly for exactly the reason `lib/players/rivalry.ts`'s
 * `getPlayerGameFacts` is — so a caller needing more than one thing built
 * from these same three tables (the board page now needs both the board
 * itself and the fun-facts pool) fetches once and threads the result through,
 * rather than each independently re-querying and re-grouping the identical
 * rows. `getBoard()` accepts an already-fetched `BoardData` as an optional
 * argument and only calls `getBoardData()` itself when one isn't given, so
 * every existing standalone call site (tests included) keeps working
 * unchanged.
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
  bestGameEver,
  biggestHammering,
  catastrophe,
  cleanestSheet,
  compareDisplayNames,
  compareNewestFirst,
  determineWinners,
  handLabel,
  homeAdvantage,
  longestDrought,
  longestStreak,
  roundsWon,
  rosterDisplayName,
  secondPlace,
  winningScore,
  worstGameEver,
  zeroHandCountsByPlayerGame,
  type FinalScoreInstance,
  type HammeringInstance,
  type HandLabel,
  type HomeAdvantageCandidate,
  type HomeAdvantageHolder,
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
  /**
   * A single-event drill-through only (criterion 234): that instance's own
   * number — the score, the zero count or the margin. Rendered beside the
   * row rather than relying on the record's shared `value`, because two
   * instances of the same record can legitimately carry different numbers
   * (two games tied on the winning margin, each with its own).
   */
  singleEventValue?: number;
  /** The catastrophe's drill-through only: which hand this instance's score came from. */
  singleEventHand?: HandLabel;
}

export type BoardRecordKey =
  | "mostWins"
  | "mostWinsInARow"
  | "lowestAverageScore"
  | "mostRoundsWon"
  | "stalwart"
  | "drought"
  | "nearlyMan";

/** One (player, game) instance a single-event record is held by — criteria 228, 230, 231, 232. */
export interface SingleEventHolder {
  playerId: string;
  displayName: string;
  /** The one game this instance came from. */
  gameId: string;
  /** What criterion 233 states instead of a game count — this instance's own date, not the holder's history. */
  playedOn: string;
  /** The catastrophe only: which hand this instance's score came from. */
  hand?: HandLabel;
}

export type SingleEventRecordKey =
  | "bestGameEver"
  | "worstGameEver"
  | "catastrophe"
  | "cleanestSheet"
  | "biggestHammering";

/** The two lookups `toSingleEventHolder` needs to resolve a raw (player, game) id pair — whatever `getBoard()` and `getStatsPage()` each already built their own copy of. */
export interface SingleEventHolderContext {
  displayNameByPlayer: ReadonlyMap<string, string>;
  gamesById: ReadonlyMap<string, { playedOn: string }>;
}

/**
 * One (player, game[, hand]) instance's holder details (criteria 228, 230,
 * 231, 232, 233) — the **one** formatting function both the board
 * (`getBoard()`, below) and `/stats` (`lib/stats/queries.ts`) call, so the
 * two screens can never silently disagree on how the same holder data is
 * displayed. Previously reimplemented near-verbatim in both places; exported
 * from here since `lib/stats/queries.ts` already imports `SingleEventHolder`
 * (the type) from this module.
 */
export function toSingleEventHolder(
  ctx: SingleEventHolderContext,
  playerId: string,
  gameId: string,
  hand?: number,
): SingleEventHolder {
  return {
    playerId,
    displayName: ctx.displayNameByPlayer.get(playerId)!,
    gameId,
    playedOn: ctx.gamesById.get(gameId)!.playedOn,
    ...(hand !== undefined ? { hand: handLabel(hand) } : {}),
  };
}

/**
 * One of Stage 3's five single-event records (criteria 228–232) — "a
 * different animal from an aggregate one" (spec decision 17): one
 * observation, not a summary of anybody's history. `holders` is one row per
 * (player, game[, hand]) **instance**, never deduplicated by player — the
 * same player can hold it twice, once per game or hand (criteria 228, 230).
 * `games` is the **games** behind those instances, deduplicated by game id
 * (two instances sharing one game — a tie between two players in the same
 * night — render as one row there, exactly like a shared aggregate win
 * already does), newest first (criterion 234); a one-row list is correct
 * (decision 24), not padded.
 */
export interface SingleEventBoardRecord {
  key: SingleEventRecordKey;
  /** `null` only if the archive were empty — unreachable here, since `getBoard` already returns the empty state first. Kept for symmetry with `BoardRecord.value`. */
  value: number | null;
  /** Every instance tied for the extreme value, alphabetical by display name (criterion 228). */
  holders: SingleEventHolder[];
  /** Deduplicated by game id, newest first — see this interface's own doc comment. */
  games: RecordGame[];
}

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

/**
 * Home advantage (criteria 253–254, 268–269) — the board's thirteenth
 * record, and a third *different* animal from the other twelve: its holder
 * unit is a (player, venue) **pair**, not a unique player (like the seven
 * Stage 1/2 records) and not a (player, game[, hand]) instance (like Stage
 * 3's five) — so it gets its own field on `Board` rather than being forced
 * into either existing array's shape. `docs/DESIGN-SYSTEM.md`'s fixed card
 * order still places it **last**, after Stage 3's five, when a caller
 * concatenates `records`, `singleEventRecords` and this one into the
 * board's thirteen cards.
 */
export interface HomeAdvantageBoardRecord {
  /** `null` iff `holders` is empty (criterion 254: nobody with a positive gap). */
  gapPercentagePoints: number | null;
  /** Every (player, venue) pair tied for the highest gap, alphabetical by player then venue. */
  holders: (HomeAdvantageHolder & {
    /** This pair's own drill-through (criterion 269): the holder's own games at this venue, newest first. A one-row list is correct, not padded. */
    games: RecordGame[];
  })[];
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
      /** Stage 3's five single-event records (criteria 228–232) — see this module's doc comment for why they're a separate array. */
      singleEventRecords: SingleEventBoardRecord[];
      /** Stage 4's thirteenth record (criteria 253–254, 268–269) — see `HomeAdvantageBoardRecord`'s own doc comment for why it isn't folded into either array above. */
      homeAdvantage: HomeAdvantageBoardRecord;
    };

export interface BoardGameRow {
  id: string;
  playedOn: string;
  createdAt: string;
  /** Stage 4: needed to group a player's own games by venue for home advantage (criterion 253) — `null` for a game with no location (criterion 251). */
  locationId: string | null;
  locationName: string | null;
  rosterId: string;
  rosterName: string | null;
}

export interface BoardGamePlayerRow {
  gameId: string;
  playerId: string;
  displayName: string;
  /** Seating order within the game — unused by the board itself, only by `lib/board/facts.ts`'s "a random old night". Fetched here anyway so that module never needs a query of its own for it. */
  columnOrder: number;
  finalScore: number;
}

export interface BoardRoundScoreRow {
  gameId: string;
  playerId: string;
  hand: number;
  score: number;
}

/**
 * The three tables' raw rows, plus the groupings every one of `getBoard()`'s
 * records and every one of `getFunFacts()`'s generators (`lib/board/facts.ts`)
 * both need, computed exactly once. This **is** the module's actual
 * three-query fetch — see the module doc comment above for why it's exposed.
 */
export interface BoardData {
  gameRows: readonly BoardGameRow[];
  gamePlayerRows: readonly BoardGamePlayerRow[];
  roundScoreRows: readonly BoardRoundScoreRow[];
  gamesById: ReadonlyMap<string, BoardGameRow>;
  gamePlayersByGame: ReadonlyMap<string, readonly BoardGamePlayerRow[]>;
  /** Each game's winner(s) — criterion 214's "second place" is `getBoard()`'s own further step, not shared, since only the board needs it. */
  winnerIdsByGame: ReadonlyMap<string, readonly string[]>;
  rosterNameByGame: ReadonlyMap<string, string>;
}

function emptyBoardData(): BoardData {
  return {
    gameRows: [],
    gamePlayerRows: [],
    roundScoreRows: [],
    gamesById: new Map(),
    gamePlayersByGame: new Map(),
    winnerIdsByGame: new Map(),
    rosterNameByGame: new Map(),
  };
}

/**
 * The three-query fetch shared by `getBoard()` and `lib/board/facts.ts`'s
 * `getFunFacts()`. Callers needing both call this once and pass the result to
 * each — `app/page.tsx`'s board page does exactly that — rather than each
 * independently re-querying and re-grouping the identical `game` /
 * `game_player` / `round_score` rows.
 */
export async function getBoardData(): Promise<BoardData> {
  const db = getDb();

  // Query 1 of 3: every game, with its location and roster names attached.
  const gameRows: BoardGameRow[] = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      createdAt: game.createdAt,
      locationId: game.locationId,
      locationName: location.name,
      rosterId: game.rosterId,
      rosterName: roster.name,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id));

  if (gameRows.length === 0) return emptyBoardData();

  // Queries 2 and 3 of 3: every game_player row (with display names and
  // column order attached) and every round_score row in the archive. Neither
  // depends on the other's result — only the early return above depends on
  // query 1, and only on its emptiness — so they run concurrently.
  const [gamePlayerRows, roundScoreRows]: [BoardGamePlayerRow[], BoardRoundScoreRow[]] = await Promise.all([
    db
      .select({
        gameId: gamePlayer.gameId,
        playerId: gamePlayer.playerId,
        displayName: player.displayName,
        columnOrder: gamePlayer.columnOrder,
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
      .from(roundScore)
      // Deterministic order (natural key, ascending — the same convention
      // `lib/games/queries.ts` and `lib/games/export.ts` use for one game's
      // own `round_score` rows, extended here with `gameId` first since this
      // query spans the whole archive): without it, which of two hands tied
      // for the catastrophe (criterion 230) is treated as "first" when
      // `buildSingleEventRecord` below walks these rows can differ across
      // reads with no data change at all.
      .orderBy(roundScore.gameId, roundScore.hand, roundScore.playerId),
  ]);

  const gamesById = new Map(gameRows.map((g) => [g.id, g]));

  const gamePlayersByGame = new Map<string, BoardGamePlayerRow[]>();
  for (const row of gamePlayerRows) {
    const arr = gamePlayersByGame.get(row.gameId) ?? [];
    arr.push(row);
    gamePlayersByGame.set(row.gameId, arr);
  }

  // Each game's winner(s) and effective roster name, computed once and
  // reused by both this module and `lib/board/facts.ts`.
  const winnerIdsByGame = new Map<string, string[]>();
  const rosterNameByGame = new Map<string, string>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    winnerIdsByGame.set(gameId, determineWinners(scores));
    const g = gamesById.get(gameId)!;
    rosterNameByGame.set(gameId, g.rosterName ?? rosterDisplayName(rows.map((r) => r.displayName)));
  }

  return { gameRows, gamePlayerRows, roundScoreRows, gamesById, gamePlayersByGame, winnerIdsByGame, rosterNameByGame };
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
 *
 * `data` is `getBoardData()`'s own result — pass it in when the caller
 * already has it (the board page does, to avoid fetching it twice over, once
 * here and once for `getFunFacts()`); left out, this fetches it itself, so
 * every existing standalone call site keeps working unchanged.
 */
export async function getBoard(data?: BoardData): Promise<Board> {
  const { gameRows, gamePlayerRows, gamePlayersByGame, winnerIdsByGame, rosterNameByGame, roundScoreRows, gamesById } =
    data ?? (await getBoardData());

  if (gameRows.length === 0) return { empty: true };

  // ---------------------------------------------------------------------
  // Everything below is in-memory work over the rows above — no further
  // database access, and none of it re-runs per player or per game.
  // ---------------------------------------------------------------------

  // Second place(s) (criterion 214) and biggest hammering's own candidates
  // (criterion 232) — the two groupings `getBoard()` needs beyond what's
  // already shared with `getFunFacts()` via `data` (winners, roster names),
  // since only the board itself has a "nearly man" record and a biggest
  // hammering. ⚠️ `secondPlace(scores)` is called exactly once per game here
  // — `winningMargin` (Stage 2's own function) would recompute it internally
  // (and `winningScore` a second time on top), so the margin is derived
  // directly from this same `second` instead of calling `winningMargin`
  // again, avoiding tripling the work `getBoard()` already does on every `/`
  // page load.
  const secondPlaceIdsByGame = new Map<string, string[]>();
  const hammeringInstances: HammeringInstance[] = [];
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    const second = secondPlace(scores);
    secondPlaceIdsByGame.set(gameId, second?.playerIds ?? []);
    const winning = winningScore(scores);
    const margin = winning !== null && second !== null ? second.score - winning : null;
    if (margin !== null) hammeringInstances.push({ gameId, margin, winnerIds: [...(winnerIdsByGame.get(gameId) ?? [])] });
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
    extra: Pick<
      RecordGame,
      "roundsWonByHolder" | "streakOwner" | "singleEventValue" | "singleEventHand"
    > = {},
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

  // ================================================================
  // Stage 3's five single-event records (criteria 228–232) — a different
  // assembly path from the seven above by design (spec decision 17): each
  // holder is a (player, game[, hand]) instance, not a unique player with a
  // career game count, so `buildRecord`'s player-keyed `Map` doesn't fit.
  // `buildSingleEventRecord` is the one shared mechanism for all five,
  // exactly as `buildRecord` is for the other seven.
  // ================================================================

  // Bound once to this call's own `displayNameByPlayer`/`gamesById` — the
  // shared `toSingleEventHolder` (this module's own export, above) is a
  // context-free pure function, so every call site below just supplies it.
  const holderCtx: SingleEventHolderContext = { displayNameByPlayer, gamesById };
  const holderFor = (playerId: string, gameId: string, hand?: number): SingleEventHolder =>
    toSingleEventHolder(holderCtx, playerId, gameId, hand);

  /**
   * One single-event record's whole assembly: `extreme` is already the
   * winning value and every tied instance (`bestGameEver` et al.'s own
   * result, normalised to `{ value, instances }` at the call site below).
   * `holdersFor` expands one instance into its holder(s) — one, except a
   * shared-win hammering instance, which names every co-winner against the
   * one game. Mirrors `buildRecord`'s "find the best, collect every tied
   * holder, assemble the card" shape, for this stage's different holder unit.
   */
  function buildSingleEventRecord<T>(
    key: SingleEventRecordKey,
    extreme: { value: number; instances: readonly T[] } | null,
    holdersFor: (instance: T) => SingleEventHolder[],
    gameFor: (instance: T) => RecordGame,
  ): SingleEventBoardRecord {
    if (extreme === null) return { key, value: null, holders: [], games: [] };

    const holders = extreme.instances
      .flatMap(holdersFor)
      .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

    // `games` is deduplicated by game id, newest first — the same convention
    // `unionGamesNewestFirst` uses for the other seven records (criterion
    // 234's "the games list's own row format"). `holders` above is
    // deliberately *not* deduplicated: two players tied in the same game are
    // two instances (criterion 228) sharing one row here, which is exactly
    // how a shared aggregate win already renders (one game, several names).
    //
    // ⚠️ The catastrophe (criterion 230) is the one record where two
    // *different hands* of the same game can each independently tie for the
    // extreme value — two genuinely different single-hand events that happen
    // to share a game id. Deduping by game id alone would silently keep only
    // whichever instance this loop reached first, which — before the
    // `round_score` query above had a deterministic `ORDER BY` — could even
    // change across reads with no data change. The key below folds in
    // `singleEventHand` too, so those two hands survive as two rows; every
    // other single-event record never sets `singleEventHand`, so its own
    // dedup is unaffected — still exactly one row per game id.
    const seenKeys = new Set<string>();
    const games: RecordGame[] = [];
    for (const instance of extreme.instances) {
      const g = gameFor(instance);
      const key = g.singleEventHand === undefined ? g.id : `${g.id} ${g.singleEventHand}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      games.push(g);
    }
    // Newest game first; two rows sharing one game (the catastrophe's
    // two-hand case) are equal under `sortNewestFirst` and so keep the order
    // they were pushed in above — itself already deterministic, since that
    // order follows `extreme.instances`, which in turn follows the
    // `round_score` query's own `ORDER BY` (`Array.prototype.sort` is a
    // stable sort).
    games.sort((a, b) => sortNewestFirst(a.id, b.id));

    return { key, value: extreme.value, holders, games };
  }

  // ----------------------------------------------------- best/worst game ever
  const finalScoreInstances: FinalScoreInstance[] = gamePlayerRows.map((r) => ({
    playerId: r.playerId,
    gameId: r.gameId,
    score: r.finalScore,
  }));

  const bestGameResult = bestGameEver(finalScoreInstances);
  const bestGameEverRecord = buildSingleEventRecord(
    "bestGameEver",
    bestGameResult && { value: bestGameResult.score, instances: bestGameResult.instances },
    (i) => [holderFor(i.playerId, i.gameId)],
    (i) => toRecordGame(i.gameId, { singleEventValue: i.score }),
  );

  const worstGameResult = worstGameEver(finalScoreInstances);
  const worstGameEverRecord = buildSingleEventRecord(
    "worstGameEver",
    worstGameResult && { value: worstGameResult.score, instances: worstGameResult.instances },
    (i) => [holderFor(i.playerId, i.gameId)],
    (i) => toRecordGame(i.gameId, { singleEventValue: i.score }),
  );

  // -------------------------------------------------------------- catastrophe
  // `roundScoreRows` already has exactly `SingleHandInstance`'s shape
  // (playerId, gameId, hand, score) — passed straight through, no remapping.
  const catastropheResult = catastrophe(roundScoreRows);
  const catastropheRecord = buildSingleEventRecord(
    "catastrophe",
    catastropheResult && { value: catastropheResult.score, instances: catastropheResult.instances },
    (i) => [holderFor(i.playerId, i.gameId, i.hand)],
    (i) => toRecordGame(i.gameId, { singleEventValue: i.score, singleEventHand: handLabel(i.hand) }),
  );

  // ------------------------------------------------------------ cleanest sheet
  const zeroCounts = zeroHandCountsByPlayerGame(roundScoreRows);
  const cleanestSheetResult = cleanestSheet(zeroCounts);
  const cleanestSheetRecord = buildSingleEventRecord(
    "cleanestSheet",
    cleanestSheetResult && { value: cleanestSheetResult.count, instances: cleanestSheetResult.instances },
    (i) => [holderFor(i.playerId, i.gameId)],
    (i) => toRecordGame(i.gameId, { singleEventValue: i.count }),
  );

  // ---------------------------------------------------------- biggest hammering
  // `hammeringInstances` was built above, one per game with a second place at
  // all — the margin derived from that same per-game `secondPlace` call, not
  // `winningMargin` (Stage 2's own function, which would recompute it).
  const hammeringResult = biggestHammering(hammeringInstances);
  const biggestHammeringRecord = buildSingleEventRecord(
    "biggestHammering",
    hammeringResult && { value: hammeringResult.margin, instances: hammeringResult.instances },
    (i) => i.winnerIds.map((playerId) => holderFor(playerId, i.gameId)),
    (i) => toRecordGame(i.gameId, { singleEventValue: i.margin }),
  );

  // ================================================================
  // Stage 4's thirteenth record — home advantage (criteria 253–254, 268–269).
  // A third assembly path again (spec decision, this stage): the holder unit
  // is a (player, venue) pair, so neither `buildRecord`'s player-keyed map
  // nor `buildSingleEventRecord`'s (player, game[, hand]) shape fits. No new
  // query: every input below is `gamesByPlayer` and `gamesById` (already
  // built above from this call's own three queries), just regrouped by venue.
  // ================================================================

  // Per player: their own tallies at each known venue, and their own known-
  // venue totals (criterion 253: "elsewhere" is every *other* known venue,
  // never a game with no location — criterion 251's narrowing, applied here).
  interface VenueTally {
    locationName: string;
    wins: number;
    games: number;
  }
  const venueTalliesByPlayer = new Map<string, Map<string, VenueTally>>();
  const knownVenueTotalByPlayer = new Map<string, { wins: number; games: number }>();

  for (const [playerId, games] of gamesByPlayer) {
    const byVenue = new Map<string, VenueTally>();
    let totalWins = 0;
    let totalGames = 0;
    for (const g of games) {
      const locationId = gamesById.get(g.gameId)!.locationId;
      if (!locationId) continue; // criterion 251: unlocated games are in neither side.
      totalGames += 1;
      if (g.won) totalWins += 1;
      const tally = byVenue.get(locationId) ?? {
        locationName: gamesById.get(g.gameId)!.locationName ?? "",
        wins: 0,
        games: 0,
      };
      tally.games += 1;
      if (g.won) tally.wins += 1;
      byVenue.set(locationId, tally);
    }
    venueTalliesByPlayer.set(playerId, byVenue);
    knownVenueTotalByPlayer.set(playerId, { wins: totalWins, games: totalGames });
  }

  const homeAdvantageCandidates: HomeAdvantageCandidate[] = [];
  for (const [playerId, byVenue] of venueTalliesByPlayer) {
    const total = knownVenueTotalByPlayer.get(playerId)!;
    for (const [locationId, tally] of byVenue) {
      homeAdvantageCandidates.push({
        playerId,
        displayName: displayNameByPlayer.get(playerId)!,
        locationId,
        locationName: tally.locationName,
        hereWins: tally.wins,
        hereGames: tally.games,
        elsewhereWins: total.wins - tally.wins,
        elsewhereGames: total.games - tally.games,
      });
    }
  }

  const homeAdvantageResult = homeAdvantage(homeAdvantageCandidates);
  const homeAdvantageHolders: HomeAdvantageBoardRecord["holders"] = homeAdvantageResult.holders.map((h) => {
    const games = (gamesByPlayer.get(h.playerId) ?? [])
      .filter((g) => gamesById.get(g.gameId)!.locationId === h.locationId)
      .map((g) => g.gameId)
      .sort(sortNewestFirst)
      .map((id) => toRecordGame(id));
    return { ...h, games };
  });

  const homeAdvantageRecord: HomeAdvantageBoardRecord = {
    gapPercentagePoints: homeAdvantageResult.gapPercentagePoints,
    holders: homeAdvantageHolders,
  };

  return {
    empty: false,
    archiveGameCount: gameRows.length,
    earlyDays: gameRows.length < EARLY_DAYS_BELOW,
    records: [mostWins, mostWinsInARow, lowestAverageScore, mostRoundsWon, stalwart, droughtRecord, nearlyMan],
    singleEventRecords: [
      bestGameEverRecord,
      worstGameEverRecord,
      catastropheRecord,
      cleanestSheetRecord,
      biggestHammeringRecord,
    ],
    homeAdvantage: homeAdvantageRecord,
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
