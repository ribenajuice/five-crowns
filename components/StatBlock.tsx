/**
 * `StatBlock` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3).
 *
 * The admin usage panel's own label/value shape, formalised as a named,
 * reusable unit: uppercase `--text-xs` label, a `--num`-sized tabular value,
 * and — wherever criterion 133 requires it — a muted one-line sample-size
 * caption underneath. ⚠️ No ranking, no highlighting, no colour on these
 * numbers — this is a factual page, not a leaderboard.
 */
export interface StatBlockProps {
  label: string;
  value: string;
  sample?: string;
}

export function StatBlock({ label, value, sample }: StatBlockProps) {
  return (
    <div className="rounded-[var(--radius)] bg-sunk px-3 py-3 text-left">
      <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
        {label}
      </span>
      <span className="tabular mt-0.5 block text-num-lg font-black">{value}</span>
      {sample ? <span className="mt-0.5 block text-sm text-text-muted">{sample}</span> : null}
    </div>
  );
}
