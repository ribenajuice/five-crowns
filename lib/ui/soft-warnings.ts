/**
 * Soft warnings — surfaced, never blocking.
 *
 * `docs/ARCHITECTURE.md` § Validation: a plausibility bound is a heuristic
 * about handwriting, not a rule about the game, and must never block a save.
 * Stage 2 builds the one heuristic the fixtures actually exercise — an
 * implausibly large single-hand jump — since `sheet-01` Player B's genuine
 * 51-point hand 4 is the named regression case (PRD criterion 27). The
 * threshold is deliberately set above `sheet-01` Player D's real 44-point
 * final hand: criterion 19 requires *no* warning of any kind on that column,
 * and a soft warning on its own final hand — even one unrelated to the
 * repeats it's actually testing — would read as exactly that. A threshold is
 * a hint, not a rule, and this is a hint tuned to the fixtures we have.
 *
 * ⚠️ Never call this over anything but derived hand scores, and never let its
 * result touch `validateGrid`'s hard checks — that boundary is the whole
 * point (`lib/scoring/validate.ts`).
 */

import type { CellValue } from "@/lib/scoring";

/** A points-in-one-hand value at or above this is "a big one". Advisory only. */
export const LARGE_HAND_THRESHOLD = 45;

export interface SoftWarningHit {
  index: number;
  points: number;
}

export function detectLargeHandWarnings(
  handScores: readonly CellValue[],
  threshold: number = LARGE_HAND_THRESHOLD,
): SoftWarningHit[] {
  const hits: SoftWarningHit[] = [];
  handScores.forEach((score, index) => {
    if (score !== null && score >= threshold) {
      hits.push({ index, points: score });
    }
  });
  return hits;
}
