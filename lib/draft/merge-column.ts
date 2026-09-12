/**
 * Merging a targeted column re-read into a draft — Flow 2b
 * (`docs/ARCHITECTURE.md` § "Targeted column re-read").
 *
 * Same rung-3 pattern as `lib/draft/merge-sheet.ts` (a new reading is pushed
 * onto the column's stack, `activeReadingId` moved to it, `manualEdits` never
 * touched), scoped to **one** column instead of every column on the sheet —
 * every other column in the draft is returned completely untouched, by
 * identity (`===`), not just by value.
 *
 * Two diagnostics this file computes that the sheet path has no equivalent
 * for, both server-side because both need information the model was
 * deliberately never given:
 *
 * - **Wrong column.** The model reports whatever name it read, with no idea
 *   who the founder expected — that silence is the whole point (see
 *   `lib/vision/column-prompt.ts`). Comparing the read name against the
 *   column's assigned player, *after* the call returns, is the only cheap
 *   check the app has on whether the right column was even photographed
 *   (PRD criterion 42). Non-blocking: the founder may know better than the
 *   handwriting.
 * - **Typed-cell disagreement.** A close-up that contradicts a cell the
 *   founder already typed by hand must call that cell out rather than
 *   silently overwrite it (PRD criterion 43). `manualEdits` already sits on
 *   top of every reading in `effectiveValues`, so the new reading never
 *   actually clobbers a typed cell — this diagnostic exists purely to make
 *   the disagreement visible rather than let it sit silently underneath.
 */

import { randomUUID } from "node:crypto";

import { sanitiseLeastConfidentIndex, sanitiseName, sanitiseValues } from "./merge-sheet";
import { nameKey, MAX_READINGS_PER_COLUMN, type DraftColumn, type DraftState, type Reading } from "./state";
import type { ColumnTranscriptionOutput } from "@/lib/vision/column-schema";

/** Thrown when the target column no longer exists on the draft — e.g. it was
 *  removed by a structural edit that raced with an in-flight re-read. */
export class ColumnNotFoundError extends Error {
  override name = "ColumnNotFoundError";
}

export interface TypedCellDisagreement {
  /** 0-based index into the column's values. */
  index: number;
  /** What the founder typed at that index. */
  typedValue: number;
  /** What the close-up read at the same index. */
  closeUpValue: number;
}

export interface ColumnMergeDiagnostics {
  columnId: string;
  nameConfidence: ColumnTranscriptionOutput["name_confidence"];
  /** 0-based index into the new reading's values the model was least sure of. */
  leastConfidentIndex: number | null;
  /** The name the model read off this close-up, sanitised. `null` if it
   *  couldn't read one at all — never treated as a mismatch on its own. */
  readPlayerName: string | null;
  /**
   * True when the model read a name and it disagrees with the column's
   * assigned player. **Non-blocking** — never withheld or gatekept, the
   * founder can accept the reading anyway (PRD criterion 42). `false`
   * whenever there isn't enough information to compare (either side null).
   */
  possibleWrongColumn: boolean;
  /** Every index where a founder-typed cell disagrees with the new reading. */
  disagreesWithTypedCells: TypedCellDisagreement[];
}

export interface ColumnMergeResult {
  state: DraftState;
  diagnostics: ColumnMergeDiagnostics;
}

export interface MergeColumnTranscriptionArgs {
  state: DraftState;
  /** Which column this close-up was shot for. */
  columnId: string;
  reading: ColumnTranscriptionOutput;
  photoId: string;
  transcriptionId: string;
  /**
   * Whoever the app asked the founder to photograph — resolved by the caller
   * from the column's `playerId` (an existing player's display name),
   * `newPlayerName` (a pending new one), or `sheetName` (the original
   * full-sheet read, if the column isn't assigned to anyone yet). `null`
   * when none of those exist, in which case there is nothing to compare
   * against and `possibleWrongColumn` is always `false`.
   */
  expectedPlayerName: string | null;
  /** ISO timestamp for the new reading's `at`. */
  now: string;
}

/**
 * Every index the founder has an explicit typed value at, compared against
 * the new reading's value at the same index. Only real disagreements are
 * returned — an index the founder never typed, or one where the two values
 * agree, is silent (an agreeing close-up is not news).
 */
function findTypedCellDisagreements(
  column: DraftColumn,
  newValues: readonly (number | null)[],
): TypedCellDisagreement[] {
  const disagreements: TypedCellDisagreement[] = [];
  for (const [key, typedValue] of Object.entries(column.manualEdits)) {
    if (typedValue === null) continue;
    const index = Number(key);
    const closeUpValue = newValues[index];
    if (closeUpValue === null || closeUpValue === undefined) continue;
    if (closeUpValue !== typedValue) {
      disagreements.push({ index, typedValue, closeUpValue });
    }
  }
  return disagreements.sort((a, b) => a.index - b.index);
}

function namesDisagree(expected: string | null, read: string | null): boolean {
  if (!expected || !read) return false;
  return nameKey(expected) !== nameKey(read);
}

export function mergeColumnTranscriptionIntoDraft(
  args: MergeColumnTranscriptionArgs,
): ColumnMergeResult {
  const { state, columnId, reading, photoId, transcriptionId, expectedPlayerName, now } = args;

  const column = state.columns.find((c) => c.id === columnId);
  if (!column) {
    throw new ColumnNotFoundError(`No column ${columnId} on this draft.`);
  }

  const values = sanitiseValues(reading.running_totals);
  const readPlayerName = sanitiseName(reading.player_name);

  const newReading: Reading = {
    id: `rd-${randomUUID()}`,
    source: "close-up",
    photoId,
    transcriptionId,
    values,
    at: now,
  };

  const mergedColumn: DraftColumn = {
    ...column,
    // Never clobber a name already settled on; only fill it in if unknown —
    // same rule as the sheet path.
    sheetName: column.sheetName ?? readPlayerName,
    readings: [...column.readings, newReading].slice(-MAX_READINGS_PER_COLUMN),
    activeReadingId: newReading.id,
    // manualEdits is intentionally omitted from this spread override — it is
    // already present on `column` and carries forward untouched.
  };

  const nextColumns = state.columns.map((c) => (c.id === columnId ? mergedColumn : c));

  const diagnostics: ColumnMergeDiagnostics = {
    columnId,
    nameConfidence: reading.name_confidence,
    leastConfidentIndex: sanitiseLeastConfidentIndex(
      reading.least_confident_index,
      newReading.values.length,
    ),
    readPlayerName,
    possibleWrongColumn: namesDisagree(expectedPlayerName, readPlayerName),
    // ⚠️ Compared against the column's typed cells *before* this merge —
    // `column`, not `mergedColumn` — matching what the founder actually typed
    // against what just came back, not some hybrid of the two.
    disagreesWithTypedCells: findTypedCellDisagreements(column, values),
  };

  return { state: { ...state, columns: nextColumns }, diagnostics };
}
