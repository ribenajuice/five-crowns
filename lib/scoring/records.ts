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

/* ------------------------------------------- current last-place streak (300-301) */

/** One game a player played, in enough shape to place it in sequence and know if they finished last in it. */
export interface LastPlaceGame {
  gameId: string;
  playedOn: string;
  createdAt: string;
  /** Whether this player held this game's own outright *highest* score (`determineLastPlace`, `./winners.ts`) — shared lasts count, the mirror of a shared win. */
  finishedLast: boolean;
}

export interface CurrentLastPlaceStreak {
  /** This run's own length — "N games running" (criterion 300). Same field name as `Streak.length` so this is a drop-in for `streakDrillThrough` (`lib/board/queries.ts`), which only reads `{ length, gameIds }`. */
  length: number;
  /** This run's own games, oldest → newest — the order it was actually played in, same convention `longestStreak` uses. */
  gameIds: string[];
}

/**
 * "Getting absolutely wrecked" (criteria 300–301): the longest **current**
 * run of finishing last, counted back from this player's own most recent
 * game until one game breaks it. ⚠️ **Not `longestStreak`'s "longest ever"**
 * — a ten-game run of lasts that ended three games ago doesn't qualify, no
 * matter how long it was; only the unbroken tail ending at this player's own
 * latest game counts. There is no recency window here to name or tune
 * (criterion 301): a trailing run is current by construction, and this
 * simply stops walking backward the moment it finds a game that wasn't a
 * last.
 *
 * `games` must be **every game this player played** — nothing else — the
 * same contract `longestStreak` has; re-sorted here so caller order never
 * matters.
 *
 * ⚠️ **A run of exactly one game does not qualify** (criterion 301, the
 * criterion's own words: "a run of 1 is not a run and its player is not the
 * holder") — `null` is returned rather than a length-1 result. A player who
 * has never finished last, or whose most recent game wasn't a last, also
 * gets `null`.
 */
