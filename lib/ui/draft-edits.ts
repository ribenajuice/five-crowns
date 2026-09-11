/**
 * Pure edits over a `DraftState` — the review screen's mutations, factored
 * out so they're testable without React. Every function returns a new
 * `DraftState`; nothing here talks to the network.
 *
 * ⚠️ **Scope note.** The PRD's structural-repair rung (criteria 29–35 — insert
 * or delete a row shifting the rest, reordering columns) and targeted
 * re-photograph (criteria 36–45) are **not** in this Stage 2 build's
 * acceptance range and are deferred to the stage that actually needs them —
 * they matter most once a transcription exists to repair, and reordering's
 * "carries the close-up photos with it" has nothing to carry yet. What Stage
 * 2 *does* need, so manual entry can cover a 4- or 5-player sheet without a
 * configuration step, is here: add and remove a player column.
 */

import { nameKey, type Crop, type DraftColumn, type DraftState } from "@/lib/draft/state";
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

/** Add a missed player column: "0 of 11" until it's filled in. */
export function addColumn(state: DraftState): DraftState {
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
 * Whether a pending name (player or venue) matches something already picked
 * for this draft, so the UI can fold it into that entry rather than creating
 * a duplicate (criteria 60, 62, 63) ahead of the save-time resolution.
 */
export function isDuplicatePlayerName(state: DraftState, name: string): boolean {
  const key = nameKey(name);
  return state.columns.some(
    (column) => column.newPlayerName && nameKey(column.newPlayerName) === key,
  );
}
