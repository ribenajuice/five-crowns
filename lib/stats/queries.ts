/**
 * `/stats` — the catalogue index, PRD criteria 236–242 — "the slices that
 * belong to nobody in particular" (spec decision 8): the eleven-hand trend,
 * hand-by-hand villains, the biggest single-hand disasters, and the two
 * averages tables (every player's, every roster's). Best/worst game ever
 * also render here (criterion 241), from the **same** `bestGameEver` /
 * `worstGameEver` functions the board is built on — never a second
 * implementation — so the two screens cannot disagree. Stage 4 adds two more
 * plain tables, day of the week and time of year (criteria 265–267).
 *
 * `getStatsPage()` is this module's one entry point: **three bounded
 * queries** (every game, every `game_player` row, every `round_score` row)
 * — the identical shape `lib/board/queries.ts`'s `getBoard()` uses, so this
 * page's own query count does not grow with the archive either (criteria
 * 248, 273). No `roster_member` query: a roster's games are, by construction,
 * every game whose `rosterId` matches (exact-set matching,
 * `lib/games/save.ts`), so grouping the already-fetched `game_player` rows
 * by their game's `rosterId` **is** that roster's own score list — gathered,
 * not rebuilt, the same shape spec decision 15 already established for
 * per-roster win rates. Stage 4's two time tables are built the same way:
 * `gamePlayerRows` (query 2) tagged with each game's own `playedOn` (already
 * in `gamesById`, from query 1) is all `dayOfWeekTable`/`timeOfYearTable`
 * (`lib/scoring/calendar.ts`) need — no third table, no fourth query.
 *
 * ⚠️ **Nothing here is cached, precomputed or summarised** (criterion 246,
 * restating 189): a delete, an edit or a merge is reflected on the very next
 * call.
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, player, roster, roundScore } from "@/lib/db/schema";
import {
  averageFinalScore,
  bestGameEver,
  biggestSingleHandDisasters,
  compareDisplayNames,
  dayOfWeekTable,
  handLabel,
  handsBledOn,
  perHandMeans,
  rosterDisplayName,
  timeOfYearTable,
  worstGameEver,
  type FinalScoreInstance,
  type GameHandScoreRow,
  type HandLabel,
  type HandMean,
  type TimeSliceInput,
  type TimeSliceRow,
} from "@/lib/scoring";
import { toSingleEventHolder, type SingleEventHolder, type SingleEventHolderContext } from "@/lib/board/queries";

/** Criterion 240's own named constant: the disasters list's length (ties at the cutoff run past it). */
export const SINGLE_HAND_DISASTERS = 10;

interface GameRow {
  id: string;
  playedOn: string;
  createdAt: string;
  rosterId: string;
  rosterName: string | null;
}

interface GamePlayerRow {
  gameId: string;
  playerId: string;
  displayName: string;
  finalScore: number;
}

export interface StatsSingleEventSummary {
  value: number;
  /** Every (player, game) instance tied for the value — same holder unit as the board's own record (criterion 228/229). */
  holders: SingleEventHolder[];
}

export interface VillainRow {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  /** This player's own per-hand means (criterion 226) — `[]` only for the defensive no-round_score-rows case. */
  hands: HandMean[];
  /** Every hand tied for this player's own highest mean (criterion 239's "own worst hand marked"). */
  worstHands: HandLabel[];
}

export interface DisasterRow {
  playerId: string;
  displayName: string;
  gameId: string;
  playedOn: string;
  hand: HandLabel;
  score: number;
}

export interface PlayerAverageRow {
  playerId: string;
  displayName: string;
  average: number;
  gamesPlayed: number;
}

export interface RosterAverageRow {
  rosterId: string;
  displayName: string;
  average: number;
  gamesPlayed: number;
  /** How many final scores that average is drawn from (criterion 224). */
  scoresCount: number;
}

