/**
 * `AverageRow` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criteria 223–224, 242), one row of `AveragesTable`'s two plain lists
 * (`/stats`' "Averages" section: "Players" then "Rosters").
 *
 * A name (`EntityLink`), a muted sample caption, and the average right-
 * aligned in tabular type. ⚠️ No ranking decoration of any kind — no crown,
 * medal, or 1st/2nd/3rd (criterion 242); the caller is responsible for
 * ordering rows alphabetically, never by the average itself.
 */
import { EntityLink } from "./EntityLink";

export interface AverageRowProps {
  href: string;
  name: string;
  sample: string;
  average: number;
}

export function AverageRow({ href, name, sample, average }: AverageRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          <EntityLink href={href}>{name}</EntityLink>
        </span>
        <span className="block text-xs text-text-muted">{sample}</span>
      </span>
      <span className="tabular shrink-0 text-base font-black">{average.toFixed(1)}</span>
    </li>
  );
}
