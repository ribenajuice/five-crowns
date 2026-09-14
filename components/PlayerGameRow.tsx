/**
 * A row on a player's own page — PRD criterion 133: date, venue-or-"No
 * location", the roster name (linking to its roster page), this player's own
 * final score for that game, and a winner marker when they won.
 *
 * Same "stretched link" shape as `GameRow` — the whole row opens the game,
 * the roster name is a second, independently tappable `EntityLink` layered
 * on top (criterion 174).
 */

import Link from "next/link";

import { EntityLink } from "./EntityLink";
import { CrownIcon } from "./icons";
import { NO_LOCATION_GAMES_LIST } from "@/lib/ui/copy";

export interface PlayerGameRowProps {
  gameId: string;
  playedOn: string;
  locationName: string | null;
  rosterId: string;
  rosterName: string;
  finalScore: number;
  isWinner: boolean;
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

export function PlayerGameRow({
  gameId,
  playedOn,
  locationName,
  rosterId,
  rosterName,
  finalScore,
  isWinner,
}: PlayerGameRowProps) {
  const formattedDate = formatDate(playedOn);

  return (
    <div className="relative flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
      <Link
        href={`/games/${gameId}`}
        aria-label={`Open game: ${formattedDate}`}
        className="absolute inset-0 z-0 rounded-[var(--radius)]"
      />
      <div className="relative min-w-0 flex-1">
        <p className="font-display text-base font-bold">{formattedDate}</p>
        <p className="truncate text-sm text-text-muted">
          {locationName ?? NO_LOCATION_GAMES_LIST} ·{" "}
          <span className="relative z-10">
            <EntityLink href={`/rosters/${rosterId}`}>{rosterName}</EntityLink>
          </span>
        </p>
      </div>
      <p
        className={`tabular relative z-10 flex shrink-0 items-center gap-1 text-right font-bold ${
          isWinner ? "text-success" : "text-text-muted"
        }`}
      >
        {isWinner ? <CrownIcon className="text-success" /> : null}
        {finalScore}
      </p>
    </div>
  );
}
