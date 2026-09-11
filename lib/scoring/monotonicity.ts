/**
 * The monotonicity check.
 *
 * ⚠️ Read `docs/SPIKE-M0-READING.md` before giving this more credit than it is
 * due. Milestone 0 measured it catching **0 of 9** real misreads: the model is
 * told columns never decrease, so it reads in a way that satisfies the rule.
 * This is a floor that stops impossible data being saved and **nothing else**.
 * No wording anywhere in the product may describe a column that passes as
 * checked, validated, verified or confirmed.
 *
 * Pure and dependency-free.
 */

/**
 * A cell value as it stands in a draft column: the number written on the pad,
 * or `null` for a cell nobody has read yet (the model returns `null` rather
 * than guessing, and the human types it).
 */
export type CellValue = number | null;

/** One place where a column stopped climbing. Both cells are at fault. */
export interface MonotonicityBreak {
  /** Index of the value above (the higher one, as read). */
  previousIndex: number;
  /** Index of the value that failed to climb. */
  index: number;
  previous: number;
  value: number;
}

export interface MonotonicityResult {
  /** True when no pair decreases. Says nothing about correctness. */
  ok: boolean;
  breaks: MonotonicityBreak[];
  /**
   * Every index involved in a break, ascending and de-duplicated.
   *
   * ⚠️ Both members of the offending pair are here on purpose: either could be
   * the misread and the app has no way to know which
   * (docs/ARCHITECTURE.md § Validation). The review screen highlights all of
   * these, never just the lower one.
   */
  flaggedIndices: number[];
}

/**
 * Check that a column of running totals never decreases.
 *
 * Repeated identical values are **fine** — a repeat is a hand scored zero, and
 * they are common. Player D's six consecutive `64`s on `sheet-01` are the
 * regression case: they must produce no break of any kind.
 *
 * Unread (`null`) cells are skipped, but the *last value actually seen* is what
 * the next value is compared against — so `[10, null, 5]` is still a break,
 * because whatever the middle cell holds it cannot be below 10 and above 5.
 */
export function checkMonotonicity(
  values: readonly CellValue[],
): MonotonicityResult {
  const breaks: MonotonicityBreak[] = [];

  let previous: number | null = null;
  let previousIndex = -1;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === null || value === undefined) continue;

    if (previous !== null && value < previous) {
      breaks.push({ previousIndex, index, previous, value });
    }

    previous = value;
    previousIndex = index;
  }

  const flagged = new Set<number>();
  for (const b of breaks) {
    flagged.add(b.previousIndex);
    flagged.add(b.index);
  }

  return {
    ok: breaks.length === 0,
    breaks,
    flaggedIndices: [...flagged].sort((a, b) => a - b),
  };
}

/** Convenience predicate. Prefer {@link checkMonotonicity} when you need the pairs. */
export function isMonotonic(values: readonly CellValue[]): boolean {
  return checkMonotonicity(values).ok;
}
