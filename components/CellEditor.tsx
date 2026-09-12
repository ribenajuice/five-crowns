"use client";

/**
 * `CellEditor` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Bottom sheet: photo strip (at the edited row) + numeric keypad + the two
 * derived hand scores an edit here actually changes + previous/next line
 * controls (PRD criterion 16). Every keystroke updates state with no network
 * round trip (criterion 17) — the keypad and the text field both call
 * `onChangeValue` directly, and the parent recomputes derived scores from
 * that new state on the same render.
 */

import { useEffect, useState } from "react";

import { MAX_RUNNING_TOTAL, type CellValue } from "@/lib/scoring";
import type { NormalisedCrop } from "@/lib/ui/crop-strip";
import {
  cellRowLabel,
  DELETE_LINE_ACTION,
  deleteConfirmDetail,
  deleteConfirmQuestion,
  FIX_THE_SHAPE_HELPER,
  FIX_THE_SHAPE_LINK,
  INSERT_ABOVE_ACTION,
  INSERT_BELOW_ACTION,
  insertConfirmDetail,
  insertConfirmQuestion,
  ordinal,
  STRUCTURE_CANCEL_BUTTON,
} from "@/lib/ui/copy";
import { BottomSheet } from "./BottomSheet";
import { PhotoStrip } from "./PhotoStrip";
import { buttonClasses } from "./Button";
import { WarningTriangleIcon } from "./icons";

interface CellEditorProps {
  open: boolean;
  onClose: () => void;
  columnLabel: string;
  index: number;
  values: readonly CellValue[];
  handScores: readonly CellValue[];
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  crop: NormalisedCrop | null;
  onChangeValue: (index: number, value: number | null) => void;
  onNavigate: (index: number) => void;
  onSetCrop?: () => void;
  /** Stage 4's "fix the shape": undefined hides the link entirely (no column
   *  context to repair against, e.g. no draft loaded yet). */
  fixTheShape?: {
    canInsert: boolean;
    canDelete: boolean;
    onInsertBefore: () => void;
    onInsertAfter: () => void;
    onDelete: () => void;
  };
}

type PendingShapeAction = "insert-above" | "insert-below" | "delete";

function digitsOnly(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? Math.min(value, MAX_RUNNING_TOTAL) : null;
}

