/**
 * `ByRosterRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 2).
 *
 * Mirrors the roster page's own per-member `<li>` (criteria 208–209) from the
 * other direction: the roster's name as an `EntityLink` to its roster page
 * with a muted "{n} games" caption beneath, right-aligned win rate (one
 * decimal) over a "{wins} of {games}" caption — pixel-identical stat shape to
 * `app/rosters/[id]/page.tsx`'s own member row, just naming the roster
 * instead of the member. No ranking or reordering by rate — the caller
 * orders rows by games in that roster descending, then alphabetically.
 */
import { EntityLink } from "./EntityLink";
import { byRosterGamesCaption, formatWinRatePercent } from "@/lib/ui/copy";

export interface ByRosterRowProps {
  rosterId: string;
  rosterName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export function ByRosterRow({ rosterId, rosterName, gamesPlayed, wins, winRate }: ByRosterRowProps) {
  return (
    <li className="flex items-center gap-2 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          <EntityLink href={`/rosters/${rosterId}`}>{rosterName}</EntityLink>
        </span>
        <span className="block text-sm text-text-muted">{byRosterGamesCaption(gamesPlayed)}</span>
      </span>
      <span className="shrink-0 text-right text-sm">
        <span className="tabular block text-base font-black">{formatWinRatePercent(winRate)}</span>
        <span className="block text-text-muted">
          {wins} of {gamesPlayed}
        </span>
      </span>
    </li>
  );
}
