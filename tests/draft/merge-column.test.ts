/**
 * `mergeColumnTranscriptionIntoDraft` — pure, no AWS, no database.
 */

import { describe, expect, it } from "vitest";

import { ColumnNotFoundError, mergeColumnTranscriptionIntoDraft } from "@/lib/draft/merge-column";
import {
  draftStateSchema,
  emptyDraftState,
  MAX_READINGS_PER_COLUMN,
  toGridColumns,
} from "@/lib/draft/state";
import { validateGrid } from "@/lib/scoring";
import type { ColumnTranscriptionOutput } from "@/lib/vision/column-schema";

function reading(overrides: Partial<ColumnTranscriptionOutput> = {}): ColumnTranscriptionOutput {
  return {
    player_name: "Player D",
    name_confidence: "high",
    running_totals: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111],
    least_confident_index: null,
    ...overrides,
  };
}

function stateWithOneColumn(overrides: Partial<Parameters<typeof emptyDraftState>[0]> = {}) {
  return emptyDraftState({
    photoId: "ph_sheet",
    playedOn: "2026-09-11",
    columnIds: ["col_1"],
    ...overrides,
  });
}

describe("mergeColumnTranscriptionIntoDraft", () => {
  it("pushes a new close-up reading onto the target column's stack, never overwriting", () => {
    const state = stateWithOneColumn();
    state.columns[0]!.playerId = "player_d";

    const { state: merged, diagnostics } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading(),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: "Player D",
      now: "2026-09-11T00:00:00.000Z",
    });

    const column = merged.columns[0]!;
    expect(column.id).toBe("col_1"); // identity survives
    expect(column.readings).toHaveLength(1);
    expect(column.readings[0]!.source).toBe("close-up");
    expect(column.readings[0]!.photoId).toBe("ph_closeup");
    expect(column.readings[0]!.transcriptionId).toBe("tr_1");
    expect(column.readings[0]!.values).toEqual(reading().running_totals);
    expect(column.activeReadingId).toBe(column.readings[0]!.id);

    expect(diagnostics.columnId).toBe("col_1");
    expect(diagnostics.nameConfidence).toBe("high");
    expect(diagnostics.readPlayerName).toBe("Player D");
    expect(diagnostics.possibleWrongColumn).toBe(false);
    expect(diagnostics.disagreesWithTypedCells).toEqual([]);
  });

  it("retains every previous reading when re-shot more than once, most recent active", () => {
    let state = stateWithOneColumn();

    const first = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ running_totals: Array(11).fill(1) }),
      photoId: "ph_1",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });
    state = first.state;

    const second = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ running_totals: Array(11).fill(2) }),
      photoId: "ph_2",
      transcriptionId: "tr_2",
      expectedPlayerName: null,
      now: "2026-09-11T00:01:00.000Z",
    });

    const column = second.state.columns[0]!;
    expect(column.readings).toHaveLength(2);
    expect(column.activeReadingId).toBe(column.readings[1]!.id);
    expect(column.readings[0]!.transcriptionId).toBe("tr_1"); // retained, not discarded
    expect(column.readings[1]!.values).toEqual(Array(11).fill(2));
  });

  it("leaves every other column completely untouched, by identity", () => {
    const state = emptyDraftState({
      photoId: "ph_1",
      playedOn: "2026-09-11",
      columnIds: ["col_1", "col_2"],
    });
    state.columns[1]!.manualEdits = { "0": 5 };

    const { state: merged } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading(),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[1]).toBe(state.columns[1]); // same reference, not just equal
  });

  it("fills in an unset sheetName from the close-up, but never clobbers one already known", () => {
    const state = stateWithOneColumn();
    state.columns[0]!.sheetName = "Player Z"; // already known from the full sheet

    const { state: merged } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ player_name: "Player D" }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(merged.columns[0]!.sheetName).toBe("Player Z");
  });

  it("⚠️ criterion 42: flags a possible wrong column when the read name disagrees with the expected one", () => {
    const state = stateWithOneColumn();

    const { diagnostics } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ player_name: "Player B" }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: "Player D",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(diagnostics.possibleWrongColumn).toBe(true);
    expect(diagnostics.readPlayerName).toBe("Player B");
  });

  it("does not flag a wrong column on a case/whitespace difference alone", () => {
    const state = stateWithOneColumn();

    const { diagnostics } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ player_name: "  player d  " }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: "Player D",
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(diagnostics.possibleWrongColumn).toBe(false);
  });

  it("⚠️ never flags a wrong column when either side has nothing to compare", () => {
    const state = stateWithOneColumn();

    const noExpectation = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ player_name: "Player B" }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });
    expect(noExpectation.diagnostics.possibleWrongColumn).toBe(false);

    const noRead = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ player_name: null }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: "Player D",
      now: "2026-09-11T00:00:00.000Z",
    });
    expect(noRead.diagnostics.possibleWrongColumn).toBe(false);
  });

  it("⚠️ criterion 43: calls out a cell that disagrees with what the founder typed, rather than silently overwriting it", () => {
    const state = stateWithOneColumn();
    state.columns[0]!.manualEdits = { "2": 64 }; // the founder typed 64 at index 2

    const { state: merged, diagnostics } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({
        running_totals: [29, 29, 84, 64, 64, 64, 64, 64, 67, 67, 111],
      }), // close-up reads 84 at index 2
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(diagnostics.disagreesWithTypedCells).toEqual([
      { index: 2, typedValue: 64, closeUpValue: 84 },
    ]);
    // ⚠️ Not silently overwritten: the founder's typed value still wins,
    // because manualEdits sits on top of every reading.
    const active = merged.columns[0]!.readings.find(
      (r) => r.id === merged.columns[0]!.activeReadingId,
    )!;
    expect(active.values[2]).toBe(84);
    expect(merged.columns[0]!.manualEdits["2"]).toBe(64);
  });

  it("reports no disagreement when the close-up agrees with what was typed", () => {
    const state = stateWithOneColumn();
    state.columns[0]!.manualEdits = { "2": 64 };

    const { diagnostics } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({
        running_totals: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111],
      }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });

    expect(diagnostics.disagreesWithTypedCells).toEqual([]);
  });

  it("⚠️ security review: sanitises out-of-range or non-integer values, same as the sheet path", () => {
    const state = stateWithOneColumn();

    const { state: merged } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({
        running_totals: [23, 1000, -1, 2.5, 40, 40, 40, 40, 40, 40, 40],
      }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: null,
      now: "2026-09-11T00:00:00.000Z",
    });

    const active = merged.columns[0]!.readings[0]!;
    expect(active.values).toEqual([23, null, null, null, 40, 40, 40, 40, 40, 40, 40]);
  });

  it("⚠️ security review: caps a column's reading stack at MAX_READINGS_PER_COLUMN", () => {
    let state = stateWithOneColumn();

    for (let i = 0; i < MAX_READINGS_PER_COLUMN + 5; i += 1) {
      const result = mergeColumnTranscriptionIntoDraft({
        state,
        columnId: "col_1",
        reading: reading({ running_totals: Array(11).fill(i) }),
        photoId: "ph_closeup",
        transcriptionId: `tr_${i}`,
        expectedPlayerName: null,
        now: "2026-09-11T00:00:00.000Z",
      });
      state = result.state;
    }

    const column = state.columns[0]!;
    expect(column.readings.length).toBeLessThanOrEqual(MAX_READINGS_PER_COLUMN);
    expect(column.readings.at(-1)!.transcriptionId).toBe(`tr_${MAX_READINGS_PER_COLUMN + 4}`);
    expect(draftStateSchema.safeParse(state).success).toBe(true);
  });

  it("⚠️ criterion 44, end to end: a close-up returning fewer than eleven values leaves the merged draft failing validateGrid, blocking save", () => {
    const state = stateWithOneColumn({ columnIds: ["col_1", "col_2"] });
    state.columns[0]!.playerId = "player_d";
    state.columns[1]!.playerId = "player_e";
    for (let i = 0; i < 11; i += 1) state.columns[1]!.manualEdits[String(i)] = i + 1;

    const { state: merged } = mergeColumnTranscriptionIntoDraft({
      state,
      columnId: "col_1",
      reading: reading({ running_totals: [1, 2, 3, 4, 5, 6, 7, 8] }),
      photoId: "ph_closeup",
      transcriptionId: "tr_1",
      expectedPlayerName: "Player D",
      now: "2026-09-11T00:00:00.000Z",
    });

    const validation = validateGrid(toGridColumns(merged));
    expect(validation.ok).toBe(false);
    const col1 = validation.columns["col_1"]!;
    expect(
      col1.issues.some((i) => i.code === "wrong_length" && i.message === "8 of 11 rows."),
    ).toBe(true);
  });

  it("throws ColumnNotFoundError for a column that isn't on the draft", () => {
    const state = stateWithOneColumn();

    expect(() =>
      mergeColumnTranscriptionIntoDraft({
        state,
        columnId: "col_does_not_exist",
        reading: reading(),
        photoId: "ph_closeup",
        transcriptionId: "tr_1",
        expectedPlayerName: null,
        now: "2026-09-11T00:00:00.000Z",
      }),
    ).toThrow(ColumnNotFoundError);
  });
});
