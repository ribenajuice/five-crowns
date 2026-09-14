/**
 * `HeadToHeadRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 2).
 *
 * One row per opponent shared at least one game with (PRD criterion 203): the
 * opponent's name styled like an `EntityLink` (brand-coloured, underlined) —
 * but, unlike a real `EntityLink`, not a second independently-tappable
 * anchor, because there is only one destination this row ever goes to: the
 * pair's shared games (criterion 204). A right-aligned "{n} games together"
 * caption, then a three-across mini-stat row in `StatBlock`'s own label/value
 * shape at a smaller scale — Wins, My win rate, Above me.
 *
 * Same "stretched link" construction as `PlayerGameRow`/`GameRow`: the whole
 * row is one `<Link>`, and every visible piece of content sits in a
 * `pointer-events-none` wrapper so nothing above the link can steal its tap
 * (docs/DESIGN-SYSTEM.md's own note on this, restated in those components).
 * Never by win rate or above-rate, which would read as a ranking this stat
 * explicitly isn't — the caller is responsible for the ordering (criterion
 * 203: games together descending, then alphabetically).
 */
import Link from "next/link";

import {
  HEAD_TO_HEAD_ABOVE_ME_LABEL,
  HEAD_TO_HEAD_MY_RATE_LABEL,
  HEAD_TO_HEAD_WINS_LABEL,
  formatWinRatePercent,
  headToHeadTogetherCaption,
} from "@/lib/ui/copy";

export interface HeadToHeadRowProps {
  opponentName: string;
  gamesTogether: number;
  /** This player's wins in these games, and the opponent's — criterion 197. */
  wins: number;
  opponentWins: number;
  /** This player's win rate across these games, a fraction 0–1. */
  winRate: number;
  /** The opponent's rate of finishing above this player, a fraction 0–1 (criterion 198). */
  opponentAboveRate: number;
  /** The pair's shared-games drill-through (criterion 204). */
  href: string;
}

export function HeadToHeadRow({
  opponentName,
  gamesTogether,
  wins,
  opponentWins,
  winRate,
  opponentAboveRate,
  href,
}: HeadToHeadRowProps) {
  const together = headToHeadTogetherCaption(gamesTogether);
  const label = `${opponentName} — ${together}, ${wins}–${opponentWins} wins, your win rate ${formatWinRatePercent(
    winRate,
  )}, above you ${formatWinRatePercent(opponentAboveRate)}. See these games.`;

  return (
    <div className="relative rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
      <Link
        href={href}
        aria-label={label}
        className="absolute inset-0 z-0 rounded-[var(--radius)]"
      />
      <div className="relative flex items-baseline justify-between gap-2 pointer-events-none">
        <span className="font-display text-base font-bold text-brand underline underline-offset-2">
          {opponentName}
        </span>
        <span className="shrink-0 text-sm text-text-muted">{together}</span>
      </div>
      <div className="relative mt-2 grid grid-cols-3 gap-2 pointer-events-none">
        <div>
          <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
            {HEAD_TO_HEAD_WINS_LABEL}
          </span>
          <span className="tabular block text-sm font-black">
            {wins}–{opponentWins}
          </span>
        </div>
        <div>
          <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
            {HEAD_TO_HEAD_MY_RATE_LABEL}
          </span>
          <span className="tabular block text-sm font-black">{formatWinRatePercent(winRate)}</span>
        </div>
        <div>
          <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
            {HEAD_TO_HEAD_ABOVE_ME_LABEL}
          </span>
          <span className="tabular block text-sm font-black">
            {formatWinRatePercent(opponentAboveRate)}
          </span>
        </div>
      </div>
    </div>
  );
}
