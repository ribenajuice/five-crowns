/**
 * Pure edits over a `DraftState` — the review screen's mutations, factored
 * out so they're testable without React. Every function returns a new
 * `DraftState`; nothing here talks to the network.
 *
 * ⚠️ **Scope note, updated for Stage 4.** Stage 2 shipped add/remove-column
 * only; targeted re-photograph (criteria 36–45) is server-side
 * (`lib/draft/merge-column.ts`) and never touches this file. **Stage 4 is the
 * stage that needed the rest of the ladder**, and adds it here:
 * `reorderColumns` (criterion 32) and `insertValueAt` / `deleteValueAt`
 * (criterion 33). Nothing below is a spreadsheet primitive — there is still
 * no arbitrary row count, no formulas, no multi-cell selection (criterion
 * 34); these are exactly the four structural repairs the PRD names and no
 * more.
 *
 * Stage 4 also adds `setActiveReading` — not a structural repair, but the
 * same "pure edit, no network call of its own" shape, for `ReadingCompare`'s
 * keep/reject buttons (criteria 39–41).
 */

import {
  effectiveValues,
  MAX_COLUMNS,
  MAX_READINGS_PER_COLUMN,
  MAX_VALUES_PER_COLUMN,
  nameKey,
  type Crop,
  type DraftColumn,
  type DraftState,
} from "@/lib/draft/state";
import type { CellValue } from "@/lib/scoring";
import { newId } from "./ids";

function withColumns(state: DraftState, columns: DraftColumn[]): DraftState {
  return { ...state, columns };
}

function renumber(columns: DraftColumn[]): DraftColumn[] {
  return [...columns]
    .sort((a, b) => a.order - b.order)
    .map((column, order) => ({ ...column, order }));
}

function mapColumn(
  state: DraftState,
  columnId: string,
  fn: (column: DraftColumn) => DraftColumn,
): DraftState {
  return withColumns(
    state,
    state.columns.map((column) => (column.id === columnId ? fn(column) : column)),
  );
}

export function setPlayedOn(state: DraftState, playedOn: string): DraftState {
  return { ...state, playedOn };
}

export function setLocation(state: DraftState, locationId: string): DraftState {
  return { ...state, locationId, newLocationName: null };
}

export function setNewLocationName(state: DraftState, name: string): DraftState {
  return { ...state, locationId: null, newLocationName: name };
}

export function clearLocation(state: DraftState): DraftState {
  return { ...state, locationId: null, newLocationName: null };
}

export function setColumnPlayer(
  state: DraftState,
  columnId: string,
  playerId: string,
): DraftState {
  return mapColumn(state, columnId, (column) => ({
    ...column,
    playerId,
    newPlayerName: null,
  }));
}

export function setColumnNewPlayerName(
  state: DraftState,
  columnId: string,
  name: string,
): DraftState {
  return mapColumn(state, columnId, (column) => ({
    ...column,
    playerId: null,
    newPlayerName: name,
  }));
}

export function setColumnCrop(state: DraftState, columnId: string, crop: Crop): DraftState {
  return mapColumn(state, columnId, (column) => ({ ...column, crop }));
}

/** Rung 1 — edit a single cell. Writes into `manualEdits`, the reading untouched. */
export function setCellValue(
  state: DraftState,
  columnId: string,
  index: number,
  value: CellValue,
): DraftState {
  return mapColumn(state, columnId, (column) => ({
    ...column,
    manualEdits: { ...column.manualEdits, [String(index)]: value },
  }));
}

/** Whether another column can be added without exceeding the draft schema's cap. */
export function canAddColumn(state: DraftState): boolean {
  return state.columns.length < MAX_COLUMNS;
}

/**
 * Add a missed player column: "0 of 11" until it's filled in. A no-op once
 * `MAX_COLUMNS` is reached — callers should disable their control using
 * `canAddColumn`, but this stays safe even if one doesn't.
 */
export function addColumn(state: DraftState): DraftState {
  if (!canAddColumn(state)) return state;
  const column: DraftColumn = {
    id: newId("col"),
    order: state.columns.length,
    playerId: null,
    newPlayerName: null,
    sheetName: null,
    activeReadingId: null,
    readings: [],
    manualEdits: {},
    crop: null,
  };
  return withColumns(state, renumber([...state.columns, column]));
}

/**
 * Remove a spurious column. Every remaining column keeps its own values,
 * edits and crop — only the order closes the gap.
 */
export function removeColumn(state: DraftState, columnId: string): DraftState {
  return withColumns(
    state,
    renumber(state.columns.filter((column) => column.id !== columnId)),
  );
}

/**
 * Reorder columns to match the photo (criterion 32). `orderedColumnIds` is
 * every column id currently on the draft, in the new left-to-right order —
 * column identity is the client-generated `id`, never array position, so a
 * column's readings, manual edits and crop simply travel with it; there is
 * nothing else to move. An id this draft doesn't have is silently ignored
 * (defensive against a stale reorder racing a removal); any of the draft's
 * own columns missing from the list keep their relative order and are
 * appended after the ones that were named, so a partial or short list can
 * never drop a column off the draft.
 */
export function reorderColumns(
  state: DraftState,
  orderedColumnIds: readonly string[],
): DraftState {
  const byId = new Map(state.columns.map((column) => [column.id, column]));
  const seen = new Set<string>();
  const ordered: DraftColumn[] = [];

  for (const id of orderedColumnIds) {
    const column = byId.get(id);
    if (column && !seen.has(id)) {
      ordered.push(column);
      seen.add(id);
    }
  }
  for (const column of [...state.columns].sort((a, b) => a.order - b.order)) {
    if (!seen.has(column.id)) ordered.push(column);
  }

  return withColumns(
    state,
    ordered.map((column, order) => ({ ...column, order })),
  );
}

