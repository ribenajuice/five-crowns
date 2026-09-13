/**
 * Whether a column's `ReadHint` should show, and at which cell.
 *
 * `docs/DESIGN-SYSTEM.md` § `ReadHint`: a cell shows at most one of the three
 * grid signals. A real monotonicity flag (`err`) or an unread cell always
 * outranks a mild doubt, and so does a soft warning — the model's own doubt
 * is deliberately the weakest of the three. Pure and dependency-free so the
 * suppression rule is testable without rendering anything.
 */
export function visibleReadHintIndex(args: {
  leastConfidentIndex: number | null;
  errIndices: ReadonlySet<number>;
  unreadIndices: ReadonlySet<number>;
  warnIndices: ReadonlySet<number>;
}): number | null {
  const { leastConfidentIndex, errIndices, unreadIndices, warnIndices } = args;
  if (leastConfidentIndex === null) return null;
  if (errIndices.has(leastConfidentIndex)) return null;
  if (unreadIndices.has(leastConfidentIndex)) return null;
  if (warnIndices.has(leastConfidentIndex)) return null;
  return leastConfidentIndex;
}

/**
 * Remap a column's read-hint index after "Fix the shape" inserts a blank row
 * (criterion 33), mirroring the same shift `insertValueAt` applies to the
 * column's actual values — a hint at or below the insertion point moves down
 * with the row it was pointing at, rather than landing on its new neighbour.
 */
export function shiftReadHintForInsert(hintIndex: number, insertedAt: number): number {
  return hintIndex >= insertedAt ? hintIndex + 1 : hintIndex;
}

/**
 * Remap a column's read-hint index after "Fix the shape" deletes a row
 * (criterion 33), mirroring `deleteValueAt`. `null` when the deleted row was
 * the exact one the hint pointed at — that row is gone, so there's nothing
 * left for the badge to point at.
 */
export function shiftReadHintForDelete(hintIndex: number, deletedAt: number): number | null {
  if (hintIndex === deletedAt) return null;
  return hintIndex > deletedAt ? hintIndex - 1 : hintIndex;
}
