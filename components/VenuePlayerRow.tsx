/**
 * `VenuePlayerRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 4,
 * criteria 260–261).
 *
 * The venue-page mirror of the roster page's own per-member row (Stage 3's
 * wins/rate/avg shape): a player's name as an `EntityLink` to their player
 * page, games at this venue as a muted caption, win rate over "{wins} of
 * {games}", and their average final score at this venue — the identical
 * three-stat shape `ByVenueRow` uses, just naming a player at one venue
 * instead of a venue for one player (decision 29: one shared function, two
 * rendering contexts, neither the "real" one). The win-rate and average
 * blocks are `WinRateAndAverageStats`, shared verbatim with `ByVenueRow`
 * (code review, M3 Stage 4 follow-up).
 *
 * ⚠️ **No ranking decoration** (criterion 261): the caller orders rows by
 * games here descending, then alphabetically, never by win rate or average.
 */
import { EntityLink } from "./EntityLink";
import { WinRateAndAverageStats } from "./WinRateAndAverageStats";
import { byRosterGamesCaption } from "@/lib/ui/copy";

export interface VenuePlayerRowProps {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  average: number;
}

export function VenuePlayerRow({
  playerId,
  displayName,
  gamesPlayed,
  wins,
  winRate,
  average,
}: VenuePlayerRowProps) {
  return (
    <li className="flex items-center gap-2 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          <EntityLink href={`/players/${playerId}`}>{displayName}</EntityLink>
        </span>
        <span className="block text-sm text-text-muted">{byRosterGamesCaption(gamesPlayed)}</span>
      </span>
      <WinRateAndAverageStats wins={wins} gamesPlayed={gamesPlayed} winRate={winRate} average={average} />
    </li>
  );
}
