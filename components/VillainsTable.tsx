/**
 * `VillainsTable` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criteria 225–226, 239, 247), `/stats`' "Hand-by-hand villains".
 *
 * Every player as a row, the eleven hands as columns, each cell a mean to one
 * decimal. The player-name column is sticky-left, the header row
 * sticky-top, and the whole table sits in its own `overflow-x: auto`
 * wrapper — the page itself never scrolls horizontally (hard rule). Each
 * row's own game count sits as a muted caption under the player's name, not a
 * twelfth column. The worst-hand marker (star, bold, `--accent-ink`) appears
 * once per row, on that player's own highest mean — never colour alone.
 */
import { StarIcon } from "./icons";
import { HAND_LABELS, type HandLabel } from "@/lib/scoring";
import { villainsRowSampleCaption } from "@/lib/ui/copy";

export interface VillainsTableRow {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  hands: readonly { label: HandLabel; mean: number }[];
  worstHands: readonly HandLabel[];
}

export function VillainsTable({ rows }: { rows: readonly VillainsTableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 whitespace-nowrap bg-sunk px-2.5 py-2 text-left text-xs font-bold uppercase tracking-label text-text-muted"
            >
              Player
            </th>
            {HAND_LABELS.map((label) => (
              <th
                key={label}
                scope="col"
                className="sticky top-0 z-10 whitespace-nowrap bg-sunk px-2.5 py-2 text-right text-xs font-bold uppercase tracking-label text-text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meanByLabel = new Map(row.hands.map((h) => [h.label, h.mean]));
            return (
              <tr key={row.playerId}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap border-b border-line bg-surface px-2.5 py-2 text-left font-display font-bold"
                >
                  {row.displayName}
                  <span className="block text-xs font-normal normal-case tracking-normal text-text-muted">
                    {villainsRowSampleCaption(row.gamesPlayed)}
                  </span>
                </th>
                {HAND_LABELS.map((label) => {
                  const mean = meanByLabel.get(label);
                  const isWorst = row.worstHands.includes(label);
                  return (
                    <td
                      key={label}
                      className={`tabular whitespace-nowrap border-b border-line px-2.5 py-2 text-right ${
                        isWorst ? "font-black text-accent-ink" : ""
                      }`}
                    >
                      {isWorst ? <StarIcon className="mr-1 inline-block align-[-1px]" /> : null}
                      {mean !== undefined ? mean.toFixed(1) : "–"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
