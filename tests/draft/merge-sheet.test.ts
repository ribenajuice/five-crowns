/**
 * `mergeSheetTranscriptionIntoDraft` — pure, no AWS, no database.
 */

import { describe, expect, it } from "vitest";

import { mergeSheetTranscriptionIntoDraft } from "@/lib/draft/merge-sheet";
import {
  draftStateSchema,
  emptyDraftState,
  MAX_COLUMNS,
  MAX_NAME_LENGTH,
  MAX_READINGS_PER_COLUMN,
} from "@/lib/draft/state";
import type { SheetColumnReading } from "@/lib/vision/sheet-schema";

function reading(overrides: Partial<SheetColumnReading> = {}): SheetColumnReading {
  return {
    name: "Player C",
    name_confidence: "high",
    running_totals: [23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 78],
    least_confident_index: null,
    ...overrides,
  };
}

describe("mergeSheetTranscriptionIntoDraft", () => {
  it("builds brand new columns from an empty draft, in the model's order", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });
    const columns = [
      reading({ name: "Player A" }),
      reading({ name: "Player B", running_totals: [0, 3, 3, 54] }),
    ];

    const { state: merged, diagnostics } = mergeSheetTranscriptionIntoDraft({
      state,
      columns,
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns).toHaveLength(2);
    expect(merged.columns[0]!.sheetName).toBe("Player A");
    expect(merged.columns[0]!.order).toBe(0);
    expect(merged.columns[1]!.sheetName).toBe("Player B");
    expect(merged.columns[1]!.order).toBe(1);

    const first = merged.columns[0]!;
    expect(first.readings).toHaveLength(1);
    expect(first.readings[0]!.source).toBe("sheet");
    expect(first.readings[0]!.photoId).toBe("ph_1");
    expect(first.readings[0]!.transcriptionId).toBe("tr_1");
    expect(first.readings[0]!.values).toEqual(columns[0]!.running_totals);
    expect(first.activeReadingId).toBe(first.readings[0]!.id);
    expect(first.playerId).toBeNull();
    expect(first.newPlayerName).toBeNull();

    expect(diagnostics).toEqual([
      { columnId: merged.columns[0]!.id, nameConfidence: "high", leastConfidentIndex: null },
      { columnId: merged.columns[1]!.id, nameConfidence: "high", leastConfidentIndex: null },
    ]);
  });

  it("pushes a new reading onto an existing column rather than overwriting it, and preserves manualEdits", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: ["col_1"] });
    state.columns[0]!.sheetName = "Player C";
    state.columns[0]!.manualEdits = { "3": 999 };

    const first = mergeSheetTranscriptionIntoDraft({
      state,
      columns: [reading()],
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(first.state.columns).toHaveLength(1);
    expect(first.state.columns[0]!.id).toBe("col_1"); // identity survives
    expect(first.state.columns[0]!.readings).toHaveLength(1);

    // A retry — same column, a second reading.
    const second = mergeSheetTranscriptionIntoDraft({
      state: first.state,
      columns: [reading({ running_totals: [23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 88] })],
      photoId: "ph_1",
      transcriptionId: "tr_2",
      now: "2026-09-11T00:01:00.000Z",
    });

    const column = second.state.columns[0]!;
    expect(column.id).toBe("col_1");
    expect(column.readings).toHaveLength(2);
    expect(column.activeReadingId).toBe(column.readings[1]!.id);
    // The first reading is retained, not discarded.
    expect(column.readings[0]!.transcriptionId).toBe("tr_1");
    // The founder's manual edit survives the retry untouched.
    expect(column.manualEdits).toEqual({ "3": 999 });
    // The name isn't clobbered on a second read once it's already known.
    expect(column.sheetName).toBe("Player C");
  });

  it("leaves an existing column with no matching vision column completely untouched", () => {
    const state = emptyDraftState({
      photoId: "ph_1",
      playedOn: "2026-09-11",
      columnIds: ["col_1", "col_2"],
    });
    state.columns[1]!.sheetName = "Player D";
    state.columns[1]!.manualEdits = { "0": 5 };

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns: [reading()], // only one vision column, draft had two
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns).toHaveLength(2);
    expect(merged.columns[1]).toEqual(state.columns[1]);
  });

  it("sanitises an out-of-range or non-integer value to null rather than storing it", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });
    const columns = [
      reading({ running_totals: [23, 1000, -1, 2.5, 40, 40, 40, 40, 40, 40, 40] }),
    ];

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns,
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[0]!.readings[0]!.values).toEqual([
      23, null, null, null, 40, 40, 40, 40, 40, 40, 40,
    ]);
  });

  it("caps an overlong reading at MAX_VALUES_PER_COLUMN", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });
    const tooMany = Array.from({ length: 20 }, (_, i) => i);

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns: [reading({ running_totals: tooMany })],
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[0]!.readings[0]!.values.length).toBeLessThanOrEqual(12);
  });

  it("⚠️ security review: caps the column count at MAX_COLUMNS, whatever the model returns", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });
    const tooManyColumns = Array.from({ length: MAX_COLUMNS + 4 }, (_, i) =>
      reading({ name: `Player ${i}` }),
    );

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns: tooManyColumns,
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns).toHaveLength(MAX_COLUMNS);
    expect(draftStateSchema.safeParse(merged).success).toBe(true);
  });

  it("⚠️ security review: truncates an over-length handwritten name rather than storing it verbatim", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });
    const longName = "P".repeat(MAX_NAME_LENGTH * 3);

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns: [reading({ name: longName })],
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[0]!.sheetName!.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(draftStateSchema.safeParse(merged).success).toBe(true);
  });

  it("⚠️ security review: a blank or whitespace-only name reads as unknown, not an empty string", () => {
    const state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: [] });

    const { state: merged } = mergeSheetTranscriptionIntoDraft({
      state,
      columns: [reading({ name: "   " })],
      photoId: "ph_1",
      transcriptionId: "tr_1",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[0]!.sheetName).toBeNull();
  });

  it("⚠️ security review: caps a column's reading stack at MAX_READINGS_PER_COLUMN, keeping the most recent", () => {
    let state = emptyDraftState({ photoId: "ph_1", playedOn: "2026-09-11", columnIds: ["col_1"] });

    for (let i = 0; i < MAX_READINGS_PER_COLUMN + 5; i++) {
      const result = mergeSheetTranscriptionIntoDraft({
        state,
        columns: [reading({ running_totals: Array(11).fill(i) })],
        photoId: "ph_1",
        transcriptionId: `tr_${i}`,
        now: "2026-09-11T00:00:00.000Z",
      });
      state = result.state;
    }

    const column = state.columns[0]!;
    expect(column.readings.length).toBeLessThanOrEqual(MAX_READINGS_PER_COLUMN);
    // The most recent reading survives and stays active.
    expect(column.readings.at(-1)!.transcriptionId).toBe(
      `tr_${MAX_READINGS_PER_COLUMN + 4}`,
    );
    expect(column.activeReadingId).toBe(column.readings.at(-1)!.id);
    expect(draftStateSchema.safeParse(state).success).toBe(true);
  });
});
