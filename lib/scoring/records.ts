/**
 * The records board's definitions — PRD criteria 175–178, extended by
 * Stage 2 (criteria 197–199, 212, 214–215) with second place, the winning
 * margin, the drought, head-to-head and nemesis.
 *
 * Pure functions, beside `determineWinners` (`./winners.ts`) and the hand
 * derivation (`./hands.ts`): round winner, most rounds won, a streak, the
 * lowest average score, second place, the drought, head-to-head and nemesis.
 * Nothing here touches the database — `lib/board/queries.ts` and
 * `lib/players/rivalry.ts` feed these the rows they already fetched, and are
 * the only things that know where a `player_id` or a `game_id` comes from.
 *
 * Pure and dependency-free, same as the rest of `lib/scoring`.
 */

import { compareDisplayNames } from "./names";
import { determineWinners, winningScore, type PlayerScore } from "./winners";

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

/* -------------------------------------------------------- second place (214) */

/**
 * Every player holding the second-lowest **distinct** final score in one
 * game — never the winners themselves.
 */
export interface SecondPlace {
  /** The second-lowest distinct score. */
  score: number;
  /** Every player on that score, in the order supplied (same convention as `determineWinners`). */
  playerIds: string[];
}

/**
 * Second place, defined **once for the whole project** (criterion 214) — the
 * function both *the nearly man* (`lib/board/queries.ts`, this stage) and
 * *biggest hammering* (Stage 3, criterion 215) are bound to, and may not
 * re-derive. Distinct score positions, ties shared, exactly like the winners
 * themselves:
 *
 * - The winners hold the lowest distinct score (`determineWinners`, unchanged).
 * - Second place is every player on the **next** distinct score up — not the
 *   next-ranked player, so a shared win still has a second place behind it.
 * - A game where every finite score ties the winners' has **no second place
 *   at all**: there is only one distinct score, and it belongs to the
 *   winners. Rejected: competition ranking (a two-way tie for first makes
 *   the next player third, nobody second) — see criterion 214's own note.
 *
 * `null` when there is no second place: an empty input, or an all-level game.
 * A winner can never also be a second place in the same game — the
 * definition makes it impossible rather than guarding against it.
 */
export function secondPlace(scores: readonly PlayerScore[]): SecondPlace | null {
  const finite = scores.filter((entry) => Number.isFinite(entry.score));
  if (finite.length === 0) return null;

  const winning = winningScore(finite);
  if (winning === null) return null;

  const above = finite.filter((entry) => entry.score > winning);
  if (above.length === 0) return null;

  const second = above.reduce(
    (lowest, entry) => (entry.score < lowest ? entry.score : lowest),
    above[0]!.score,
  );

  return {
    score: second,
    playerIds: above.filter((entry) => entry.score === second).map((entry) => entry.playerId),
  };
}

/**
 * The winning margin (criterion 215) — second place's score minus the
 * winning score, a positive integer. `null` wherever `secondPlace` is `null`,
 * so an all-level game contributes nothing rather than a false zero margin.
 */
export function winningMargin(scores: readonly PlayerScore[]): number | null {
  const winning = winningScore(scores);
  const second = secondPlace(scores);
  if (winning === null || second === null) return null;
  return second.score - winning;
}

/* ------------------------------------------------------------ the drought (212) */

/**
 * The longest-ever run of consecutive games this player was in **without**
 * winning — `longestStreak` (177), negated (criterion 212, spec decision
 * 14). Same order, same "a game they missed neither extends nor breaks it,"
 * same "a shared win counts as a win" — here, as ending the drought exactly
 * as it would end a streak — and the same **longest ever recorded**, not the
 * run they are on now. Written as its own function over the same `won` flag
 * `longestStreak` reads, rather than left as an inline negation at each call
 * site, precisely because that is where a second implementation would be
 * tempted to drift from the first.
 */
export function longestDrought(games: readonly StreakGame[]): Streak {
  return longestStreak(games.map((game) => ({ ...game, won: !game.won })));
}

/* ------------------------------------------------------- head-to-head (197-198) */

/** One game both players were in, already resolved to what head-to-head needs from it. */
export interface HeadToHeadGame {
  gameId: string;
  /** Whether player A held this game's own outright lowest score (M1's win, ties shared) — not "finished above B". */
  aWon: boolean;
  bWon: boolean;
  /** Final scores — all "finishing above" (198) ever compares. */
  aScore: number;
  bScore: number;
}

