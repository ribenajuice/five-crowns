/**
 * `ReviewGrid` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Hand label · editable cell · derived hand score. One row per hand, every
 * cell always editable (PRD criterion 18), rows on `--pitch` so they line up
 * with `PhotoStrip` (criterion 14).
 *
 * ⚠️ A repeated value renders as an ordinary zero-point hand — nothing here
 * may mark a repeat as suspicious (criteria 19, 20). Only a monotonicity
 * break (`PairedFlag`) or an out-of-range/non-integer cell gets the `err`
 * treatment; unread cells get a plain dashed "not typed yet" style, not a
 * duplicate-read style.
 */

import { HAND_LABELS, type CellValue, type ColumnValidation } from "@/lib/scoring";
import { REVIEW_ROW_PITCH_PX } from "@/lib/ui/constants";
import { pairedFlagSentence, readHintSentence, softWarningSentence } from "@/lib/ui/copy";
import { visibleReadHintIndex } from "@/lib/ui/read-hints";
import type { SoftWarningHit } from "@/lib/ui/soft-warnings";
import { PairedFlag } from "./PairedFlag";
import { ReadHint } from "./ReadHint";
import { SoftWarning } from "./SoftWarning";

interface ReviewGridProps {
  values: readonly CellValue[];
  handScores: readonly CellValue[];
  columnValidation: ColumnValidation;
  softWarnings: SoftWarningHit[];
  /**
   * The model's own doubt about this column, from the transcribe response —
   * live diagnostics for one attempt, never persisted (Stage 3). `null` or
   * `undefined` when there's no reading, or nothing stood out.
   */
  readHintIndex?: number | null;
  onEditCell: (index: number) => void;
}

export function ReviewGrid({
  values,
  handScores,
  columnValidation,
  softWarnings,
  readHintIndex = null,
  onEditCell,
}: ReviewGridProps) {
  const monotonicityIssues = columnValidation.issues.filter(
    (issue) => issue.code === "not_monotonic",
  );
  const otherCellIssues = columnValidation.issues.filter(
    (issue) => issue.code === "not_an_integer" || issue.code === "out_of_range",
  );

  const errIndices = new Set<number>();
  for (const issue of [...monotonicityIssues, ...otherCellIssues]) {
    for (const index of issue.indices) errIndices.add(index);
  }

  const unreadIssue = columnValidation.issues.find((issue) => issue.code === "unread_cells");
  const unreadIndices = new Set(unreadIssue?.indices ?? []);
  const warnIndices = new Set(softWarnings.map((hit) => hit.index));

  // Weakest of the three grid signals — suppressed the moment a real problem
  // (or an unread cell) already claims this cell (docs/DESIGN-SYSTEM.md § ReadHint).
  const visibleHintIndex = visibleReadHintIndex({
    leastConfidentIndex: readHintIndex,
    errIndices,
    unreadIndices,
    warnIndices,
  });

  return (
    <div className="min-w-0 flex-1">
      <ol className="flex flex-col">
        {HAND_LABELS.map((label, index) => {
          const value = values[index] ?? null;
          const hand = handScores[index] ?? null;
          const isErr = errIndices.has(index);
          const isUnread = !isErr && unreadIndices.has(index) && value === null;
          const isWarn = !isErr && warnIndices.has(index);
          const isHinted = visibleHintIndex === index;

          return (
            <li
              key={label}
              style={{ height: REVIEW_ROW_PITCH_PX }}
              className="flex items-center gap-2 border-b border-line last:border-b-0"
            >
              <span className="w-11 shrink-0 text-xs font-bold uppercase tracking-label text-text-muted">
                {label}
              </span>
              <div className="relative h-full min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onEditCell(index)}
                  aria-label={`${label}: ${value ?? "not typed yet"}. Edit this number.${
                    isHinted ? ` ${readHintSentence(index + 1)}` : ""
                  }`}
                  className={[
                    // The row is the 46px pitch (matches PhotoStrip); the button
                    // fills it so its own hit area still clears the 44px minimum.
                    "tabular flex h-full w-full items-center justify-end rounded-[var(--radius)] border px-2 text-right text-num font-bold",
                    isErr
                      ? "border-error bg-error-soft text-error"
                      : isUnread
                        ? "border-dashed border-text-muted bg-sunk text-text-muted"
                        : isWarn
                          ? "border-warn bg-warn-soft text-warn"
                          : "border-line bg-surface text-text",
                  ].join(" ")}
                >
                  {value ?? "–"}
                </button>
                {isHinted ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 size-2.5 rounded-full border border-dotted border-text-muted bg-surface"
                  />
                ) : null}
              </div>
              <span className="tabular w-9 shrink-0 text-right text-sm text-text-muted">
                {hand === null ? "–" : hand}
              </span>
            </li>
          );
        })}
      </ol>

      {monotonicityIssues.map((issue) => {
        const [previousIndex, index] = issue.indices;
        const higher = previousIndex !== undefined ? values[previousIndex] : null;
        const lower = index !== undefined ? values[index] : null;
        return (
          <PairedFlag key={`mono-${previousIndex}-${index}`}>
            {typeof lower === "number" && typeof higher === "number"
              ? pairedFlagSentence(lower, higher)
              : issue.message}
          </PairedFlag>
        );
      })}

      {otherCellIssues.map((issue, i) => (
        <PairedFlag key={`issue-${issue.code}-${i}`}>{issue.message}</PairedFlag>
      ))}

      {softWarnings.map((hit) => (
        <SoftWarning key={`warn-${hit.index}`}>
          {softWarningSentence(hit.points, hit.index + 1)}
        </SoftWarning>
      ))}

      {visibleHintIndex !== null ? (
        <ReadHint>{readHintSentence(visibleHintIndex + 1)}</ReadHint>
      ) : null}
    </div>
  );
}
