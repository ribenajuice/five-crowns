/**
 * `DisasterRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criterion 240), `/stats`' "Biggest single-hand disasters".
 *
 * `GameRow`-shaped rows reused for a different claim: rank, player (display
 * face), hand and date on a muted second line, the score right-aligned in
 * tabular type, the whole row a tap target to that game.
 */
import Link from "next/link";

import { formatRecordDate } from "@/lib/ui/copy";
import type { HandLabel } from "@/lib/scoring";

export interface DisasterRowProps {
  rank: number;
  gameId: string;
  displayName: string;
  hand: HandLabel;
  playedOn: string;
  score: number;
}

export function DisasterRow({ rank, gameId, displayName, hand, playedOn, score }: DisasterRowProps) {
  const formattedDate = formatRecordDate(playedOn);

  return (
    <Link
      href={`/games/${gameId}`}
      aria-label={`Rank ${rank}: ${displayName}, ${hand}, ${formattedDate}, ${score} points`}
      className="flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-2.5 text-inherit no-underline"
    >
      <span className="tabular w-6 shrink-0 font-bold text-text-muted">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{displayName}</p>
        <p className="truncate text-xs text-text-muted">
          {hand} · {formattedDate}
        </p>
      </div>
      <span className="tabular shrink-0 text-right text-lg font-black">{score}</span>
    </Link>
  );
}
