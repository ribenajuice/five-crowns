/**
 * `AverageRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criteria 223–224, 242), one row of `AveragesTable`'s two plain lists
 * (`/stats`' "Averages" section: "Players" then "Rosters").
 *
 * A name (`EntityLink`), a muted sample caption, and the average right-
 * aligned in tabular type. ⚠️ No ranking decoration of any kind — no crown,
 * medal, or 1st/2nd/3rd (criterion 242); the caller is responsible for
 * ordering rows alphabetically, never by the average itself.
 *
 * `href` and `average` are both optional/nullable (code review, M3 Stage 4
 * follow-up) so `TimeSliceRow` — a fixed calendar label with no page to link
 * to, and a mean that can be genuinely absent for a slice with no games — can
 * reuse this component instead of hand-duplicating its shape: no `href`
 * renders the name as plain bold text, and `average: null` renders the
 * no-data fixed string in muted ink instead of a `0.0`. Every existing caller
 * (both `/stats` "Averages" lists) keeps passing both, unaffected.
 */
import { EntityLink } from "./EntityLink";
import { NO_DATA_VALUE } from "@/lib/ui/copy";

export interface AverageRowProps {
  /** Omitted for a row with no page to link to — the name renders as plain bold text instead. */
  href?: string;
  name: string;
  sample: string;
  /** `null` — never `0` — for a row with no games behind it. */
  average: number | null;
}

export function AverageRow({ href, name, sample, average }: AverageRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{href ? <EntityLink href={href}>{name}</EntityLink> : name}</span>
        <span className="block text-xs text-text-muted">{sample}</span>
      </span>
      <span className={`tabular shrink-0 text-base font-black ${average === null ? "text-text-muted" : ""}`}>
        {average !== null ? average.toFixed(1) : NO_DATA_VALUE}
      </span>
    </li>
  );
}
