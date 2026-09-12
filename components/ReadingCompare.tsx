"use client";

/**
 * `ReadingCompare` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Replaces the active column's card content the moment a close-up reading
 * returns — the same in-place convention `TranscribeProgress` established in
 * Stage 3, not a dialog (PRD criteria 38–41). Two columns of rows sharing the
 * grid's row pitch: **"Saved now"** against **"New close-up"** by default, or
 * any two named readings when browsing history — same component, generalised
 * labels and copy, no new screen.
 *
 * A differing row gets the neutral `--sunk` tint (never a semantic colour — a
 * difference is neither right nor wrong), a swap icon, and the whole grid is
 * followed by one plain sentence naming every differing line.
 */

import type { CellValue } from "@/lib/scoring";
import { HANDS_PER_GAME } from "@/lib/scoring";
import {
  cellRowLabel,
  compareDifferingLinesSummary,
  compareDifferingLinesSummaryGeneral,
  compareHistoryLink,
  COMPARE_KEEP_NEW_LABEL,
  COMPARE_KEEP_OLD_LABEL,
  COMPARE_RESHOOT_LINK,
  COMPARE_SUBHEADING,
} from "@/lib/ui/copy";
import { REVIEW_ROW_PITCH_PX } from "@/lib/ui/constants";
import { buttonClasses } from "./Button";
import { TypedCellDisagreement } from "./TypedCellDisagreement";
import { WrongColumnWarning } from "./WrongColumnWarning";

export interface TypedCellDisagreementHit {
  index: number;
  typedValue: number;
  closeUpValue: number;
}

interface ReadingCompareProps {
  /** Defaults to "Compared with what's saved now." — pass a generalised
   *  heading (`compareVsPastReadingHeading`) when comparing two past readings. */
  subheading?: string;
  oldLabel: string;
  newLabel: string;
  oldValues: readonly CellValue[];
  newValues: readonly CellValue[];
  /** Only meaningful comparing "saved" against a freshly-returned close-up —
   *  `undefined` for a past-vs-past comparison, which has no such warning. */
  wrongColumnWarning?: { sheetPlayer: string; assignedPlayer: string } | null;
  typedCellDisagreements?: readonly TypedCellDisagreementHit[];
  /** Criterion 44: shown, non-blocking, when the new reading is short. */
  incompleteNote?: string | null;
  onKeepNew: () => void;
  onKeepOld: () => void;
  keepNewLabel?: string;
  keepOldLabel?: string;
  onPhotographAgain?: () => void;
  onSeeHistory: () => void;
  historyCount: number;
  /** Past-vs-past comparisons have no "saved" side, so the summary sentence
   *  drops that phrasing (`compareDifferingLinesSummaryGeneral`). */
  generalised?: boolean;
}

export function ReadingCompare({
  subheading = COMPARE_SUBHEADING,
  oldLabel,
  newLabel,
  oldValues,
  newValues,
  wrongColumnWarning,
  typedCellDisagreements = [],
  incompleteNote,
  onKeepNew,
  onKeepOld,
  keepNewLabel = COMPARE_KEEP_NEW_LABEL,
  keepOldLabel = COMPARE_KEEP_OLD_LABEL,
  onPhotographAgain,
  onSeeHistory,
  historyCount,
  generalised = false,
}: ReadingCompareProps) {
  const rowCount = Math.max(oldValues.length, newValues.length, HANDS_PER_GAME);
  const disagreementByIndex = new Map(typedCellDisagreements.map((d) => [d.index, d]));

  const differingLabels: string[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const before = oldValues[i] ?? null;
    const after = newValues[i] ?? null;
    if (before !== after) differingLabels.push(cellRowLabel(i, rowCount));
  }

  const summary = generalised
    ? compareDifferingLinesSummaryGeneral(differingLabels)
    : compareDifferingLinesSummary(differingLabels);

  return (
    <div className="mt-3 rounded-[var(--radius)] border border-line bg-surface p-3">
      <p className="mb-3 text-sm text-text-muted">{subheading}</p>

      {wrongColumnWarning ? (
        <div className="mb-3">
          <WrongColumnWarning
            sheetPlayer={wrongColumnWarning.sheetPlayer}
            assignedPlayer={wrongColumnWarning.assignedPlayer}
          />
        </div>
      ) : null}

      <div className="mb-2 flex text-xs font-bold uppercase tracking-label text-text-muted">
        <span className="w-11 shrink-0" />
        <span className="flex-1 text-right pr-2">{oldLabel}</span>
        <span className="w-6 shrink-0" />
        <span className="flex-1 text-right">{newLabel}</span>
      </div>

      <ol className="flex flex-col">
        {Array.from({ length: rowCount }, (_, index) => {
          const before = oldValues[index] ?? null;
          const after = newValues[index] ?? null;
          const differs = before !== after;
          const disagreement = disagreementByIndex.get(index);

          return (
            <li key={index}>
              <div
                style={{ height: REVIEW_ROW_PITCH_PX }}
                className={`flex items-center gap-2 border-b border-line last:border-b-0 ${differs ? "bg-sunk" : ""}`}
              >
                <span className="w-11 shrink-0 text-xs font-bold uppercase tracking-label text-text-muted">
                  {cellRowLabel(index, rowCount)}
                </span>
                <span className="tabular flex-1 text-right text-num font-bold text-text">
                  {before ?? "–"}
                </span>
                <span aria-hidden="true" className="w-6 shrink-0 text-center text-text-muted">
                  {differs ? "⇄" : ""}
                </span>
                <span className="tabular flex-1 text-right text-num font-bold text-text">
                  {after ?? "–"}
                </span>
              </div>
              {disagreement ? (
                <TypedCellDisagreement
                  typed={disagreement.typedValue}
                  read={disagreement.closeUpValue}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-sm text-text-muted">{summary}</p>

      {incompleteNote ? (
        <div className="mt-2">
          <p className="text-sm text-warn">{incompleteNote}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onKeepNew} className={buttonClasses("primary", { fullWidth: true })}>
          {keepNewLabel}
        </button>
        <button type="button" onClick={onKeepOld} className={buttonClasses("ghost", { fullWidth: true })}>
          {keepOldLabel}
        </button>
        <div className="mt-1 flex items-center justify-between gap-2">
          {onPhotographAgain ? (
            <button type="button" onClick={onPhotographAgain} className="text-sm font-bold text-accent-ink">
              {COMPARE_RESHOOT_LINK}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onSeeHistory} className="text-sm font-bold text-brand">
            {compareHistoryLink(historyCount)}
          </button>
        </div>
      </div>
    </div>
  );
}
