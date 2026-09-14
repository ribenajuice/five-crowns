/**
 * A row on a roster's own page — PRD criterion 138: date, venue-or-"No
 * location", winner(s). The roster name itself is omitted (it's redundant on
 * its own page), so — unlike `GameRow`/`PlayerGameRow` — there's no second,
 * independently tappable link inside the row; the whole row is a plain
 * `Link` to the game, same as `GameRow` before Stage 3 added the roster link.
 */

import Link from "next/link";

import { NO_LOCATION_GAMES_LIST, sharedWinGamesListLabel } from "@/lib/ui/copy";

export interface RosterGameRowProps {
  gameId: string;
  playedOn: string;
  locationName: string | null;
  winners: string[];
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RosterGameRow({ gameId, playedOn, locationName, winners }: RosterGameRowProps) {
  return (
    <Link
      href={`/games/${gameId}`}
      className="flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{formatDate(playedOn)}</p>
        <p className="truncate text-sm text-text-muted">{locationName ?? NO_LOCATION_GAMES_LIST}</p>
      </div>
      <p className="shrink-0 text-right text-sm font-bold text-success">
        {sharedWinGamesListLabel(winners)}
      </p>
    </Link>
  );
}
