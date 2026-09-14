/**
 * The fun facts pool's eight generators — PRD criteria 281–289 (Milestone 4,
 * first slice).
 *
 * Pure functions, same discipline as `./records.ts`: each takes rows already
 * fetched and reshaped by `lib/board/facts.ts`'s `getFunFacts()` and returns
 * **one fact or nothing** — nothing when it doesn't currently apply, never a
 * placeholder or a "0" standing in for "not applicable" (criterion 281's own
 * "no withholding, no floor to satisfy" stance, mirrored from M3).
 *
 * ⚠️ **Tone versus honesty (criterion 290)**: criterion 202's "nothing
 * characterises a player" ban is lifted for this feature only, at the
 * founder's own request — a generator may name a player in an unflattering
 * light. It is **not** lifted for inventing or exaggerating a number: every
 * fact below states only arithmetic performed on `final_score` and
 * `round_score.score`, nothing estimated or guessed. Wording ("go gentle on
 * them") is a frontend/copy concern layered on top of these plain numbers —
 * nothing here writes a sentence.
 *
 * `getFunFacts()` (`lib/board/facts.ts`) is the one caller — it is the only
 * thing that knows where a `game_id` or `player_id` comes from, exactly like
 * `lib/board/queries.ts` is to `./records.ts`.
 */

import { compareOldestFirst, type ChronologicalRow } from "./chronology";
import { HANDS_PER_GAME } from "./constants";
import { compareDisplayNames } from "./names";
import { headToHead as computeHeadToHead, type HeadToHeadGame } from "./records";

/* ------------------------------------------------------------ shared shapes */

/** One `round_score` row, positional within its own game (hand 1 = the 3s hand … 11 = Kings). */
export interface HandScoreEntry {
  hand: number;
  score: number;
}

/**
 * One player's own line in one game — the single row shape the flatliner,
 * current drought, the comeback and the slump are all built from (criterion
 * 281's "reuse the same underlying row shapes" instruction). `hands` is `[]`
 * for a game with no `round_score` rows recorded for this player — never
 * possible for a real saved game (every save writes all eleven), but nothing
 * here assumes it, same defensive stance `lib/board/queries.ts` takes.
 */
export interface PlayerGameSummary extends ChronologicalRow {
  gameId: string;
  playerId: string;
  displayName: string;
  /** Whether this player held this game's own outright lowest score (M1's win, ties shared). */
  won: boolean;
  finalScore: number;
  hands: readonly HandScoreEntry[];
}

