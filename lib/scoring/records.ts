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

import { compareOldestFirst } from "./chronology";
import { handLabel, type HandLabel } from "./constants";
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
  const sorted = [...games].sort(compareOldestFirst);

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

/* --------------------------------------------------------- per-hand mean (225) */

/** One player's score in one hand — `HandScoreRow` in every field that matters here; kept separate so a caller need not carry a `playerId` it doesn't have. */
export interface HandScoreCell {
  hand: number;
  score: number;
}

export interface HandMean {
  /** 1 = the 3s hand … 11 = Kings. */
  hand: number;
  /** `HAND_LABELS[hand - 1]` — presentation, never a second source of truth for the hand number. */
  label: HandLabel;
  /** Mean `score` for this hand across every row supplied, to one decimal. */
  mean: number;
}

/**
 * Per-hand mean (criterion 225) — groups whatever `round_score` rows the
 * caller supplies by hand and averages each group. The same function serves
 * both scopes the PRD asks for: the whole archive's eleven-hand trend
 * (criterion 237, pass every row) and one player's own hand profile
 * (criterion 226, pass just their rows) — the grouping neither knows nor
 * cares whose rows they are.
 *
 * Only hands actually present in `rows` appear in the result, same convention
 * as `roundWinners`. A real saved game always has all eleven, so a player or
 * an archive with at least one game always gets all eleven back; this stays
 * correct for the defensive "no round_score rows at all" case tested
 * elsewhere in this stage's suite.
 */
