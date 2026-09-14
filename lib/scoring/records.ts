/**
 * The records board's definitions — PRD criteria 175–178.
 *
 * Four pure functions, beside `determineWinners` (`./winners.ts`) and the hand
 * derivation (`./hands.ts`): round winner, most rounds won, a streak, and the
 * lowest average score. Nothing here touches the database — `lib/board/queries.ts`
 * feeds these the rows it already fetched, and is the only thing that knows
 * where a `player_id` or a `game_id` comes from.
 *
 * Pure and dependency-free, same as the rest of `lib/scoring`.
 */

import { determineWinners, type PlayerScore } from "./winners";

/* --------------------------------------------------------- round winner (175) */

/** One player's score in one hand of one game — exactly `round_score`'s shape. */
export interface HandScoreRow {
  playerId: string;
  /** 1 = the 3s hand … 11 = Kings. Positional (`lib/scoring/constants.ts`). */
  hand: number;
  score: number;
}

/**
 * Every hand's holder(s), for one game's `round_score` rows.
 *
 * ⚠️ **Ties are shared and are the common case** — several players routinely
 * go out clean in the early hands, so a hand with three holders is ordinary.
 * Reuses `determineWinners`, so the "lowest score wins, ties shared" rule is
 * defined in exactly one place for both a whole game and a single hand.
 *
 * Only hands actually present in `rows` appear in the result — a complete
 * saved game has all eleven, but nothing here assumes that.
 */
export function roundWinners(rows: readonly HandScoreRow[]): Map<number, string[]> {
  const byHand = new Map<number, PlayerScore[]>();
  for (const row of rows) {
    const scores = byHand.get(row.hand) ?? [];
    scores.push({ playerId: row.playerId, score: row.score });
    byHand.set(row.hand, scores);
  }

  const winners = new Map<number, string[]>();
  for (const [hand, scores] of byHand) {
    winners.set(hand, determineWinners(scores));
  }
  return winners;
}

/* ------------------------------------------------------ most rounds won (176) */

/** A `round_score` row tagged with the game it belongs to. */
export interface GameHandScoreRow extends HandScoreRow {
  gameId: string;
}

export interface RoundsWonBreakdown {
  /**
   * Hands held per player, across every game supplied — a shared hand counts
   * **in full for each holder** (criterion 176). This is "most rounds won"'s
   * number; it may legitimately disagree with "most wins" and nothing here
   * reconciles the two.
   */
  totalByPlayer: Map<string, number>;
  /**
   * The same count, broken down per game, so a drill-through can show
   * "{Player} took {n} of 11 rounds" against each game without a second pass
   * over the rows (criterion 186).
   */
  byPlayerAndGame: Map<string, Map<string, number>>;
}

/**
 * `roundWinners`, applied across every game supplied and tallied per player.
 *
 * Rows from more than one game may be interleaved in any order — grouping by
 * `gameId` happens here, so a caller can hand this every `round_score` row in
 * the archive in one pass.
 */
export function roundsWon(rows: readonly GameHandScoreRow[]): RoundsWonBreakdown {
  const byGame = new Map<string, HandScoreRow[]>();
  for (const row of rows) {
    const arr = byGame.get(row.gameId) ?? [];
    arr.push(row);
    byGame.set(row.gameId, arr);
  }

  const totalByPlayer = new Map<string, number>();
  const byPlayerAndGame = new Map<string, Map<string, number>>();

  for (const [gameId, gameRows] of byGame) {
    for (const winners of roundWinners(gameRows).values()) {
      for (const playerId of winners) {
        totalByPlayer.set(playerId, (totalByPlayer.get(playerId) ?? 0) + 1);

        const perGame = byPlayerAndGame.get(playerId) ?? new Map<string, number>();
        perGame.set(gameId, (perGame.get(gameId) ?? 0) + 1);
        byPlayerAndGame.set(playerId, perGame);
      }
    }
  }

  return { totalByPlayer, byPlayerAndGame };
}

/* ------------------------------------------------------------- a streak (177) */

/** One game a player played, in enough shape to place it in sequence and know if they won it. */
export interface StreakGame {
  gameId: string;
  /** ISO date — the primary sort key, matching the games list's own order. */
  playedOn: string;
  /** Tie-break for two games on the same date. */
  createdAt: string;
  /** Whether this player held the lowest score in this game — shared wins count. */
  won: boolean;
}

export interface Streak {
  /** The longest run ever recorded — not the current run. */
  length: number;
  /** That run's games, oldest → newest (the order the streak was actually played in). */
  gameIds: string[];
}

const EMPTY_STREAK: Streak = { length: 0, gameIds: [] };

/**
 * The longest-ever run of consecutive wins in this player's own games.
 *
 * `games` must be **every game this player played** — nothing else. A game
 * they did not play is already absent from the array, which is exactly what
 * makes it neither extend nor break a streak (criterion 177): this function
 * never sees it. Games are re-sorted here by `playedOn` then `createdAt`, so
 * caller order never matters.
 *
 * On a tie for longest, the earliest such run is returned — the length is the
 * same either way, and this only decides which games a tied streak's
 * drill-through points at.
 */
export function longestStreak(games: readonly StreakGame[]): Streak {
  const sorted = [...games].sort((a, b) => {
    if (a.playedOn !== b.playedOn) return a.playedOn < b.playedOn ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return 0;
  });

  let best: Streak = EMPTY_STREAK;
  let current: string[] = [];

  for (const game of sorted) {
    if (!game.won) {
      current = [];
      continue;
    }
    current.push(game.gameId);
    if (current.length > best.length) {
      best = { length: current.length, gameIds: [...current] };
    }
  }

  return best;
}

/* ---------------------------------------------------- lowest average (178) */

export interface AverageScore {
  /** Mean of `final_score`, rounded to one decimal place — lower is better. */
  average: number;
  /** The sample this average is drawn from (criterion 182). */
  gamesPlayed: number;
}

/**
 * The mean of a player's own `game_player.final_score`s — the same column the
 * game view, the player page and the CSV export already read, so no two
 * screens can disagree about a final score (criterion 178).
 *
 * `null` for an empty input: a player with no games has no average to state,
 * not a zero one.
 */
export function averageFinalScore(finalScores: readonly number[]): AverageScore | null {
  if (finalScores.length === 0) return null;
  const mean = finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length;
  return {
    average: Math.round(mean * 10) / 10,
    gamesPlayed: finalScores.length,
  };
}