export interface HeadToHeadSide {
  wins: number;
  /** `wins / gamesTogether`, a fraction 0–1. */
  winRate: number;
  /**
   * Games this side finished strictly below (i.e. ahead of) the other
   * (criterion 198) — deliberately a different count from `wins` (spec
   * decision 12): "finishing above" is not "winning the night".
   */
  above: number;
  /** `above / gamesTogether`, a fraction 0–1. */
  aboveRate: number;
}

export interface HeadToHead {
  gamesTogether: number;
  a: HeadToHeadSide;
  b: HeadToHeadSide;
}

/**
 * Head-to-head between two players, over exactly the games supplied — the
 * caller's job is restricting that list to games both of them played
 * (criterion 197: "a game either of them played without the other is not in
 * the sample"). ⚠️ **One function, not two**: swap `a`/`b` in every
 * `HeadToHeadGame` and this returns the exact mirror image, which is the
 * whole of criterion 197's symmetry requirement — the two players' pages can
 * never disagree about the same pair.
 *
 * `wins` and `above` need not sum to `gamesTogether` for either player — a
 * game a third player won counts in `gamesTogether` and in neither `wins`
 * column, and a level final score between A and B counts in `gamesTogether`
 * and in neither `above` column. A win the two of them shared counts in full
 * for both (`aWon` and `bWon` can both be true for the same game).
 */
export function headToHead(games: readonly HeadToHeadGame[]): HeadToHead {
  const gamesTogether = games.length;
  let aWins = 0;
  let bWins = 0;
  let aAbove = 0;
  let bAbove = 0;

  for (const game of games) {
    if (game.aWon) aWins++;
    if (game.bWon) bWins++;
    if (game.aScore < game.bScore) aAbove++;
    else if (game.bScore < game.aScore) bAbove++;
    // Equal final scores are neither above nor below (criterion 198) —
    // counted in gamesTogether only.
  }

  const rate = (count: number) => (gamesTogether === 0 ? 0 : count / gamesTogether);

  return {
    gamesTogether,
    a: { wins: aWins, winRate: rate(aWins), above: aAbove, aboveRate: rate(aAbove) },
    b: { wins: bWins, winRate: rate(bWins), above: bAbove, aboveRate: rate(bAbove) },
  };
}

/* ------------------------------------------------------------- nemesis (199) */

export interface NemesisCandidate {
  playerId: string;
  displayName: string;
  /** The rate this opponent finished above the player (198), a fraction 0–1. */
  aboveRate: number;
  gamesTogether: number;
}

export interface NemesisHolder {
  playerId: string;
  displayName: string;
  gamesTogether: number;
}

export interface NemesisResult {
  /** Every joint holder, alphabetical — empty when nobody qualifies (criterion 201). */
  holders: NemesisHolder[];
  /** The winning above-rate, as a percentage to one decimal place (criterion 199) — `null` iff `holders` is empty. */
  aboveRatePercent: number | null;
}

/**
 * A player's nemesis (criterion 199): the opponent(s) with the highest
 * above-rate against them, among every opponent they have shared at least
 * one game with. ⚠️ **An above-rate of exactly zero never holds the title,
 * at any sample size** — an opponent who has never once finished above this
 * player is excluded outright, which is what stops an archive where nobody
 * has beaten this player from crowning someone anyway (criteria 199, 201).
 * With no candidates, or every candidate at zero, nobody qualifies.
 * ⚠️ **No secondary tie-break on games played** — every opponent on the
 * highest rate is a joint holder, alphabetical, exactly as criterion 181
 * requires of the board.
 *
 * Compares (and reports) the above-rate **rounded to one decimal place of a
 * percentage**, matching the precision criterion 199 itself states the rate
 * in — so two candidates who would read identically on screen are always
 * joint holders, never silently tie-broken at a precision nobody can see.
 */
export function nemesis(candidates: readonly NemesisCandidate[]): NemesisResult {
  const withPercent = candidates.map((c) => ({ ...c, percent: Math.round(c.aboveRate * 1000) / 10 }));

  let best = 0;
  for (const c of withPercent) {
    if (c.percent > best) best = c.percent;
  }
  if (best === 0) return { holders: [], aboveRatePercent: null };

  const holders = withPercent
    .filter((c) => c.percent === best)
    .map((c) => ({ playerId: c.playerId, displayName: c.displayName, gamesTogether: c.gamesTogether }))
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  return { holders, aboveRatePercent: best };
}
