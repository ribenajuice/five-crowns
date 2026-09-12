/**
 * `FinalRow` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * The last line of every column, called out on its own — a wrong number here
 * changes who won (PRD criterion 23). Winner(s) marked by crown, label *and*
 * colour together; a tie marks all of them (criterion 66).
 */

import { CrownIcon } from "./icons";

export interface FinalRowItem {
  id: string;
  label: string;
  finalScore: number | null;
}

export function FinalRow({
  items,
  winnerIds,
}: {
  items: FinalRowItem[];
  winnerIds: readonly string[];
}) {
  const winners = new Set(winnerIds);

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-bold">How it finished</h2>
      <p className="mb-3 text-sm text-text-muted">
        The line that decides who won. Check it hardest.
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const isWinner = winners.has(item.id);
          return (
            <li
              key={item.id}
              className={`flex items-center gap-2 rounded-[var(--radius)] px-2 py-2 ${
                isWinner ? "bg-success-soft" : ""
              }`}
            >
              {isWinner ? (
                <CrownIcon className="shrink-0 text-success" />
              ) : (
                <span className="size-[18px] shrink-0" aria-hidden="true" />
              )}
              <span className={`flex-1 ${isWinner ? "font-bold text-success" : "text-text"}`}>
                {item.label}
                {isWinner ? " · Winner" : ""}
              </span>
              <span
                className={`tabular text-num font-bold ${isWinner ? "text-success" : "text-text"}`}
              >
                {item.finalScore ?? "–"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