export function perHandMeans(rows: readonly HandScoreCell[]): HandMean[] {
  const byHand = new Map<number, number[]>();
  for (const row of rows) {
    const scores = byHand.get(row.hand) ?? [];
    scores.push(row.score);
    byHand.set(row.hand, scores);
  }

  return [...byHand.entries()]
    .map(([hand, scores]) => ({
      hand,
      label: handLabel(hand)!,
      mean: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => a.hand - b.hand);
}

/* ------------------------------------------------------- the hand they bleed on (226) */

export interface HandsBledOn {
  /** Every hand tied for the highest mean — "Jo bleeds on 9s and Kings" is ordinary, not a tie-break failure. */
  hands: HandLabel[];
  mean: number;
}

/**
 * The hand(s) a player bleeds on (criterion 226): the highest mean(s) in
 * `means` (their own `perHandMeans` result). `null` for a player with no
 * hand data at all — never reachable for a real saved game, only for the
 * same defensive "no round_score rows" case Stage 1's most-rounds-won
 * already has to tolerate.
 */
export function handsBledOn(means: readonly HandMean[]): HandsBledOn | null {
  if (means.length === 0) return null;
  let best = means[0]!.mean;
  for (const m of means) if (m.mean > best) best = m.mean;
  return { mean: best, hands: means.filter((m) => m.mean === best).map((m) => m.label) };
}

/* ---------------------------------------------------- venue breakdown (250, 256-257, 259, 261) */

/** One player's own participation in one game, tagged with that game's venue — the input a venue breakdown is built from. */
export interface VenueParticipation {
  /** `null` for a game with no location — never folded into a real venue's own numbers (criterion 251). */
  locationId: string | null;
  locationName: string | null;
  playerId: string;
  finalScore: number;
  /** Whether this player held this game's own outright lowest score (M1's win, ties shared). */
  won: boolean;
}

export interface VenueBreakdownRow {
  locationId: string | null;
  locationName: string | null;
  playerId: string;
  gamesPlayed: number;
  wins: number;
  /** `wins / gamesPlayed`, a fraction 0–1 — format to one decimal of a percentage at render time. */
  winRate: number;
  /** This player's own average final score at this venue (criterion 178's function, restricted). */
  average: number;
}

/**
 * A venue slice, defined once (criterion 250) and read from two directions
 * (decision 29): grouped by (venue, player), never a second mean or a second
 * win-rate calculation anywhere else in the app. A player's own by-venue rows
 * (`lib/players/rivalry.ts`'s `getPlayerVenueStats`) call this with one
 * player's own participations, which — because `playerId` never varies in
 * that input — yields one row per venue for that player. A venue's own
 * per-player table (`lib/locations/queries.ts`'s `getVenuePage`) calls this
 * with one venue's own participations, which — because `locationId` never
 * varies there — yields one row per player at that venue. Same function,
 * different scoping at the call site; neither caller is "the real one."
 *
 * `won` must already be resolved per game (M1's winner rule, ties shared) by
 * the caller — this function only tallies, it never determines a winner
 * itself (criterion 250: no second winner rule).
 */
export function venueBreakdown(rows: readonly VenueParticipation[]): VenueBreakdownRow[] {
  const byKey = new Map<
    string,
    { locationId: string | null; locationName: string | null; playerId: string; scores: number[]; wins: number }
  >();

  for (const row of rows) {
    const key = `${row.locationId ?? ""}::${row.playerId}`;
    const entry = byKey.get(key) ?? {
      locationId: row.locationId,
      locationName: row.locationName,
      playerId: row.playerId,
      scores: [],
      wins: 0,
    };
    entry.scores.push(row.finalScore);
    if (row.won) entry.wins += 1;
    byKey.set(key, entry);
  }

  return [...byKey.values()].map((entry) => {
    const avg = averageFinalScore(entry.scores)!;
    return {
      locationId: entry.locationId,
      locationName: entry.locationName,
      playerId: entry.playerId,
      gamesPlayed: entry.scores.length,
      wins: entry.wins,
      winRate: entry.scores.length > 0 ? entry.wins / entry.scores.length : 0,
      average: avg.average,
    };
  });
}

/* ------------------------------------------------------- home advantage (253-254) */

/** One (player, venue) pair's raw tallies — the input `homeAdvantage` below is built from. */
export interface HomeAdvantageCandidate {
  playerId: string;
  displayName: string;
  locationId: string;
  locationName: string;
  hereWins: number;
  hereGames: number;
  /** Every *other* known venue's games/wins combined (criterion 253: unlocated games are in neither side). */
  elsewhereWins: number;
  elsewhereGames: number;
}

export interface HomeAdvantageSide {
  wins: number;
  games: number;
  /** One decimal of a percentage — the precision ties are judged at (criterion 254). */
  ratePercent: number;
}

export interface HomeAdvantageHolder {
  playerId: string;
  displayName: string;
  locationId: string;
  locationName: string;
  here: HomeAdvantageSide;
  elsewhere: HomeAdvantageSide;
  /** `here.ratePercent - elsewhere.ratePercent`, one decimal, always > 0 (criterion 254: zero or below never holds it). */
  gapPercentagePoints: number;
}

export interface HomeAdvantageResult {
  /** Every (player, venue) pair tied for the highest gap, alphabetical by player then venue (criterion 254). Empty iff `gapPercentagePoints` is `null`. */
  holders: HomeAdvantageHolder[];
  gapPercentagePoints: number | null;
}

function ratePercent(wins: number, games: number): number {
  return games === 0 ? 0 : Math.round((wins / games) * 1000) / 10;
}

/**
 * Home advantage (criteria 253–254) — the (player, venue) pair with the
 * largest gap between a player's own win rate at that venue and their win
 * rate everywhere else they're known to have played. ⚠️ **No minimum-games
 * floor, at either sample size** (decision 27) — three guards stand in its
 * place, the same *shape* `nemesis()` (above) uses for an above-rate of zero,
 * not the same function:
 *
 * - A candidate with no games at any *other* known venue (`elsewhereGames ===
 *   0`) contributes no pair at all — there is nothing to compare against, and
 *   they are simply absent, not a withheld case.
 * - A gap of zero or less never holds the record, at any sample size —
 *   `nemesis`'s own "zero never wins" rule, applied to a difference instead
 *   of a rate.
 * - **Ties are judged on the gap as displayed**, to one decimal of a
 *   percentage point, exactly like `nemesis`'s own above-rate comparison —
 *   two pairs whose printed gap matches are always joint holders.
 *
 * Joint holders are every (player, venue) pair on the highest gap, sorted
 * alphabetically by player then venue (criterion 254).
 */
export function homeAdvantage(candidates: readonly HomeAdvantageCandidate[]): HomeAdvantageResult {
  const withGap = candidates
    .filter((c) => c.elsewhereGames > 0)
    .map((c) => {
      const hereRate = ratePercent(c.hereWins, c.hereGames);
      const elsewhereRate = ratePercent(c.elsewhereWins, c.elsewhereGames);
      const gap = Math.round((hereRate - elsewhereRate) * 10) / 10;
      return { ...c, hereRate, elsewhereRate, gap };
    });

  let best = 0;
  for (const c of withGap) {
    if (c.gap > best) best = c.gap;
  }
  if (best <= 0) return { holders: [], gapPercentagePoints: null };

  const holders = withGap
    .filter((c) => c.gap === best)
    .map(
      (c): HomeAdvantageHolder => ({
        playerId: c.playerId,
        displayName: c.displayName,
        locationId: c.locationId,
        locationName: c.locationName,
        here: { wins: c.hereWins, games: c.hereGames, ratePercent: c.hereRate },
        elsewhere: { wins: c.elsewhereWins, games: c.elsewhereGames, ratePercent: c.elsewhereRate },
        gapPercentagePoints: c.gap,
      }),
    )
    .sort(
      (a, b) =>
        compareDisplayNames(a.displayName, b.displayName) || compareDisplayNames(a.locationName, b.locationName),
    );

  return { holders, gapPercentagePoints: best };
}

/* ---------------------------------------------- single-event records (228-232, 240) */

/**
 * The extremum in `items`, keyed by `value`, with **every** item tied for it
 * — never deduplicated by any field of `T`, which is exactly what a
 * single-event record needs (criterion 228: the same player can hold two
 * separate instances, one per game). The one assembly mechanism the five
 * records below and `biggestSingleHandDisasters` all share, so "find the
 * best and keep every tied item" is written once rather than five times —
 * the single-event counterpart to this module's own `bestHolders`-shaped
 * logic in `lib/board/queries.ts`, which is keyed by player instead.
 */
function pickExtreme<T>(
  items: readonly T[],
  value: (item: T) => number,
  better: (candidate: number, best: number) => boolean,
): { value: number; items: T[] } | null {
  if (items.length === 0) return null;
  let best = value(items[0]!);
  for (const item of items) {
    const v = value(item);
    if (better(v, best)) best = v;
  }
  return { value: best, items: items.filter((item) => value(item) === best) };
}

/** One (player, game) instance of a final score — best/worst game ever's own unit. */
export interface FinalScoreInstance {
  playerId: string;
  gameId: string;
  score: number;
}

export interface ExtremeFinalScore {
  score: number;
  /** Every (player, game) pair at that score — the same player can appear twice, once per game (criterion 228). */
  instances: FinalScoreInstance[];
}

/** Best game ever (criterion 228): the lowest `final_score` ever posted, every (player, game) pair that hit it. */
export function bestGameEver(instances: readonly FinalScoreInstance[]): ExtremeFinalScore | null {
  const picked = pickExtreme(instances, (i) => i.score, (candidate, best) => candidate < best);
  return picked && { score: picked.value, instances: picked.items };
}

/** Worst game ever (criterion 229): same shape, the highest. */
export function worstGameEver(instances: readonly FinalScoreInstance[]): ExtremeFinalScore | null {
  const picked = pickExtreme(instances, (i) => i.score, (candidate, best) => candidate > best);
  return picked && { score: picked.value, instances: picked.items };
}

/** One (player, game, hand) instance of a single `round_score.score` — the catastrophe's and the disasters list's own unit. */
export interface SingleHandInstance {
  playerId: string;
  gameId: string;
  hand: number;
  score: number;
}

/**
 * The ten (or however many exist) biggest single-hand scores in the archive
 * (criterion 240, `SINGLE_HAND_DISASTERS`'s own definition lives with its
 * caller). ⚠️ **Ties at the cutoff are all kept** — the list runs past
 * `limit` rather than cutting a tied score, and an archive with fewer than
 * `limit` hands in it returns what exists. Sorted highest first.
 */
export function biggestSingleHandDisasters(
  instances: readonly SingleHandInstance[],
  limit: number,
): SingleHandInstance[] {
  if (instances.length === 0) return [];
  const sorted = [...instances].sort((a, b) => b.score - a.score);
  if (sorted.length <= limit) return sorted;
  const cutoff = sorted[limit - 1]!.score;
  return sorted.filter((i) => i.score >= cutoff);
}

export interface Catastrophe {
  score: number;
  /** Every (player, game, hand) triple at that score — the same player twice, once per hand, is two instances (criterion 230). */
  instances: SingleHandInstance[];
}

/**
 * The catastrophe (criterion 230): the highest single `round_score.score`
 * ever recorded — `pickExtreme`'s O(n) pattern, the same the other four
 * single-event records use, rather than `biggestSingleHandDisasters`'s own
 * O(n log n) full sort (that function's top-N-with-ties shape is what the
 * disasters list, criterion 240, actually needs; the catastrophe only ever
 * needs the single extreme, so it finds it the cheap way — `getBoard()` runs
 * this on every `/` page load).
 */
export function catastrophe(instances: readonly SingleHandInstance[]): Catastrophe | null {
  const picked = pickExtreme(instances, (i) => i.score, (candidate, best) => candidate > best);
  return picked && { score: picked.value, instances: picked.items };
}

/** One (player, game)'s own zero-point hand count — cleanest sheet's own unit. */
export interface ZeroHandCount {
  playerId: string;
  gameId: string;
  count: number;
}

/**
 * Every (player, game)'s own zero-point hand count (criterion 227: a stored
 * `round_score.score` of exactly 0, read as-is — never re-derived from
 * running totals). Feeds `cleanestSheet` below; the one place this stage
 * counts zeros, so nothing downstream can reinterpret a repeat differently.
 */
export function zeroHandCountsByPlayerGame(rows: readonly SingleHandInstance[]): ZeroHandCount[] {
  const counts = new Map<string, ZeroHandCount>();
  for (const row of rows) {
    if (row.score !== 0) continue;
    const key = `${row.playerId} ${row.gameId}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { playerId: row.playerId, gameId: row.gameId, count: 1 });
  }
  return [...counts.values()];
}

export interface CleanestSheet {
  count: number;
  /** Every (player, game) pair at that count (criterion 231). Not a career total (decision 18) — `counts` is already one row per (player, game). */
  instances: ZeroHandCount[];
}

/**
 * Cleanest sheet (criterion 231): the most zero-point hands one player
 * scored in one game, out of eleven. Takes `zeroHandCountsByPlayerGame`'s
 * own output — never a career total, because that function already counts
 * per game, not per player.
 */
export function cleanestSheet(counts: readonly ZeroHandCount[]): CleanestSheet | null {
  const picked = pickExtreme(counts, (c) => c.count, (candidate, best) => candidate > best);
  return picked && { count: picked.value, instances: picked.items };
}

/** One game's own winning margin — biggest hammering's own unit. */
export interface HammeringInstance {
  gameId: string;
  /** `winningMargin`'s own result for this game — never re-derived here. */
  margin: number;
  /** Every co-winner of this game — a shared win names all of them against the one margin (criterion 232). */
  winnerIds: string[];
}

export interface BiggestHammering {
  margin: number;
  /** Every game tied on the margin, each with its own winner(s) (criterion 232). */
  instances: HammeringInstance[];
}

/**
 * Biggest hammering (criterion 232): the largest winning margin in any one
 * game. ⚠️ **Defines nothing of its own** — `instances` is built by the
 * caller from `winningMargin` (this module, criterion 215) applied per game,
 * so a game with no second place (an all-level game) is simply never in
 * `instances` at all, exactly as criterion 215 already guarantees. This
 * function only finds the largest margin among games that have one.
 */
export function biggestHammering(instances: readonly HammeringInstance[]): BiggestHammering | null {
  const picked = pickExtreme(instances, (i) => i.margin, (candidate, best) => candidate > best);
  return picked && { margin: picked.value, instances: picked.items };
}
