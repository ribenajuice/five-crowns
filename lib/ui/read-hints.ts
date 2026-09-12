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
