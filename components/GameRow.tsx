/**
 * `GameRow` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Date · venue · roster · winner(s). PRD criterion 69: "No location" rather
 * than a gap, and "{A} & {B} — shared" for a tied game.
 */

import Link from "next/link";

import { NO_LOCATION_GAMES_LIST, sharedWinGamesListLabel } from "@/lib/ui/copy";

export interface GameRowProps {
  id: string;
  playedOn: string;
  locationName: string | null;
  rosterName: string;
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

export function GameRow({ id, playedOn, locationName, rosterName, winners }: GameRowProps) {
  return (
    <Link
      href={`/games/${id}`}
      className="flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{formatDate(playedOn)}</p>
        <p className="truncate text-sm text-text-muted">
          {locationName ?? NO_LOCATION_GAMES_LIST} · {rosterName}
        </p>
      </div>
      <p className="shrink-0 text-right text-sm font-bold text-success">
        {sharedWinGamesListLabel(winners)}
      </p>
    </Link>
  );
}