function groupByPlayer(games: readonly PlayerGameSummary[]): Map<string, PlayerGameSummary[]> {
  const byPlayer = new Map<string, PlayerGameSummary[]>();
  for (const game of games) {
    const arr = byPlayer.get(game.playerId) ?? [];
    arr.push(game);
    byPlayer.set(game.playerId, arr);
  }
  return byPlayer;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** One decimal place — the same convention `averageFinalScore` (`./records.ts`) uses. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type FactKey =
  | "flatliner"
  | "currentDrought"
  | "comeback"
  | "slump"
  | "rivalryNeedle"
  | "overdue"
  | "randomOldNight"
  | "collectiveTrivia";

/* ------------------------------------------------------------- the flatliner (282) */

export interface FlatlinerFact {
  key: "flatliner";
  playerId: string;
  displayName: string;
  gameId: string;
  playedOn: string;
  /** The longest unbroken run of consecutive zero-point hands found, anywhere in the archive. */
  runLength: number;
}

/**
 * The longest unbroken run of consecutive zero-point hands one player ever
 * strung together in one game (criterion 282) — ⚠️ **distinct from "cleanest
 * sheet"** (criterion 231): that counts *total* zero hands in a game, this
 * counts the longest unbroken *run* by hand number. A player who went to zero
 * on hands 1, 2, 4 and 5 has a run of 2 (hands 1–2, broken by hand 3), not 4.
 *
 * Compares every player's every game; on a tie, the earliest game wins
 * (`compareOldestFirst`), then the alphabetically first player — deterministic,
 * never insertion-order-dependent. `null` when nobody has ever recorded even a
 * single zero hand (or the archive is empty).
 */
export function flatliner(games: readonly PlayerGameSummary[]): FlatlinerFact | null {
  let best: FlatlinerFact | null = null;
  // Tracked alongside `best` purely so the tie-break below can compare full
  // chronology (`createdAt` included) without smuggling it into the public
  // fact shape, which has no use for it once a winner is chosen.
  let bestRow: PlayerGameSummary | null = null;

  for (const game of games) {
    const runLength = longestZeroRun(game.hands);
    if (runLength === 0) continue;

    const better =
      best === null ||
      runLength > best.runLength ||
      (runLength === best.runLength &&
        (compareOldestFirst(game, bestRow!) < 0 ||
          (compareOldestFirst(game, bestRow!) === 0 &&
            compareDisplayNames(game.displayName, bestRow!.displayName) < 0)));

    if (better) {
      best = {
        key: "flatliner",
        playerId: game.playerId,
        displayName: game.displayName,
        gameId: game.gameId,
        playedOn: game.playedOn,
        runLength,
      };
      bestRow = game;
    }
  }

  return best;
}

/** Sorted-by-hand-number scan; a gap in hand numbers breaks a run, exactly like a missed game breaks a streak. */
function longestZeroRun(hands: readonly HandScoreEntry[]): number {
  const sorted = [...hands].sort((a, b) => a.hand - b.hand);
  let longest = 0;
  let current = 0;
  let previousHand: number | null = null;

  for (const { hand, score } of sorted) {
    const contiguous = previousHand !== null && hand === previousHand + 1;
    current = score === 0 ? (contiguous ? current + 1 : 1) : 0;
    if (current > longest) longest = current;
    previousHand = hand;
  }

  return longest;
}

/* -------------------------------------------------------- current drought (283) */

export interface CurrentDroughtFact {
  key: "currentDrought";
  playerId: string;
  displayName: string;
  /** Games played since this player's most recent win. Always ≥ 1 — see below. */
  gamesSinceWin: number;
}

/**
 * "It's been {n} games since {player} won" (criterion 283) — games since
 * each player's own most recent win, counted in **games, not calendar days**.
 *
 * Three cases are skipped outright, never shown as a false "0":
 * - A player with no games at all — nothing to count.
 * - A player with **no win ever** — "since their most recent win" has no
 *   anchor to count from, so this generator says nothing rather than guess
 *   (criterion 290's honesty rule).
 * - A player currently on a win (their most recent game was a win) —
 *   criterion 283's own words: "skipped entirely, not shown as 0".
 *
 * Among every player who does qualify, the longest current drought is
 * reported — the single most notable one, since this generator returns one
 * fact, not a table. Ties broken alphabetically.
 */
export function currentDrought(games: readonly PlayerGameSummary[]): CurrentDroughtFact | null {
  let best: CurrentDroughtFact | null = null;

  for (const [playerId, rows] of groupByPlayer(games)) {
    const sorted = [...rows].sort(compareOldestFirst);

    let lastWinIndex = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i]!.won) {
        lastWinIndex = i;
        break;
      }
    }
    if (lastWinIndex === -1) continue; // never won — no anchor to count from
    const gamesSinceWin = sorted.length - 1 - lastWinIndex;
    if (gamesSinceWin === 0) continue; // currently on a win — skip, not "0"

    const displayName = sorted[0]!.displayName;
    if (
      best === null ||
      gamesSinceWin > best.gamesSinceWin ||
      (gamesSinceWin === best.gamesSinceWin && compareDisplayNames(displayName, best.displayName) < 0)
    ) {
      best = { key: "currentDrought", playerId, displayName, gamesSinceWin };
    }
  }

  return best;
}

/* ----------------------------------------------- the comeback nobody asked for (284) */

export interface ComebackFact {
  key: "comeback";
  playerId: string;
  displayName: string;
  worstGameId: string;
  worstPlayedOn: string;
  /** 1 = the 3s hand … 11 = Kings. */
  hand: number;
  score: number;
  /** The very next game this player played, chronologically — the win that redeems the story. */
  nextGameId: string;
  nextPlayedOn: string;
}

interface WorstHand {
  gameId: string;
  playedOn: string;
  createdAt: string;
  hand: number;
  score: number;
}

