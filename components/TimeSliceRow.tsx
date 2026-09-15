/**
 * `TimeSliceRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 4,
 * criteria 265–267).
 *
 * A thin adapter over `AverageRow` (code review, M3 Stage 4 follow-up —
 * this used to hand-duplicate `AverageRow`'s whole shape with the link
 * removed): a fixed label (a weekday or month name, never a player or
 * roster) in place of `AverageRow`'s `name`, no `href` (so the label renders
 * as plain bold text, never a link), a dual sample caption
 * ("{games} games · {scores} scores"), and `average` passed straight
 * through, `null` and all — `AverageRow` itself renders the no-data fixed
 * string in muted ink for a slice with no games, never a `0.0`.
 *
 * ⚠️ **No ranking decoration of any kind** — no crown, medal, best-day or
 * worst-month marker, no colour, no reordering by the mean (criterion 267):
 * the caller renders all seven or twelve rows always, in fixed calendar
 * order, whether or not they have any games in them.
 */
import { AverageRow } from "./AverageRow";
import { rosterAverageSampleCaption } from "@/lib/ui/copy";

export interface TimeSliceRowProps {
  label: string;
  gamesPlayed: number;
  scoresCount: number;
  /** `null` — never `0` — for a slice with no games. */
  average: number | null;
}

export function TimeSliceRow({ label, gamesPlayed, scoresCount, average }: TimeSliceRowProps) {
  return (
    <AverageRow
      name={label}
      sample={rosterAverageSampleCaption(gamesPlayed, scoresCount)}
      average={average}
    />
  );
}