export function currentLastPlaceStreak(games: readonly LastPlaceGame[]): CurrentLastPlaceStreak | null {
  const sorted = [...games].sort(compareOldestFirst);

  const gameIds: string[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (!sorted[i]!.finishedLast) break;
    gameIds.unshift(sorted[i]!.gameId);
  }

  if (gameIds.length < 2) return null;
  return { length: gameIds.length, gameIds };
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

/**
 * A fraction (0–1) as a percentage rounded to one decimal place — the one
 * rounding formula both `nemesis()` (below) and `ratePercent()` (home
 * advantage, further down) need, extracted so a future third caller can't
 * quietly drift to a different rounding rule (code review, M3 Stage 4).
 */
function roundToOneDecimalPercent(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
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
  const withPercent = candidates.map((c) => ({ ...c, percent: roundToOneDecimalPercent(c.aboveRate) }));

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
  return games === 0 ? 0 : roundToOneDecimalPercent(wins / games);
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

  // `pickExtreme` (below) is the same "find the max, keep every tied item"
  // mechanism the five single-event records use — home advantage's own
  // extreme reduces to the same shape once each candidate's two-sided
  // comparison has already been collapsed to a single scalar `gap` above
  // (code review, M3 Stage 4: this used to be a fourth hand-rolled copy).
  // ⚠️ A gap of zero or less never holds the record, at any sample size (the
  // guard `pickExtreme` itself has no opinion on, since it only knows "empty
  // input" from "no holder") — checked separately, below.
  const picked = pickExtreme(withGap, (c) => c.gap, (candidate, best) => candidate > best);
  if (!picked || picked.value <= 0) return { holders: [], gapPercentagePoints: null };

  const holders = picked.items
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

  return { holders, gapPercentagePoints: picked.value };
}

/* ------------------------------------------------- looks like cheating (297-299) */

/** One player's own tallies, restricted to the games they actually played — the input `looksLikeCheating` below is built from. */
export interface CheatingCandidate {
  playerId: string;
  displayName: string;
  /** This player's own games — the denominator on their own side of the gap (criterion 297: "in the same games they played", never the archive at large). */
  gamesPlayed: number;
  /** Their own wins across those same games — shared wins count in full (criterion 297, kickoff decision 1, unchanged here — ⚠️ unlike criterion 304's own named exception for the comeback record below, that exception does not reach this one). */
  wins: number;
  /** Every *other* seat's own win, summed across those same games — shared wins count in full for them too. */
  otherWins: number;
  /** Every other seat's own game-count, summed across those same games — the sum, across `gamesPlayed` games, of "how many other players were in this one", so it can exceed `gamesPlayed` itself once any game had more than two players. */
  otherGames: number;
}

export interface CheatingSide {
  wins: number;
  games: number;
  /** One decimal of a percentage — the precision the gap itself is compared and reported at (same convention as `nemesis`/`homeAdvantage`, above). */
  ratePercent: number;
}

export interface CheatingHolder {
  playerId: string;
  displayName: string;
  /** This holder's own game count — never the archive's (criterion 182). */
  gamesPlayed: number;
  own: CheatingSide;
  others: CheatingSide;
  /** `own.ratePercent - others.ratePercent`, one decimal — the winning gap (criterion 299). */
  gapPercentagePoints: number;
}

export interface CheatingResult {
  /** Every player tied for the largest gap, alphabetical (criterion 181). Empty iff `gapPercentagePoints` is `null`. */
  holders: CheatingHolder[];
  gapPercentagePoints: number | null;
}

/**
 * "Looks like cheating" (criterion 297, open question 15 — option **C**): the
 * player with the largest gap between their own win rate and the *combined*
 * win rate of the other seats, **measured only across the games they
 * actually played together** — never the archive at large, never a career
 * rate for the other players computed elsewhere. Both sides are pooled
 * fractions over the same denominator-family (the holder's own games, and
 * every other seat's own games within them), exactly the two numbers
 * criterion 299 asks the card to state: *"their wins over their games,
 * against the other seats' wins over those same games."*
 *
 * ⚠️ **No "gap must be positive" floor** — unlike `nemesis`'s above-rate or
 * `homeAdvantage`'s gap (both of which exclude zero or below), criterion 297
 * states no such exclusion for this record: the largest gap wins, whatever
 * its sign, for as long as there is at least one candidate.
 *
 * A candidate with `otherGames === 0` contributes nothing — unreachable for a
 * real game (`MIN_PLAYERS` is 2, so any game a player is in has at least one
 * other seat), kept only for the same defensive symmetry `homeAdvantage`
 * uses for "no other venue."
 *
 * Ties are judged on the gap **as displayed**, to one decimal of a
 * percentage point — `homeAdvantage`'s own tie-judging convention, applied
 * here to the same kind of two-sided rate comparison.
 */
export function looksLikeCheating(candidates: readonly CheatingCandidate[]): CheatingResult {
  const withGap = candidates
    .filter((c) => c.gamesPlayed > 0 && c.otherGames > 0)
    .map((c) => {
      const ownRate = ratePercent(c.wins, c.gamesPlayed);
      const othersRate = ratePercent(c.otherWins, c.otherGames);
      const gap = Math.round((ownRate - othersRate) * 10) / 10;
      return { ...c, ownRate, othersRate, gap };
    });

  const picked = pickExtreme(withGap, (c) => c.gap, (candidate, best) => candidate > best);
  if (!picked) return { holders: [], gapPercentagePoints: null };

  const holders = picked.items
    .map(
      (c): CheatingHolder => ({
        playerId: c.playerId,
        displayName: c.displayName,
        gamesPlayed: c.gamesPlayed,
        own: { wins: c.wins, games: c.gamesPlayed, ratePercent: c.ownRate },
        others: { wins: c.otherWins, games: c.otherGames, ratePercent: c.othersRate },
        gapPercentagePoints: c.gap,
      }),
    )
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  return { holders, gapPercentagePoints: picked.value };
}

/* --------------------------------------------------------- the metronome (307-309) */

/** One player's own final scores, career-wide — the input `metronome` below is built from. */
export interface MetronomeCandidate {
  playerId: string;
  displayName: string;
  /** Every `game_player.final_score` this player has ever posted — order doesn't matter. */
  finalScores: readonly number[];
}

export interface MetronomeHolder {
  playerId: string;
  displayName: string;
  /** `finalScores.length` — stated beside the range so a thin sample (as small as two games, criterion 308) reads honestly rather than being hidden (criterion 309). */
  gamesPlayed: number;
  /** `highest - lowest`. */
  range: number;
  /** The higher end of the range — the two numbers criterion 309 asks the card to state alongside the count. */
  highest: number;
  lowest: number;
}

export interface MetronomeResult {
  /** `null` iff `holders` is empty — only reachable when nobody in the archive has played two or more games. */
  range: number | null;
  /** Every player tied for the smallest range, alphabetical (criterion 181). */
  holders: MetronomeHolder[];
}

/**
 * The metronome (criteria 307–309): the smallest range between a player's own
 * highest and lowest ever `final_score`. ⚠️ **The smallest range wins** — the
 * one gap on the board where lower is the record, not higher.
 *
 * ⚠️ **No minimum-games floor** (criterion 308, decision 27, confirmed for
 * the third time) — **a spread needs two observations, and that is a
 * definition, not a floor**: a player with fewer than two games is filtered
 * out below because they have no range at all, not because of a threshold
 * this function imposes. A player on exactly two games can, and in a small
 * archive will, hold this record — criterion 309's `gamesPlayed` alongside
 * `highest`/`lowest` on every holder is the board's one stated mitigation,
 * not a gate.
 */
export function metronome(candidates: readonly MetronomeCandidate[]): MetronomeResult {
  const withRange = candidates
    .filter((c) => c.finalScores.length >= 2)
    .map((c) => {
      let highest = c.finalScores[0]!;
      let lowest = c.finalScores[0]!;
      for (const score of c.finalScores) {
        if (score > highest) highest = score;
        if (score < lowest) lowest = score;
      }
      return { ...c, highest, lowest, range: highest - lowest };
    });

  const picked = pickExtreme(withRange, (c) => c.range, (candidate, best) => candidate < best);
  if (!picked) return { range: null, holders: [] };

  const holders = picked.items
    .map(
      (c): MetronomeHolder => ({
        playerId: c.playerId,
        displayName: c.displayName,
        gamesPlayed: c.finalScores.length,
        range: c.range,
        highest: c.highest,
        lowest: c.lowest,
      }),
    )
    .sort((a, b) => compareDisplayNames(a.displayName, b.displayName));

  return { range: picked.value, holders };
}

/* ---------------------------------------------- single-event records (228-232, 240) */

/**
 * The extremum in `items`, keyed by `value`, with **every** item tied for it
 * — never deduplicated by any field of `T`, which is exactly what a
 * single-event record needs (criterion 228: the same player can hold two
 * separate instances, one per game). The one assembly mechanism the five
 * records below share, so "find the best and keep every tied item" is
 * written once rather than five times — the single-event counterpart to this
 * module's own `bestHolders`-shaped logic in `lib/board/queries.ts`, which is
 * keyed by player instead. **`homeAdvantage()` (above) reuses this too**
 * (code review, M3 Stage 4): its own "extreme" is a (player, venue) pair, but
 * once each candidate's two-sided win-rate comparison is collapsed to a
 * single `gap` scalar, it's the same "find the max, keep every tie" shape —
 * declared below `homeAdvantage()` in this file but hoisted, same as every
 * other function declaration here.
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

/* ------------------------------------------------ most clutch comeback (304-306) */

/**
 * Hand 9 — the founder's own number (criterion 305), literal, not "any hand".
 * Safe to index unconditionally: every game is exactly `HANDS_PER_GAME` (11)
 * hands with every player present for all of them (kickoff decision 2), so
 * hand `CLUTCH_HAND` exists in every game in the record and there is no
 * partial-game case to guard against.
 */
export const CLUTCH_HAND = 9;

/** One player's own running total at `CLUTCH_HAND` in one game, plus whether they went on to win that game **outright** — everything `clutchComebackInstances` needs per (player, game). */
export interface ClutchCandidate {
  playerId: string;
  gameId: string;
  /** Their `round_score.running_total` at `CLUTCH_HAND` — equivalently, the sum of their `round_score.score` for hands 1 through `CLUTCH_HAND` (criterion 313: both columns trace to the same stored numbers). */
  runningTotalAtClutchHand: number;
  /**
   * Whether this player was this game's **sole** winner. ⚠️ **A shared win is
   * `false` here, and only here** — criterion 304's deliberate, named
   * exception to kickoff decision 1 ("lowest total wins, ties are shared"),
   * scoped to this record alone: "a comeback is one player coming from
   * behind and taking it, and two people finishing level is not that story."
   * Every other definition in this file still shares a win in full; this
   * field must be computed by the caller from `determineWinners` having
   * length exactly 1, never re-derived here.
   */
  wonOutright: boolean;
}

/** One player's own deficit at `CLUTCH_HAND` in a game they went on to win outright — most clutch comeback's own unit. */
export interface ComebackInstance {
  playerId: string;
  gameId: string;
  /** Their own running total at `CLUTCH_HAND` minus that game's own lowest — always > 0 here (criterion 304: level with the leader is not a comeback). */
  deficit: number;
}

/**
 * Every qualifying comeback in the archive (criterion 304): for each game,
 * each *outright* winner's own deficit at `CLUTCH_HAND` against that game's
 * own lowest running total at that hand — the game's outright winner(s) who
 * were themselves already in the lead at `CLUTCH_HAND` (deficit of zero)
 * contribute nothing, and neither does a game with no outright winner at all
 * (a shared win, `wonOutright: false` for everyone in it, per criterion
 * 304's exception). Feeds `mostClutchComeback`, below; the one place this
 * record computes a deficit, so nothing downstream can reinterpret it
 * differently.
 */
export function clutchComebackInstances(candidates: readonly ClutchCandidate[]): ComebackInstance[] {
  const byGame = new Map<string, ClutchCandidate[]>();
  for (const c of candidates) {
    const arr = byGame.get(c.gameId) ?? [];
    arr.push(c);
    byGame.set(c.gameId, arr);
  }

  const instances: ComebackInstance[] = [];
  for (const rows of byGame.values()) {
    // The game's own lowest running total at `CLUTCH_HAND` — the same
    // lowest-wins minimum-finder `winningScore` already provides (and this
    // file already uses elsewhere), reused rather than hand-rolled here, so
    // a future tie-break or non-finite-score guard on it isn't silently
    // missed in this one spot.
    const lowest = winningScore(rows.map((r) => ({ playerId: r.playerId, score: r.runningTotalAtClutchHand })));
    if (lowest === null) continue; // no rankable running total in this game
    for (const r of rows) {
      if (!r.wonOutright) continue;
      const deficit = r.runningTotalAtClutchHand - lowest;
      if (deficit <= 0) continue; // criterion 304: level with the leader at hand 9 is not a comeback
      instances.push({ playerId: r.playerId, gameId: r.gameId, deficit });
    }
  }
  return instances;
}

export interface MostClutchComeback {
  deficit: number;
  /** Every (player, game) pair at that deficit — ⚠️ **two different games**, each won outright by a different player (criterion 306); never a tie for the win inside one game, which criterion 304 already excludes before this function ever sees it. */
  instances: ComebackInstance[];
}

/**
 * Most clutch comeback (criteria 304–306): the largest deficit at
 * `CLUTCH_HAND` that was still overturned into an outright win —
 * `pickExtreme`'s own O(n) pattern, same as the other single-event records
 * above. A single-event record, built like best game ever and the
 * catastrophe: it names the player, the deficit, and (via the caller's own
 * `RecordGame`) the date and the final score the game ended on. `null` if no
 * comeback has ever happened — the leader at `CLUTCH_HAND` has won every
 * time, which criterion 304's outright-win rule makes slightly more likely
 * in a small archive.
 */
export function mostClutchComeback(instances: readonly ComebackInstance[]): MostClutchComeback | null {
  const picked = pickExtreme(instances, (i) => i.deficit, (candidate, best) => candidate > best);
  return picked && { deficit: picked.value, instances: picked.items };
}