/**
 * A player's single worst hand ever, where their **very next game**, in
 * `played_on`/`created_at` order, was a win (criterion 284). Only ever
 * considers each player's own single worst hand — not their second-worst, not
 * every bad hand they've had — since the fact is "the disaster right before
 * the redemption", not a table of bad hands.
 *
 * A tie for a player's own worst-ever hand is broken by the earliest game
 * (`compareOldestFirst`) — deterministic, and irrelevant to whether the *next*
 * game after it was a win, since that's a property of the tied hand's own
 * position in the sequence either way only if both tie the same value at
 * different games; picking the earliest is simply a stable, arbitrary choice.
 *
 * Among every player whose worst hand happens to precede a win, the single
 * highest-scoring disaster is reported (the most dramatic story). `null` if
 * no player's worst hand happens to precede a win, or the archive is empty.
 */
export function comebackNobodyAskedFor(games: readonly PlayerGameSummary[]): ComebackFact | null {
  let best: ComebackFact | null = null;

  for (const [playerId, rows] of groupByPlayer(games)) {
    const sorted = [...rows].sort(compareOldestFirst);

    let worst: (WorstHand & { displayName: string }) | null = null;
    for (const game of sorted) {
      for (const h of game.hands) {
        if (
          worst === null ||
          h.score > worst.score ||
          (h.score === worst.score &&
            compareOldestFirst(game, worst) < 0)
        ) {
          worst = {
            gameId: game.gameId,
            playedOn: game.playedOn,
            createdAt: game.createdAt,
            hand: h.hand,
            score: h.score,
            displayName: game.displayName,
          };
        }
      }
    }
    if (worst === null) continue;

    const worstIndex = sorted.findIndex((g) => g.gameId === worst!.gameId);
    const next = sorted[worstIndex + 1];
    if (!next || !next.won) continue; // no next game, or it wasn't a win — skip

    const candidate: ComebackFact = {
      key: "comeback",
      playerId,
      displayName: worst.displayName,
      worstGameId: worst.gameId,
      worstPlayedOn: worst.playedOn,
      hand: worst.hand,
      score: worst.score,
      nextGameId: next.gameId,
      nextPlayedOn: next.playedOn,
    };

    if (
      best === null ||
      candidate.score > best.score ||
      (candidate.score === best.score && compareDisplayNames(candidate.displayName, best.displayName) < 0)
    ) {
      best = candidate;
    }
  }

  return best;
}

/* -------------------------------------------------------------------- the slump (285) */

export interface SlumpFact {
  key: "slump";
  playerId: string;
  displayName: string;
  /** Mean of every game this player has ever played, one decimal place. */
  allTimeAverage: number;
  /** Mean of just their last three games (chronologically), one decimal place. */
  recentAverage: number;
  gamesPlayed: number;
}

/**
 * ⚠️ **The chosen threshold, documented**: a slump requires the last-3-game
 * average to be at least **20% worse** (higher) than the all-time average.
 * Five Crowns hands swing by dozens of points on a single bad hand (a Joker
 * left in hand alone can be 20+ points), so a small, single-digit-percent
 * wobble is ordinary variance, not a slump — and a fixed point margin doesn't
 * scale between a group that plays tight, low-scoring hands and one that
 * doesn't. 20% is a real, visible cold patch without being so strict it never
 * fires. A founder-tunable constant, not a derived statistic.
 */
export const SLUMP_THRESHOLD_RATIO = 0.2;

/**
 * A player with at least 3 games whose last three games (chronologically)
 * average worse than their all-time average by `SLUMP_THRESHOLD_RATIO`
 * (criterion 285), naming both numbers. A player with exactly 3 games can
 * never qualify — their "last three" *is* their whole history, so the two
 * averages are identical — which needs no special-casing: the threshold
 * comparison simply never passes.
 *
 * Among every player currently in a slump, the one furthest below their own
 * threshold (the deepest slump, proportionally) is reported. `null` if nobody
 * qualifies, or a qualifying player's own all-time average is exactly zero
 * (no meaningful percentage above zero — defensive, not reachable by a real
 * game with any positive score in it).
 */