export type StatsPage =
  | { empty: true }
  | {
      empty: false;
      /** Criterion 237 — eleven values, archive-wide, one per hand. */
      trend: HandMean[];
      /** Criterion 241 — identical function to the board's own `bestGameEver` record. */
      bestGameEver: StatsSingleEventSummary | null;
      worstGameEver: StatsSingleEventSummary | null;
      /** Criterion 239 — every player against the eleven hands. Alphabetical. */
      villains: VillainRow[];
      /** Criterion 240 — the `SINGLE_HAND_DISASTERS` biggest, ties at the cutoff all included. */
      disasters: DisasterRow[];
      /** Criterion 242 — every player's own average final score. Alphabetical. */
      playerAverages: PlayerAverageRow[];
      /** Criterion 242 — every roster's own table average. Alphabetical. */
      rosterAverages: RosterAverageRow[];
      /** Criterion 265 — seven rows, Monday through Sunday, always all present. */
      dayOfWeek: TimeSliceRow[];
      /** Criterion 266 — twelve rows, January through December, always all present. */
      timeOfYear: TimeSliceRow[];
    };

/**
 * The whole catalogue index, computed fresh from stored rows. See this
 * module's doc comment for the criteria this satisfies and its query-count
 * claim.
 */
export async function getStatsPage(): Promise<StatsPage> {
  const db = getDb();

  const gameRows: GameRow[] = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      createdAt: game.createdAt,
      rosterId: game.rosterId,
      rosterName: roster.name,
    })
    .from(game)
    .innerJoin(roster, eq(game.rosterId, roster.id));

  if (gameRows.length === 0) return { empty: true };

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
  // Everything below is in-memory work over the three row sets above.
  // ---------------------------------------------------------------------

  const gamesById = new Map(gameRows.map((g) => [g.id, g]));
  const displayNameByPlayer = new Map<string, string>();
  for (const row of gamePlayerRows) displayNameByPlayer.set(row.playerId, row.displayName);

  // The same holder-formatting function `getBoard()` uses (`lib/board/queries.ts`)
  // — bound once to this call's own maps — so the board and `/stats` can
  // never silently disagree on how the same holder data is displayed.
  const holderCtx: SingleEventHolderContext = { displayNameByPlayer, gamesById };
  const holderFor = (playerId: string, gameId: string): SingleEventHolder =>
    toSingleEventHolder(holderCtx, playerId, gameId);

  // ------------------------------------------------------ best/worst game ever
  const finalScoreInstances: FinalScoreInstance[] = gamePlayerRows.map((r) => ({
    playerId: r.playerId,
    gameId: r.gameId,
    score: r.finalScore,
  }));

  const bestGameResult = bestGameEver(finalScoreInstances);
  const worstGameResult = worstGameEver(finalScoreInstances);

  function toSummary(
    extreme: { score: number; instances: readonly FinalScoreInstance[] } | null,
  ): StatsSingleEventSummary | null {
    if (!extreme) return null;
    return {
      value: extreme.score,
      holders: extreme.instances
        .map((i) => holderFor(i.playerId, i.gameId))
        .sort((a, b) => compareDisplayNames(a.displayName, b.displayName)),
    };
  }

  // ------------------------------------------------------------------- trend
  const trend = perHandMeans(roundScoreRows);

  // ---------------------------------------------------------------- villains
  const roundsByPlayer = new Map<string, GameHandScoreRow[]>();
  for (const row of roundScoreRows) {
    const arr = roundsByPlayer.get(row.playerId) ?? [];
    arr.push(row);
    roundsByPlayer.set(row.playerId, arr);
  }

  const gamesPlayedByPlayer = new Map<string, number>();
  for (const row of gamePlayerRows) {
    gamesPlayedByPlayer.set(row.playerId, (gamesPlayedByPlayer.get(row.playerId) ?? 0) + 1);
  }

  const villains: VillainRow[] = [...gamesPlayedByPlayer.entries()]
    .map(([playerId, gamesPlayed]) => {
      const hands = perHandMeans(roundsByPlayer.get(playerId) ?? []);
      const bled = handsBledOn(hands);
      return {
        playerId,
        displayName: displayNameByPlayer.get(playerId)!,
        gamesPlayed,
        hands,
        worstHands: bled?.hands ?? [],
      };
    })
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  // --------------------------------------------------------------- disasters
  const disasters: DisasterRow[] = biggestSingleHandDisasters(roundScoreRows, SINGLE_HAND_DISASTERS)
    .map((i) => ({
      playerId: i.playerId,
      displayName: displayNameByPlayer.get(i.playerId)!,
      gameId: i.gameId,
      playedOn: gamesById.get(i.gameId)!.playedOn,
      hand: handLabel(i.hand)!,
      score: i.score,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareDisplayNames(a.displayName, b.displayName) ||
        (a.playedOn < b.playedOn ? 1 : a.playedOn > b.playedOn ? -1 : 0),
    );

  // ---------------------------------------------------------- player averages
  const scoresByPlayer = new Map<string, number[]>();
  for (const row of gamePlayerRows) {
    const arr = scoresByPlayer.get(row.playerId) ?? [];
    arr.push(row.finalScore);
    scoresByPlayer.set(row.playerId, arr);
  }

  const playerAverages: PlayerAverageRow[] = [...scoresByPlayer.entries()]
    .map(([playerId, scores]) => {
      const avg = averageFinalScore(scores)!;
      return {
        playerId,
        displayName: displayNameByPlayer.get(playerId)!,
        average: avg.average,
        gamesPlayed: avg.gamesPlayed,
      };
    })
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  // ---------------------------------------------------------- roster averages
  const scoresByRoster = new Map<string, number[]>();
  const gameIdsByRoster = new Map<string, Set<string>>();
  for (const row of gamePlayerRows) {
    const g = gamesById.get(row.gameId)!;
    const scores = scoresByRoster.get(g.rosterId) ?? [];
    scores.push(row.finalScore);
    scoresByRoster.set(g.rosterId, scores);

    const gameIds = gameIdsByRoster.get(g.rosterId) ?? new Set<string>();
    gameIds.add(row.gameId);
    gameIdsByRoster.set(g.rosterId, gameIds);
  }

  const memberNamesByRoster = new Map<string, Set<string>>();
  for (const row of gamePlayerRows) {
    const g = gamesById.get(row.gameId)!;
    const names = memberNamesByRoster.get(g.rosterId) ?? new Set<string>();
    names.add(row.displayName);
    memberNamesByRoster.set(g.rosterId, names);
  }

  const rosterNameById = new Map<string, string | null>();
  for (const g of gameRows) rosterNameById.set(g.rosterId, g.rosterName);

  const rosterAverages: RosterAverageRow[] = [...scoresByRoster.entries()]
    .map(([rosterId, scores]) => {
      const avg = averageFinalScore(scores)!;
      const customName = rosterNameById.get(rosterId) ?? null;
      const displayName = customName ?? rosterDisplayName([...(memberNamesByRoster.get(rosterId) ?? [])]);
      return {
        rosterId,
        displayName,
        average: avg.average,
        gamesPlayed: gameIdsByRoster.get(rosterId)?.size ?? 0,
        scoresCount: scores.length,
      };
    })
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  // ----------------------------------------------------------- time slices
  // Stage 4 (criteria 265–266): no new query — every input is already `game`
  // (query 1) and `game_player` (query 2)'s own rows, joined in memory via
  // `gamesById`. Criterion 255: `dayOfWeekTable`/`timeOfYearTable` derive the
  // weekday/month straight off `played_on`'s stored string, no `Date` built.
  const timeSliceRows: TimeSliceInput[] = gamePlayerRows.map((r) => ({
    gameId: r.gameId,
    playedOn: gamesById.get(r.gameId)!.playedOn,
    finalScore: r.finalScore,
  }));
  const dayOfWeek = dayOfWeekTable(timeSliceRows);
  const timeOfYear = timeOfYearTable(timeSliceRows);

  return {
    empty: false,
    trend,
    bestGameEver: toSummary(bestGameResult),
    worstGameEver: toSummary(worstGameResult),
    villains,
    disasters,
    playerAverages,
    rosterAverages,
    dayOfWeek,
    timeOfYear,
  };
}
