/**
 * `PersonalGameCard` — docs/DESIGN-SYSTEM.md § Component inventory (M3
 * Stage 3, criteria 228–229, 243), player page's "Best and worst game".
 *
 * `StatBlock`-shaped with an added chevron and tap-through to that one game:
 * "Best game" / "Worst game", each showing this player's own score and the
 * game's date as its caption (not a game count — this is one event, same
 * reasoning as the board's single-event cards). Deliberately distinct from
 * the board's "best/worst game ever" cards, which name the archive-wide
 * holder; this one is always about the page's own player and never repeats
 * their name.
 */
import Link from "next/link";

import { ChevronRightIcon } from "./icons";

export interface PersonalGameCardProps {
  label: string;
  score: number;
  date: string;
  href: string;
  claim: string;
}

export function PersonalGameCard({ label, score, date, href, claim }: PersonalGameCardProps) {
  return (
    <Link
      href={href}
      aria-label={claim}
      className="block rounded-[var(--radius)] bg-sunk px-3 py-3 text-left text-inherit no-underline"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-label text-text-muted">{label}</span>
        <ChevronRightIcon className="shrink-0 text-brand" />
      </div>
      <span className="tabular mt-0.5 block text-num-lg font-black">{score}</span>
      <span className="mt-0.5 block text-sm text-text-muted">{date}</span>
    </Link>
  );
}