export function slump(games: readonly PlayerGameSummary[]): SlumpFact | null {
  let best: SlumpFact | null = null;
  let bestShortfallRatio = -Infinity;

  for (const [, rows] of groupByPlayer(games)) {
    if (rows.length < 3) continue;
    const sorted = [...rows].sort(compareOldestFirst);

    const allTimeAverage = mean(sorted.map((g) => g.finalScore));
    if (allTimeAverage <= 0) continue;

    const lastThree = sorted.slice(-3);
    const recentAverage = mean(lastThree.map((g) => g.finalScore));
    const shortfallRatio = (recentAverage - allTimeAverage) / allTimeAverage;
    if (shortfallRatio <= SLUMP_THRESHOLD_RATIO) continue;

    const candidate: SlumpFact = {
      key: "slump",
      playerId: sorted[0]!.playerId,
      displayName: sorted[0]!.displayName,
      allTimeAverage: round1(allTimeAverage),
      recentAverage: round1(recentAverage),
      gamesPlayed: sorted.length,
    };

    if (
      shortfallRatio > bestShortfallRatio ||
      (shortfallRatio === bestShortfallRatio &&
        best !== null &&
        compareDisplayNames(candidate.displayName, best.displayName) < 0)
    ) {
      best = candidate;
      bestShortfallRatio = shortfallRatio;
    }
  }

  return best;
}

/* --------------------------------------------------------------- rivalry needle (286) */

/** Two players' shared game history — exactly `headToHead`'s own input, plus display names for output. */
export interface PairGames {
  aId: string;
  aDisplayName: string;
  bId: string;
  bDisplayName: string;
  games: readonly HeadToHeadGame[];
}

export interface RivalryNeedleFact {
  key: "rivalryNeedle";
  dominantPlayerId: string;
  dominantDisplayName: string;
  opponentPlayerId: string;
  opponentDisplayName: string;
  /** The dominant side's own rate of finishing above the opponent (criterion 198), a fraction 0–1. */
  aboveRate: number;
  gamesTogether: number;
}

/** Criterion 286's own stated floor: a pair needs at least this many shared games to qualify. */
export const RIVALRY_MIN_GAMES_TOGETHER = 3;

/**
 * The most lopsided head-to-head record currently in the archive (criterion
 * 286), among pairs who've played together at least
 * `RIVALRY_MIN_GAMES_TOGETHER` times. ⚠️ **Reuses `headToHead` (`./records.ts`)
 * unchanged** — this function never re-derives "finishes above"; it only
 * scans `headToHead`'s own output for the largest `aboveRate` across every
 * pair (both directions considered, since either side of a pair can be the
 * dominant one).
 *
 * "Lopsided" is measured by **above-rate**, not win-rate: win-rate can read
 * high for both sides of a pair that shares most of its wins (that's a
 * friendly rivalry, not a lopsided one), while above-rate never double-counts
 * a single game — same reasoning `nemesis` (`./records.ts`) already uses for
 * "who finishes ahead of whom".
 *
 * An above-rate of exactly zero never qualifies as "lopsided" — a pair who
 * have only ever tied on final score have no needle to point at, the same
 * "zero never holds a title" shape `nemesis` uses (criterion 199, echoed
 * here for the same fairness reason, not a criterion 286 requirement itself).
 *
 * `null` if no pair has played together often enough, or the archive is empty.
 */