/** Whether a column can take one more value without exceeding the draft
 *  schema's own cap (room was deliberately left for this — see
 *  `MAX_VALUES_PER_COLUMN`'s docstring in `lib/draft/state.ts`). */
export function canInsertValue(column: DraftColumn): boolean {
  return effectiveValues(column).length < MAX_VALUES_PER_COLUMN;
}

/** Whether a column has anything left to delete. */
export function canDeleteValue(column: DraftColumn): boolean {
  return effectiveValues(column).length > 0;
}

/**
 * Shared machinery for `insertValueAt` and `deleteValueAt`.
 *
 * ⚠️ **Why this pushes a new reading rather than writing into `manualEdits`.**
 * `manualEdits` is a sparse *overlay*: `effectiveValues` builds its base array
 * from the active reading (or eleven empty cells) and only ever extends that
 * base to fit a higher edit index — it never truncates it. That makes it the
 * right tool for rung 1 (a cell is wrong, the shape is right) but the wrong
 * one here: a plain overlay cannot make the effective array *shorter*, which
 * `deleteValueAt` needs to do, and papering over that with a same-length
 * overlay for insert would leave delete unable to reach it. Instead this
 * computes the correct post-edit array once (`effectiveValues`, spliced) and
 * pushes it as a **new reading** onto the column's stack, exactly the rung-3
 * pattern `lib/draft/merge-sheet.ts` already established for a fresh read —
 * `manualEdits` is cleared because the new reading's `values` now *is* the
 * current shape, and every previous edit is already folded into it.
 * `source`/`photoId` are inherited from whatever reading was active (so a
 * repaired column still says where its numbers came from); a column typed
 * from scratch, with no reading at all, is tagged `"sheet"` against the
 * draft's own sheet photo — the photo the founder was looking at while typing
 * it, and the only photo a draft is ever guaranteed to have.
 */
function spliceColumnValues(
  state: DraftState,
  column: DraftColumn,
  next: readonly CellValue[],
  now: string,
): DraftColumn {
  const active = column.readings.find((r) => r.id === column.activeReadingId);
  const newReading = {
    id: newId("rd"),
    source: active?.source ?? ("sheet" as const),
    photoId: active?.photoId ?? state.photoId,
    transcriptionId: null,
    values: [...next],
    at: now,
  };
  return {
    ...column,
    readings: [...column.readings, newReading].slice(-MAX_READINGS_PER_COLUMN),
    activeReadingId: newReading.id,
    manualEdits: {},
  };
}

/**
 * Insert a blank value at `index`, shifting everything from `index` on down
 * one place (criterion 33). Repairs a missed row in one action rather than
 * retyping every value below it. A no-op once the column already holds
 * `MAX_VALUES_PER_COLUMN` values — callers should disable their control using
 * {@link canInsertValue}, but this stays safe even if one doesn't.
 */
export function insertValueAt(
  state: DraftState,
  columnId: string,
  index: number,
  now: string = new Date().toISOString(),
): DraftState {
  return mapColumn(state, columnId, (column) => {
    const values = effectiveValues(column);
    if (values.length >= MAX_VALUES_PER_COLUMN) return column;
    const at = Math.max(0, Math.min(index, values.length));
    const next = [...values.slice(0, at), null, ...values.slice(at)];
    return spliceColumnValues(state, column, next, now);
  });
}

/**
 * Delete the value at `index`, shifting everything below it up one place
 * (criterion 33). Repairs a doubled row in one action rather than retyping
 * every value below it. A no-op on an already-empty column.
 */
export function deleteValueAt(
  state: DraftState,
  columnId: string,
  index: number,
  now: string = new Date().toISOString(),
): DraftState {
  return mapColumn(state, columnId, (column) => {
    const values = effectiveValues(column);
    if (values.length === 0) return column;
    const at = Math.max(0, Math.min(index, values.length - 1));
    const next = [...values.slice(0, at), ...values.slice(at + 1)];
    return spliceColumnValues(state, column, next, now);
  });
}

/**
 * Switch which of a column's stored readings is active — the client-side half
 * of `ReadingCompare`'s "Keep what's saved" / "Make {reading} active" buttons
 * (criteria 40, 41). No network call of its own: like every other function in
 * this file, the result is just a new `DraftState` for the caller to hand to
 * the review screen's existing autosave, so rejecting a close-up is one tap
 * and no re-upload. `manualEdits` are left untouched — they sit on top of
 * whichever reading is active in `effectiveValues`, so switching readings
 * never discards a hand-typed correction. A `readingId` the column doesn't
 * actually have is a no-op, defensive against a stale button racing a
 * structural edit that dropped the column's history.
 */
export function setActiveReading(
  state: DraftState,
  columnId: string,
  readingId: string,
): DraftState {
  return mapColumn(state, columnId, (column) => {
    if (!column.readings.some((r) => r.id === readingId)) return column;
    return { ...column, activeReadingId: readingId };
  });
}

/**
 * Whether a pending name (player or venue) matches something already picked
 * for *another* column in this draft, so the UI can fold it into that entry
 * rather than creating a duplicate (criteria 60, 62, 63) ahead of the
 * save-time resolution. `excludeColumnId` is the column currently being
 * edited — its own in-progress value must never count as a duplicate of
 * itself.
 */
export function isDuplicatePlayerName(
  state: DraftState,
  name: string,
  excludeColumnId?: string,
): boolean {
  const key = nameKey(name);
  return state.columns.some(
    (column) =>
      column.id !== excludeColumnId &&
      column.newPlayerName &&
      nameKey(column.newPlayerName) === key,
  );
}
