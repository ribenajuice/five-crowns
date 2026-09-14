/**
 * `PersonalRecordCard` — docs/DESIGN-SYSTEM.md § Component inventory (M3
 * Stage 2), player page "Streak, in context" section.
 *
 * `StatBlock`-shaped with an added chevron and tap target through to that
 * player's own qualifying games — deliberately not `RecordCard` reused
 * outright (a holder-name line would repeat "you," redundant on a player's
 * own page), and deliberately not bare `StatBlock` (that has no tap-through).
 *
 * A player who has never won at all has a real, honest streak of `0` — not
 * a "no holder" case (this is the player's own number, not a board record
 * with a possible absence of any holder) — but there are then no qualifying
 * games to drill into, so `href` is `null` and the card renders inert, the
 * same `StatBlock` shape with no chevron and no link.
 */
import Link from "next/link";

import { ChevronRightIcon } from "./icons";

export interface PersonalRecordCardProps {
  title: string;
  value: string;
  unit: string;
  /** `null` when there are no qualifying games to show (e.g. a streak of 0). */
  href: string | null;
  /** The claim, stated in full, for the card's own `aria-label` when it links. */
  claim: string;
}

export function PersonalRecordCard({ title, value, unit, href, claim }: PersonalRecordCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-label text-text-muted">{title}</span>
        {href ? <ChevronRightIcon className="shrink-0 text-brand" /> : null}
      </div>
      <span className="tabular mt-0.5 block text-num-lg font-black">{value}</span>
      <span className="mt-0.5 block text-sm text-text-muted">{unit}</span>
    </>
  );

  if (!href) {
    return <div className="rounded-[var(--radius)] bg-sunk px-3 py-3 text-left">{inner}</div>;
  }

  return (
    <Link
      href={href}
      aria-label={claim}
      className="block rounded-[var(--radius)] bg-sunk px-3 py-3 text-inherit text-left no-underline"
    >
      {inner}
    </Link>
  );
}
