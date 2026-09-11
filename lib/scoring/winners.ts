/**
 * Winner determination.
 *
 * ⚠️ **Lowest total wins, and ties are shared**, so this returns a *set* of
 * players and never a single one. A game can genuinely have more than one
 * winner, which is why no winner is stored on `game` at all — it is derived
 * from `game_player.final_score` every time
 * (docs/ARCHITECTURE.md § Data model). Any caller that assumes one holder is
 * wrong.
 *
 * The same function decides **round winners** — lowest score in a single hand,
 * ties shared — which in the early hands is the common case, not an edge case.
 *
 * Pure and dependency-free.
 */

/** One player's score in whatever is being ranked: a whole game, or one hand. */
export interface PlayerScore {
  playerId: string;
  score: number;
}

/**
 * Everyone holding the lowest score, in the order they were supplied.
 *
 * Input order is the sheet's column order, so the caller can render winners the
 * way the paper reads without re-sorting.
 *
 * - An empty input gives an empty result. A game with nobody in it has no winner.
 * - Entries whose score is not a finite number are ignored: an incomplete
 *   column cannot win and must not be able to lose either.
 */
export function determineWinners(scores: readonly PlayerScore[]): string[] {
  let lowest = Number.POSITIVE_INFINITY;

  for (const entry of scores) {
    if (!Number.isFinite(entry.score)) continue;
    if (entry.score < lowest) lowest = entry.score;
  }

  if (!Number.isFinite(lowest)) return [];

  return scores
    .filter((entry) => Number.isFinite(entry.score) && entry.score === lowest)
    .map((entry) => entry.playerId);
}

/**
 * The winning score itself, or `null` if nothing is rankable.
 * Useful for "Player C, 78" style callouts without re-scanning.
 */
export function winningScore(scores: readonly PlayerScore[]): number | null {
  const finite = scores.filter((entry) => Number.isFinite(entry.score));
  if (finite.length === 0) return null;
  return finite.reduce(
    (lowest, entry) => (entry.score < lowest ? entry.score : lowest),
    finite[0]!.score,
  );
}

/** True when more than one player holds the lowest score. */
export function isSharedWin(scores: readonly PlayerScore[]): boolean {
  return determineWinners(scores).length > 1;
}
