/**
 * `ByVenueRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 4,
 * criteria 256–258).
 *
 * Mirrors `ByRosterRow`'s shape with a third figure added — the same way the
 * roster page's own member row gained an "avg" column in Stage 3: the
 * venue's name as an `EntityLink` to `/places/{id}` with a muted "{n} games"
 * caption beneath, a right-aligned win rate over a "{wins} of {games}"
 * caption, and a third right-aligned stat — that player's average final
 * score at that venue — in the same `--num`/`--text-xs`-label shape.
 *
 * ⚠️ **The final row is "No location"** (criterion 251): the same four
 * figures, but the name renders as plain bold text, never an `EntityLink` —
 * there is no venue page for it to lead to. Pass `locationId={null}` for
 * that row; the caller is responsible for ordering (games at that venue
 * descending, then alphabetically, "No location" always last).
 */
import { EntityLink } from "./EntityLink";
import {
  NO_DATA_VALUE,
  ROSTER_MEMBER_AVERAGE_LABEL,
  byRosterGamesCaption,
  formatWinRatePercent,
} from "@/lib/ui/copy";

export interface ByVenueRowProps {
  locationId: string | null;
  locationName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  /** `null` only for a "No location" row with zero games — nothing to average. */
  average: number | null;
}

export function ByVenueRow({
  locationId,
  locationName,
  gamesPlayed,
  wins,
  winRate,
  average,
}: ByVenueRowProps) {
  return (
    <li className="flex items-center gap-2 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          {locationId ? (
            <EntityLink href={`/places/${locationId}`}>{locationName}</EntityLink>
          ) : (
            <span className="text-text">{locationName}</span>
          )}
        </span>
        <span className="block text-sm text-text-muted">{byRosterGamesCaption(gamesPlayed)}</span>
      </span>
      <span className="shrink-0 text-right text-sm">
        <span className="tabular block text-base font-black">{formatWinRatePercent(winRate)}</span>
        <span className="block text-text-muted">
          {wins} of {gamesPlayed}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
          {ROSTER_MEMBER_AVERAGE_LABEL}
        </span>
        <span className="tabular block text-base font-black">
          {average !== null ? average.toFixed(1) : NO_DATA_VALUE}
        </span>
      </span>
    </li>
  );
}
