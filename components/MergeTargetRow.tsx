/**
 * A row on the "which player/place?" merge-target picker
 * (docs/DESIGN-SYSTEM.md § `MergeTargetPicker`) — name plus a games-played
 * count as secondary text (an existing duplicate is often the one with
 * almost no games), the whole row a `Link`. No "add new" row, no pending
 * label — neither concept applies to picking a merge target.
 */

import Link from "next/link";

import { mergeTargetRowGamesLabel } from "@/lib/ui/copy";

export interface MergeTargetRowProps {
  href: string;
  name: string;
  gamesPlayed: number;
}

export function MergeTargetRow({ href, name, gamesPlayed }: MergeTargetRowProps) {
  return (
    <Link
      href={href}
      className="flex min-h-13 items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3"
    >
      <span className="min-w-0 truncate font-display text-base font-bold">{name}</span>
      <span className="tabular shrink-0 text-sm text-text-muted">
        {mergeTargetRowGamesLabel(gamesPlayed)}
      </span>
    </Link>
  );
}
