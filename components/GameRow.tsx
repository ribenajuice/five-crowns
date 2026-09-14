/**
 * `GameRow` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Date · venue · roster · winner(s). PRD criterion 69: "No location" rather
 * than a gap, and "{A} & {B} — shared" for a tied game.
 *
 * Stage 3, criterion 174: the roster name is a second, independently
 * tappable `EntityLink` to its roster page, layered over the row's own
 * "stretched link" to the game — an absolutely-positioned, empty,
 * `aria-label`led anchor filling the row at a lower `z-index`, so today's
 * easy whole-row tap to open a game is unchanged (docs/DESIGN-SYSTEM.md §
 * "Reaching these pages", point 2).
 *
 * ⚠️ A `position: relative` sibling with no explicit `z-index` still shares
 * the stretched link's stack level (0), and later DOM order wins ties — so
 * without `pointer-events-none` these content wrappers would paint over, and
 * intercept every tap on, the stretched link beneath them (the whole date/
 * location/winner text would stop opening the game — code review, Stage 3).
 * `pointer-events-none` here makes each wrapper transparent to hit-testing
 * regardless of stacking order; `pointer-events-auto` on the `EntityLink`'s
 * own wrapper is the escape hatch that keeps *it* independently tappable.
 */

import Link from "next/link";

import { EntityLink } from "./EntityLink";
import { NO_LOCATION_GAMES_LIST, sharedWinGamesListLabel } from "@/lib/ui/copy";

export interface GameRowProps {
  id: string;
  playedOn: string;
  locationName: string | null;
  rosterId: string;
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

export function GameRow({
  id,
  playedOn,
  locationName,
  rosterId,
  rosterName,
  winners,
}: GameRowProps) {
  const formattedDate = formatDate(playedOn);
  const locationLabel = locationName ?? NO_LOCATION_GAMES_LIST;
  const openGameLabel = `Open game: ${formattedDate}, ${locationLabel}, ${rosterName}, ${sharedWinGamesListLabel(
    winners,
  )}`;

  return (
    <div className="relative flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
      <Link
        href={`/games/${id}`}
        aria-label={openGameLabel}
        className="absolute inset-0 z-0 rounded-[var(--radius)]"
      />
      <div className="relative min-w-0 flex-1 pointer-events-none">
        <p className="font-display text-base font-bold">{formattedDate}</p>
        <p className="truncate text-sm text-text-muted">
          {locationLabel} ·{" "}
          <span className="relative z-10 pointer-events-auto">
            <EntityLink href={`/rosters/${rosterId}`}>{rosterName}</EntityLink>
          </span>
        </p>
      </div>
      <p className="relative z-10 shrink-0 pointer-events-none text-right text-sm font-bold text-success">
        {sharedWinGamesListLabel(winners)}
      </p>
    </div>
  );
}
