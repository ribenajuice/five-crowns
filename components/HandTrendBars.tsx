/**
 * `HandTrendBars` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criteria 225, 237–238), reused by `/stats`' archive-wide "eleven-hand
 * trend" and the player page's own "eleven-hand profile".
 *
 * Eleven rows, one per hand (3s … Kings), each a label, a horizontal bar
 * (`--brand` fill on a `--sunk` track, decorative, `aria-hidden`) and **the
 * mean printed as real text** beside it — never only a bar (criterion 237,
 * 247's "text equivalent"). `worstHands` marks every hand tied for the
 * player's own highest mean (criterion 226) with a filled star plus bold,
 * `--accent-ink`-coloured text — three signals together, never colour alone
 * (criterion 239, 247). Archive-wide callers simply omit `worstHands`: there
 * is no single "worst hand" for the whole group.
 */
import { StarIcon } from "./icons";
import type { HandLabel, HandMean } from "@/lib/scoring";

export interface HandTrendBarsProps {
  hands: readonly HandMean[];
  /** Every hand tied for the highest mean (criterion 226) — omitted for the archive-wide trend, which marks nothing. */
  worstHands?: readonly HandLabel[];
}

export function HandTrendBars({ hands, worstHands = [] }: HandTrendBarsProps) {
  const maxMean = hands.reduce((max, h) => Math.max(max, h.mean), 0);

  return (
    <div className="flex flex-col gap-1.5">
      {hands.map((h) => {
        const isWorst = worstHands.includes(h.label);
        const widthPercent = maxMean > 0 ? Math.max(4, Math.round((h.mean / maxMean) * 100)) : 0;

        return (
          <div key={h.hand} className="grid grid-cols-[48px_1fr_56px] items-center gap-2">
            <span className="text-xs font-bold text-text-muted">{h.label}</span>
            <span aria-hidden="true" className="h-[18px] overflow-hidden rounded-full bg-sunk">
              <span
                className={`block h-full rounded-full ${isWorst ? "bg-accent" : "bg-brand"}`}
                style={{ width: `${widthPercent}%` }}
              />
            </span>
            <span
              className={`tabular flex items-center justify-end gap-1 text-right text-sm font-bold ${
                isWorst ? "text-accent-ink" : ""
              }`}
            >
              {isWorst ? <StarIcon /> : null}
              {h.mean.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
