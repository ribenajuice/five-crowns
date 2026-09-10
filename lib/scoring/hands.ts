/**
 * Per-hand score derivation.
 *
 * The pad records **running totals**, always. A player's points for one hand
 * are the gap between consecutive rows, and the first row is its own value
 * (docs/ARCHITECTURE.md § What the pad actually looks like, fact 2).
 *
 * ⚠️ These are a **reading aid, not a check**. The Milestone 0 spike found a
 * single wrong interior cell changes exactly two adjacent hand scores in
 * opposite directions by the same amount, and both results stay entirely
 * plausible. Nothing here validates anything.
 *
 * Pure and dependency-free.
 */

import type { CellValue } from "./monotonicity";

/**
 * Derive per-hand scores from a column of running totals.
 *
 * - Hand 1 is the first running total itself.
 * - Hand n is `runningTotal(n) - runningTotal(n-1)`.
 * - A hand touching an unread (`null`) cell is `null` — a gap, never a guess.
 *
 * The result always has the same length as the input, so a partly-typed column
 * still lines up row for row in the review grid.
 *
 * A repeated running total yields `0`: a hand scored nothing. That is ordinary
 * Five Crowns and must never be presented as a suspected duplicate read.
 */
export function deriveHandScores(
  runningTotals: readonly CellValue[],
): CellValue[] {
  return runningTotals.map((value, index) => {
    if (value === null || value === undefined) return null;
    if (index === 0) return value;

    const previous = runningTotals[index - 1];
    if (previous === null || previous === undefined) return null;

    return value - previous;
  });
}

/**
 * A player's final score: the **last running total in their column**. There is
 * no totals row on the pad — the eleventh number is the total.
 *
 * Returns `null` if the column is empty or its last value is unread.
 */
export function finalScore(runningTotals: readonly CellValue[]): number | null {
  if (runningTotals.length === 0) return null;
  const last = runningTotals[runningTotals.length - 1];
  return last === null || last === undefined ? null : last;
}

/**
 * Rebuild the running totals from per-hand scores.
 *
 * Not used on the import path — the pad is never kept as per-hand scores and
 * there is no format detection. It exists so a stored record can be re-derived
 * and cross-checked in either direction if the delta logic ever changes.
 */
export function accumulateHandScores(handScores: readonly number[]): number[] {
  const totals: number[] = [];
  let running = 0;
  for (const score of handScores) {
    running += score;
    totals.push(running);
  }
  return totals;
}
