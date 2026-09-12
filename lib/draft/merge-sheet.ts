/**
 * Merging a sheet transcription into a draft.
 *
 * Follows rung 3 of the four-level override ladder
 * (docs/ARCHITECTURE.md § "Draft state and the four-level override ladder"),
 * generalised to a first (or retried) full-sheet read rather than a targeted
 * column re-shoot: a matching column gets a **new reading pushed onto its
 * stack**, with `activeReadingId` moved to it — never an overwrite. Nothing
 * in `manualEdits` is ever touched, so a founder who typed a correction into
 * a column during an earlier `invalid` attempt keeps it across a retry
 * (PRD criterion 53: retry reuses the photo, never starts over).
 *
 * The ordinary case — a freshly created, empty draft's first transcription —
 * has no existing columns to match, so every vision column becomes a brand
 * new one, in the order the model returned them (the paper's left-to-right
 * order, per the prompt). An existing column beyond the vision response's
 * length (the model returned fewer columns than the draft already has) is
 * left completely untouched, never deleted.
 */

import { randomUUID } from "node:crypto";

import { MAX_RUNNING_TOTAL } from "@/lib/scoring";
import type { SheetColumnReading } from "@/lib/vision/sheet-schema";

import {
  MAX_COLUMNS,
  MAX_NAME_LENGTH,
  MAX_READINGS_PER_COLUMN,
  MAX_VALUES_PER_COLUMN,
  type DraftColumn,
  type DraftState,
  type Reading,
} from "./state";

export interface SheetMergeDiagnostic {
  columnId: string;
  nameConfidence: SheetColumnReading["name_confidence"];
  /** 0-based index into the column's values the model was least sure of. */
  leastConfidentIndex: number | null;
}

export interface SheetMergeResult {
  state: DraftState;
  /** One entry per column that received a reading this call, new or existing. */
  diagnostics: SheetMergeDiagnostic[];
}

export interface MergeSheetTranscriptionArgs {
  state: DraftState;
  /** In paper order, left to right — exactly as the model returned them. */
  columns: readonly SheetColumnReading[];
  photoId: string;
  transcriptionId: string;
  /** ISO timestamp for the new reading's `at`. */
  now: string;
}

/**
 * A value the model returned that can't be stored as a draft cell is treated
 * as unread (`null`) rather than rejected outright — "never a guess" cuts
 * both ways: a value the pipeline itself can't trust is no better than one
 * the model couldn't read. `draftColumnSchema`'s own `cellValue` enforces the
 * same 0–{@link MAX_RUNNING_TOTAL} integer range; this keeps a merged draft
 * inside it by construction rather than relying on validation to catch it
 * after the fact.
 */
function sanitiseValue(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > MAX_RUNNING_TOTAL) return null;
  return value;
}

function sanitiseValues(values: readonly (number | null)[]): (number | null)[] {
  return values.slice(0, MAX_VALUES_PER_COLUMN).map(sanitiseValue);
}

/**
 * ⚠️ Security review: a handwritten column header is text on a photo the
 * model transcribes — the one place vision output reaches persisted state
 * with no further validation downstream (unlike cell values, nothing else
 * clamps `sheetName` before it's written to `draft.state_json`). An
 * over-length name would otherwise fail `draftStateSchema` wherever it's next
 * checked (autosave, save), silently blocking the draft with no UI that edits
 * `sheetName` to recover — so it's truncated here instead of trusted verbatim.
 */
function sanitiseName(name: string | null): string | null {
  if (name === null) return null;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

export function mergeSheetTranscriptionIntoDraft(
  args: MergeSheetTranscriptionArgs,
): SheetMergeResult {
  const { state, photoId, transcriptionId, now } = args;
  const existing = [...state.columns].sort((a, b) => a.order - b.order);
  // ⚠️ Security review: `columns.length` is the model's to say, not ours — cap
  // it to `MAX_COLUMNS` (`draftStateSchema`'s own limit) so a run-away or
  // adversarial response can't produce a draft the schema itself will
  // immediately reject on the next autosave, with no UI able to remove a
  // column past the founder's own eight.
  const columns = args.columns.slice(0, MAX_COLUMNS);
  const count = Math.max(existing.length, columns.length);

  const nextColumns: DraftColumn[] = [];
  const diagnostics: SheetMergeDiagnostic[] = [];

  for (let i = 0; i < count; i++) {
    const reading = columns[i];
    const current = existing[i];

    if (!reading) {
      // No vision column at this position: leave whatever is already there.
      if (current) nextColumns.push(current);
      continue;
    }

    const newReading: Reading = {
      id: `rd-${randomUUID()}`,
      source: "sheet",
      photoId,
      transcriptionId,
      values: sanitiseValues(reading.running_totals),
      at: now,
    };

    const merged: DraftColumn = current
      ? {
          ...current,
          // Never clobber a name the founder (or an earlier read) already
          // settled on; only fill it in when it was still unknown.
          sheetName: current.sheetName ?? sanitiseName(reading.name),
          // Oldest readings drop off first — the active one (always the most
          // recent) and recent history matter far more than a first attempt
          // from several retries ago.
          readings: [...current.readings, newReading].slice(-MAX_READINGS_PER_COLUMN),
          activeReadingId: newReading.id,
        }
      : {
          id: `col-${randomUUID()}`,
          order: i,
          playerId: null,
          newPlayerName: null,
          sheetName: sanitiseName(reading.name),
          activeReadingId: newReading.id,
          readings: [newReading],
          manualEdits: {},
          crop: null,
        };

    nextColumns.push(merged);
    diagnostics.push({
      columnId: merged.id,
      nameConfidence: reading.name_confidence,
      leastConfidentIndex: reading.least_confident_index,
    });
  }

  return { state: { ...state, columns: nextColumns }, diagnostics };
}
