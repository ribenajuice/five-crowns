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

import { HANDS_PER_GAME, MAX_RUNNING_TOTAL, handLabel, type CellValue } from "@/lib/scoring";
import type { NormalisedCrop } from "@/lib/ui/crop-strip";
import { BottomSheet } from "./BottomSheet";
import { PhotoStrip } from "./PhotoStrip";
import { buttonClasses } from "./Button";

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
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

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
}: CellEditorProps) {
  const value = values[index] ?? null;
  const thisHand = handScores[index] ?? null;
  const nextHand = handScores[index + 1] ?? null;
  const label = handLabel(index + 1) ?? `hand ${index + 1}`;

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
          disabled={index === HANDS_PER_GAME - 1}
          onClick={() => onNavigate(index + 1)}
          className={`${buttonClasses("ghost")} flex-1`}
        >
          Next line ↓
        </button>
      </div>
    </BottomSheet>
  );
}