export function rivalryNeedle(pairs: readonly PairGames[]): RivalryNeedleFact | null {
  let best: RivalryNeedleFact | null = null;

  for (const pair of pairs) {
    if (pair.games.length < RIVALRY_MIN_GAMES_TOGETHER) continue;
    const h2h = computeHeadToHead(pair.games);

    const sides: RivalryNeedleFact[] = [];
    if (h2h.a.aboveRate > 0) {
      sides.push({
        key: "rivalryNeedle",
        dominantPlayerId: pair.aId,
        dominantDisplayName: pair.aDisplayName,
        opponentPlayerId: pair.bId,
        opponentDisplayName: pair.bDisplayName,
        aboveRate: h2h.a.aboveRate,
        gamesTogether: h2h.gamesTogether,
      });
    }
    if (h2h.b.aboveRate > 0) {
      sides.push({
        key: "rivalryNeedle",
        dominantPlayerId: pair.bId,
        dominantDisplayName: pair.bDisplayName,
        opponentPlayerId: pair.aId,
        opponentDisplayName: pair.aDisplayName,
        aboveRate: h2h.b.aboveRate,
        gamesTogether: h2h.gamesTogether,
      });
    }

    for (const candidate of sides) {
      if (
        best === null ||
        candidate.aboveRate > best.aboveRate ||
        (candidate.aboveRate === best.aboveRate &&
          compareDisplayNames(candidate.dominantDisplayName, best.dominantDisplayName) < 0)
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

/* ----------------------------------------------------------------------- overdue (287) */

/** One archive game, chronologically placed, tagged with whether its own win was shared. */
export interface ArchiveGame extends ChronologicalRow {
  gameId: string;
  /** M1's tie-sharing rule: more than one player held this game's own lowest score. */
  isSharedWin: boolean;
}

export interface OverdueFact {
  key: "overdue";
  gamesSinceSharedWin: number;
}

/**
 * ⚠️ **The chosen threshold, documented**: at least 5 games must have passed
 * since the archive's last shared win before this fires. A shared win at the
 * *hand* level is the everyday case (several players routinely go out clean
 * in the early hands), but a shared win of the **whole game** — two or more
 * final totals tied for lowest — is much rarer; five clear games without one
 * is long enough to be a genuine, remarkable gap rather than the ordinary
 * week-to-week wobble.
 */
export const OVERDUE_MIN_GAMES = 5;

/**
 * "It's been {n} games since anyone shared a win" (criterion 287),
 * archive-wide. `null` if no shared win has ever happened, or fewer than
 * `OVERDUE_MIN_GAMES` games have passed since the most recent one.
 */
export function overdue(games: readonly ArchiveGame[]): OverdueFact | null {
  const sorted = [...games].sort(compareOldestFirst);

  let lastSharedIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.isSharedWin) {
      lastSharedIndex = i;
      break;
    }
  }
  if (lastSharedIndex === -1) return null;

  const gamesSinceSharedWin = sorted.length - 1 - lastSharedIndex;
  if (gamesSinceSharedWin < OVERDUE_MIN_GAMES) return null;

  return { key: "overdue", gamesSinceSharedWin };
}

/* ---------------------------------------------------------------- a random old night (288) */

/** One past game's full story — everything criterion 288 asks a fact to restate. */
export interface NightStory {
  gameId: string;
  playedOn: string;
  locationName: string | null;
  rosterName: string;
  players: readonly { displayName: string; finalScore: number }[];
  winners: readonly string[];
  winningScore: number;
}

export interface RandomOldNightFact extends NightStory {
  key: "randomOldNight";
}

/**
 * Any one past game, picked uniformly at random (criterion 288) — no
 * condition beyond the archive being non-empty, the one generator in the pool
 * guaranteed available the moment a single game exists.
 *
 * `random` is injectable (defaulting to `Math.random`) purely so this is
 * deterministically testable — never seeded or exposed outside tests.
 */
export function randomOldNight(
  games: readonly NightStory[],
  random: () => number = Math.random,
): RandomOldNightFact | null {
  if (games.length === 0) return null;
  const index = Math.min(Math.floor(random() * games.length), games.length - 1);
  return { key: "randomOldNight", ...games[index]! };
}

/* ------------------------------------------------------------------ collective trivia (289) */

export interface CollectiveTriviaFact {
  key: "collectiveTrivia";
  totalGames: number;
  totalHands: number;
}

/**
 * "You've played {n} games and {m} hands together" (criterion 289),
 * archive-wide, targeting nobody. Available from the first saved game;
 * `null` only for an empty archive.
 */
export function collectiveTrivia(totalGames: number): CollectiveTriviaFact | null {
  if (totalGames <= 0) return null;
  return { key: "collectiveTrivia", totalGames, totalHands: totalGames * HANDS_PER_GAME };
}

/* ------------------------------------------------------------------------- the pool's fact type */

export type FunFact =
  | FlatlinerFact
  | CurrentDroughtFact
  | ComebackFact
  | SlumpFact
  | RivalryNeedleFact
  | OverdueFact
  | RandomOldNightFact
  | CollectiveTriviaFact;
