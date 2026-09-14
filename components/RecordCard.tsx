/**
 * `RecordCard` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 1).
 *
 * Flat, equal-weight — title, holder(s), value, per-holder sample. No
 * ranking styling (no crowns, no medal colour, no 1st/2nd/3rd): this is five
 * independent facts, not a leaderboard (criterion 180). The whole card is the
 * tap target to its drill-through; a small chevron is the only visual
 * affordance, and the link's own `aria-label` states the claim so a screen
 * reader doesn't need the chevron to know it's tappable.
 *
 * Joint holders (criterion 181): every holder's name, alphabetical, joined
 * with the same "A, B & C" grammar `rosterDisplayName` already establishes
 * for `GameRow`'s shared-win label and an auto-named roster.
 *
 * ⚠️ The stalwart's card is the one documented exception (criterion 196,
 * design system "the records board"): its value *is* the holder's own game
 * count, so a second "from N games" sentence would repeat the same figure —
 * `sample` is simply omitted by the caller for that record.
 *
 * A `holders.length === 0` record (criterion 185) drops the value and
 * chevron for a plain italic sentence, never styled as a warning — not
 * reachable by any of Stage 1's five records over a non-empty archive, but
 * handled here because the board renders through one shared path regardless.
 */
import Link from "next/link";

import { ChevronRightIcon } from "./icons";
import { BOARD_NO_HOLDER_SENTENCE } from "@/lib/ui/copy";

export interface RecordCardProps {
  title: string;
  holderNames: string;
  value: string | null;
  unit: string;
  sample: string | null;
  href: string;
  /** The claim, stated in full, for the card's own `aria-label`. */
  claim: string;
}

export function RecordCard({ title, holderNames, value, unit, sample, href, claim }: RecordCardProps) {
  if (value === null) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
        <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
          {title}
        </span>
        <p className="mt-2 font-display text-base italic text-text-muted">
          {BOARD_NO_HOLDER_SENTENCE}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={claim}
      className="block rounded-[var(--radius)] border border-line bg-surface p-4 text-inherit no-underline hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-label text-text-muted">
          {title}
        </span>
        <ChevronRightIcon className="mt-0.5 shrink-0 text-brand" />
      </div>
      <p className="mt-1.5 font-display text-lg font-bold leading-tight">{holderNames}</p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="tabular text-num-lg font-black">{value}</span>
        <span className="text-sm font-bold text-text-muted">{unit}</span>
      </div>
      {sample ? <p className="mt-2 text-sm leading-snug text-text-muted">{sample}</p> : null}
    </Link>
  );
}