export function CellEditor({
  open,
  onClose,
  columnLabel,
  index,
  values,
  handScores,
  photoUrl,
  photoWidth,
  photoHeight,
  crop,
  onChangeValue,
  onNavigate,
  onSetCrop,
  fixTheShape,
}: CellEditorProps) {
  const [shapeOpen, setShapeOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingShapeAction | null>(null);

  const value = values[index] ?? null;
  const thisHand = handScores[index] ?? null;
  const nextHand = handScores[index + 1] ?? null;
  const label = cellRowLabel(index, values.length);
  const lastIndex = Math.max(values.length - 1, 0);

  // A line change (prev/next, or the sheet reopening on a different cell)
  // always drops back to the plain editor — "fix the shape" is relative to
  // whichever line is open, and stays honest about which line that is.
  useEffect(() => {
    setShapeOpen(false);
    setPendingAction(null);
  }, [index, open]);

  function closeShapeUi() {
    setShapeOpen(false);
    setPendingAction(null);
  }

  function commitPendingAction() {
    if (!fixTheShape || !pendingAction) return;
    if (pendingAction === "insert-above") fixTheShape.onInsertBefore();
    if (pendingAction === "insert-below") fixTheShape.onInsertAfter();
    if (pendingAction === "delete") fixTheShape.onDelete();
    closeShapeUi();
  }

  function pressDigit(digit: string) {
    const current = value === null ? "" : String(value);
    onChangeValue(index, digitsOnly(current + digit));
  }

  function pressBackspace() {
    const current = value === null ? "" : String(value);
    onChangeValue(index, digitsOnly(current.slice(0, -1)));
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${columnLabel} · ${label}`}
      tall
    >
      <p className="mb-3 -mt-2 text-sm text-text-muted">{ordinal(index + 1)} line down</p>

      <div className="flex gap-3">
        <PhotoStrip
          photoUrl={photoUrl}
          photoWidth={photoWidth}
          photoHeight={photoHeight}
          crop={crop}
          highlightIndex={index}
          onSetCrop={onSetCrop}
          fallbackWidth={96}
        />

        <div className="min-w-0 flex-1">
          <label htmlFor="cell-editor-value" className="sr-only">
            {`${columnLabel}, ${label}`}
          </label>
          <input
            id="cell-editor-value"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            value={value ?? ""}
            onChange={(event) => onChangeValue(index, digitsOnly(event.target.value))}
            placeholder="–"
            className="tabular h-14 w-full rounded-[var(--radius)] border border-text-muted bg-surface px-3 text-right text-num-lg font-black text-text"
          />
          <p className="mt-2 text-sm text-text-muted">
            This hand:{" "}
            <b className="text-text">{thisHand === null ? "–" : thisHand}</b>
            {" · "}next hand:{" "}
            <b className="text-text">{nextHand === null ? "–" : nextHand}</b>
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => pressDigit(digit)}
                className="tabular h-12 rounded-[var(--radius)] border border-line bg-sunk text-lg font-bold text-text"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={pressBackspace}
              aria-label="Delete last digit"
              className="h-12 rounded-[var(--radius)] border border-line bg-sunk text-lg font-bold text-text"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => pressDigit("0")}
              className="tabular h-12 rounded-[var(--radius)] border border-line bg-sunk text-lg font-bold text-text"
            >
              0
            </button>
            <button type="button" onClick={onClose} className={buttonClasses("primary")}>
              Done
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onNavigate(index - 1)}
          className={`${buttonClasses("ghost")} flex-1`}
        >
          ↑ Previous line
        </button>
        <button
          type="button"
          disabled={index === lastIndex}
          onClick={() => onNavigate(index + 1)}
          className={`${buttonClasses("ghost")} flex-1`}
        >
          Next line ↓
        </button>
      </div>

      {fixTheShape ? (
        <div className="mt-4 border-t border-line pt-3">
          {!shapeOpen ? (
            <button
              type="button"
              onClick={() => setShapeOpen(true)}
              className="text-sm font-bold text-brand underline underline-offset-2"
            >
              {FIX_THE_SHAPE_LINK}
            </button>
          ) : pendingAction ? (
            <div>
              <p className="font-bold">
                {pendingAction === "delete"
                  ? deleteConfirmQuestion(index + 1, value)
                  : insertConfirmQuestion(pendingAction === "insert-above" ? index + 1 : index + 2)}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {pendingAction === "delete"
                  ? deleteConfirmDetail(values.length)
                  : insertConfirmDetail(values.length)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={closeShapeUi}
                  className={`${buttonClasses("ghost")} flex-1`}
                >
                  {STRUCTURE_CANCEL_BUTTON}
                </button>
                <button
                  type="button"
                  onClick={commitPendingAction}
                  className={`${buttonClasses(pendingAction === "delete" ? "accent" : "primary")} flex-1`}
                >
                  {pendingAction === "delete"
                    ? DELETE_LINE_ACTION
                    : pendingAction === "insert-above"
                      ? INSERT_ABOVE_ACTION
                      : INSERT_BELOW_ACTION}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-text-muted">{FIX_THE_SHAPE_HELPER}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!fixTheShape.canInsert}
                  onClick={() => setPendingAction("insert-above")}
                  className={buttonClasses("ghost")}
                >
                  {INSERT_ABOVE_ACTION}
                </button>
                <button
                  type="button"
                  disabled={!fixTheShape.canInsert}
                  onClick={() => setPendingAction("insert-below")}
                  className={buttonClasses("ghost")}
                >
                  {INSERT_BELOW_ACTION}
                </button>
                <button
                  type="button"
                  disabled={!fixTheShape.canDelete}
                  onClick={() => setPendingAction("delete")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-error px-4 text-base font-bold text-error disabled:opacity-60"
                >
                  <WarningTriangleIcon />
                  {DELETE_LINE_ACTION}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
}
