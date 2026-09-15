/**
 * `WinRateAndAverageStats` — the win-rate and average stat blocks shared
 * verbatim between `ByVenueRow` and `VenuePlayerRow` (code review, M3 Stage
 * 4 follow-up: the same wins/rate/avg shape was hand-duplicated in both).
 * Renders the two right-aligned `<span>` blocks only — the row's own name
 * cell (a venue or a player, linked or plain) stays with each caller, since
 * that part is genuinely different between the two.
 */
import { NO_DATA_VALUE, ROSTER_MEMBER_AVERAGE_LABEL, formatWinRatePercent } from "@/lib/ui/copy";

export interface WinRateAndAverageStatsProps {
  wins: number;
  gamesPlayed: number;
  winRate: number;
  /** `null` only for a row with nothing to average (`ByVenueRow`'s "No location" row with zero games). */
  average: number | null;
}

export function WinRateAndAverageStats({ wins, gamesPlayed, winRate, average }: WinRateAndAverageStatsProps) {
  return (
    <>
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
    </>
  );
}
