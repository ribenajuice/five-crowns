/**
 * `ReadHint` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * The model's own least-confident-cell guess: deliberately the weakest of the
 * three grid signals, weaker than `SoftWarning`. No border or tint on the
 * cell itself and no semantic colour here at all — the two signals are the
 * dotted corner badge (drawn on the cell by `ReviewGrid`) and this one muted
 * sentence beneath the grid. Never `role="alert"`: nothing here is urgent,
 * and it must never imply the cell is wrong.
 */
export function ReadHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-text-muted">{children}</p>;
}
