/**
 * `TimeSliceRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 4,
 * criteria 265–267).
 *
 * `AverageRow`'s exact shape with the link removed: a fixed label (a weekday
 * or month name, never a player or roster) where the name sits, a dual
 * sample caption beneath it ("{games} games · {scores} scores"), and the
 * mean final score right-aligned in tabular type — or the no-data fixed
 * string ("–") when that row has no games, never a `0.0`.
 *
 * ⚠️ **No ranking decoration of any kind** — no crown, medal, best-day or
 * worst-month marker, no colour, no reordering by the mean (criterion 267):
 * the caller renders all seven or twelve rows always, in fixed calendar
 * order, whether or not they have any games in them.
 */
import { NO_DATA_VALUE, rosterAverageSampleCaption } from "@/lib/ui/copy";

export interface TimeSliceRowProps {
  label: string;
  gamesPlayed: number;
  scoresCount: number;
  /** `null` — never `0` — for a slice with no games. */
  average: number | null;
}

export function TimeSliceRow({ label, gamesPlayed, scoresCount, average }: TimeSliceRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-text-muted">
          {rosterAverageSampleCaption(gamesPlayed, scoresCount)}
        </span>
      </span>
      <span
        className={`tabular shrink-0 text-base font-black ${average === null ? "text-text-muted" : ""}`}
      >
        {average !== null ? average.toFixed(1) : NO_DATA_VALUE}
      </span>
    </li>
  );
}
