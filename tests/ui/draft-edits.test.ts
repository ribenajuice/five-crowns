import { describe, expect, it } from "vitest";

import {
  effectiveValues,
  emptyDraftState,
  MAX_COLUMNS,
  MAX_VALUES_PER_COLUMN,
  toGridColumns,
} from "@/lib/draft/state";
import { validateGrid } from "@/lib/scoring";
import {
  addColumn,
  canAddColumn,
  canDeleteValue,
  canInsertValue,
  clearLocation,
  deleteValueAt,
  insertValueAt,
  isDuplicatePlayerName,
  removeColumn,
  reorderColumns,
  setActiveReading,
  setCellValue,
  setColumnCrop,
  setColumnNewPlayerName,
  setColumnPlayer,
  setLocation,
  setNewLocationName,
  setPlayedOn,
} from "@/lib/ui/draft-edits";

function freshState() {
  return emptyDraftState({
    photoId: "photo-1",
    playedOn: "2026-09-11",
    columnIds: ["a", "b"],
  });
}

describe("setCellValue", () => {
  it("writes into that column's manualEdits, leaving the other column untouched", () => {
    const state = setCellValue(freshState(), "a", 3, 42);
    expect(effectiveValues(state.columns[0]!)[3]).toBe(42);
    expect(effectiveValues(state.columns[1]!).every((v) => v === null)).toBe(true);
  });

  it("clearing a cell back to null is a normal edit, not a delete", () => {
    let state = setCellValue(freshState(), "a", 0, 10);
    state = setCellValue(state, "a", 0, null);
    expect(effectiveValues(state.columns[0]!)[0]).toBeNull();
  });
});

describe("addColumn / removeColumn", () => {
  it("adds a column at the end with sequential order and reports 0 of 11", () => {
    const state = addColumn(freshState());
    expect(state.columns).toHaveLength(3);
    const added = state.columns[2]!;
    expect(added.order).toBe(2);
    expect(added.playerId).toBeNull();
    expect(effectiveValues(added).every((v) => v === null)).toBe(true);
  });

  it("removing a column closes the order gap and leaves the rest untouched", () => {
    let state = addColumn(freshState()); // a(0) b(1) c(2)
    state = setCellValue(state, "b", 0, 99);
    state = removeColumn(state, "a");

    expect(state.columns.map((c) => c.id)).toEqual(["b", state.columns[1]!.id]);
    expect(state.columns.map((c) => c.order)).toEqual([0, 1]);
    expect(effectiveValues(state.columns[0]!)[0]).toBe(99);
  });

  it("⚠️ never grows past MAX_COLUMNS, matching the draft schema's own cap", () => {
    let state = freshState(); // starts at 2 columns
    for (let i = state.columns.length; i < MAX_COLUMNS; i += 1) {
      expect(canAddColumn(state)).toBe(true);
      state = addColumn(state);
    }
    expect(state.columns).toHaveLength(MAX_COLUMNS);
    expect(canAddColumn(state)).toBe(false);

    // A stray call past the cap (e.g. a race with a UI that should have
    // disabled its own control) is a no-op, not an oversized draft.
    state = addColumn(state);
    expect(state.columns).toHaveLength(MAX_COLUMNS);
  });
});

describe("reorderColumns", () => {
  it("⚠️ criterion 32: carries a column's readings, manual edits and crop with it when reordered", () => {
    let state = freshState(); // a(0) b(1)
    state = setCellValue(state, "a", 0, 10);
    state = setColumnCrop(state, "b", { x: 0.1, y: 0, width: 0.2, height: 1 });

    state = reorderColumns(state, ["b", "a"]);

    expect(state.columns.map((c) => c.id)).toEqual(["b", "a"]);
    expect(state.columns.map((c) => c.order)).toEqual([0, 1]);
    const a = state.columns.find((c) => c.id === "a")!;
    const b = state.columns.find((c) => c.id === "b")!;
    expect(effectiveValues(a)[0]).toBe(10);
    expect(b.crop).toEqual({ x: 0.1, y: 0, width: 0.2, height: 1 });
  });

  it("appends any column missing from the list, keeping its relative order", () => {
    let state = freshState();
    state = addColumn(state); // a(0) b(1) c(2)
    const cId = state.columns[2]!.id;

    state = reorderColumns(state, ["b"]);

    expect(state.columns.map((c) => c.id)).toEqual(["b", "a", cId]);
  });

  it("ignores an id that isn't on this draft", () => {
    let state = freshState();
    state = reorderColumns(state, ["b", "not-a-real-id", "a"]);
    expect(state.columns.map((c) => c.id)).toEqual(["b", "a"]);
  });
});

describe("insertValueAt / deleteValueAt", () => {
  it("⚠️ criterion 33: inserting shifts the rest down, leaving twelve values", () => {
    let state = freshState();
    for (let i = 0; i < 11; i += 1) state = setCellValue(state, "a", i, i + 1);

    state = insertValueAt(state, "a", 3);

    const values = effectiveValues(state.columns[0]!);
    expect(values).toHaveLength(12);
    expect(values).toEqual([1, 2, 3, null, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("⚠️ criterion 33: deleting shifts the rest up, leaving ten values", () => {
    let state = freshState();
    for (let i = 0; i < 11; i += 1) state = setCellValue(state, "a", i, i + 1);

    state = deleteValueAt(state, "a", 3);

    const values = effectiveValues(state.columns[0]!);
    expect(values).toHaveLength(10);
    expect(values).toEqual([1, 2, 3, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("touches only the target column", () => {
    let state = freshState();
    state = setCellValue(state, "b", 0, 99);

    state = insertValueAt(state, "a", 0);

    expect(effectiveValues(state.columns[1]!)[0]).toBe(99);
    expect(effectiveValues(state.columns[1]!)).toHaveLength(11);
  });

  it("never grows past MAX_VALUES_PER_COLUMN", () => {
    let state = freshState();
    for (let i = 0; i < MAX_VALUES_PER_COLUMN; i += 1) {
      if (canInsertValue(state.columns[0]!)) state = insertValueAt(state, "a", 0);
    }
    expect(canInsertValue(state.columns[0]!)).toBe(false);
    const before = effectiveValues(state.columns[0]!).length;
    state = insertValueAt(state, "a", 0); // a stray call past the cap is a no-op
    expect(effectiveValues(state.columns[0]!)).toHaveLength(before);
  });

  it("never shrinks past zero", () => {
    let state = freshState();
    for (let i = 0; i < 20 && canDeleteValue(state.columns[0]!); i += 1) {
      state = deleteValueAt(state, "a", 0);
    }
    expect(effectiveValues(state.columns[0]!)).toHaveLength(0);
    state = deleteValueAt(state, "a", 0); // a stray call on an empty column is a no-op
    expect(effectiveValues(state.columns[0]!)).toHaveLength(0);
  });

  it("preserves the column's reading provenance (source, photoId) across a structural repair", () => {
    const state = emptyDraftState({ photoId: "photo-1", playedOn: "2026-09-11", columnIds: ["a"] });
    state.columns[0]!.readings = [
      {
        id: "r1",
        source: "close-up",
        photoId: "photo-closeup",
        transcriptionId: "t1",
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        at: "2026-09-11T00:00:00Z",
      },
    ];
    state.columns[0]!.activeReadingId = "r1";

    const next = insertValueAt(state, "a", 0);
    const active = next.columns[0]!.readings.find(
      (r) => r.id === next.columns[0]!.activeReadingId,
    )!;
    expect(active.source).toBe("close-up");
    expect(active.photoId).toBe("photo-closeup");
  });

  it("tags a structural repair on a column typed from scratch against the draft's own sheet photo", () => {
    const state = freshState(); // photoId: "photo-1", no readings yet
    const next = insertValueAt(state, "a", 0);
    const active = next.columns[0]!.readings.find(
      (r) => r.id === next.columns[0]!.activeReadingId,
    )!;
    expect(active.source).toBe("sheet");
    expect(active.photoId).toBe("photo-1");
  });

  it("⚠️ criterion 33/26: an insert actually blocks save via validateGrid, not just effectiveValues' own length", () => {
    let state = emptyDraftState({ photoId: "p1", playedOn: "2026-09-11", columnIds: ["a", "b"] });
    for (let i = 0; i < 11; i += 1) {
      state = setCellValue(state, "a", i, i + 1);
      state = setCellValue(state, "b", i, i + 1);
    }
    state = setColumnPlayer(state, "a", "player_a");
    state = setColumnPlayer(state, "b", "player_b");
    state = insertValueAt(state, "a", 3);

    const validation = validateGrid(toGridColumns(state));
    expect(validation.ok).toBe(false);
    const colA = validation.columns[state.columns.find((c) => c.id === "a")!.id]!;
    expect(colA.issues.some((i) => i.code === "wrong_length" && i.message === "12 of 11 rows.")).toBe(
      true,
    );
  });

  it("⚠️ criterion 33/26: a delete actually blocks save via validateGrid, reporting '10 of 11 rows.'", () => {
    let state = emptyDraftState({ photoId: "p1", playedOn: "2026-09-11", columnIds: ["a", "b"] });
    for (let i = 0; i < 11; i += 1) {
      state = setCellValue(state, "a", i, i + 1);
      state = setCellValue(state, "b", i, i + 1);
    }
    state = setColumnPlayer(state, "a", "player_a");
    state = setColumnPlayer(state, "b", "player_b");
    state = deleteValueAt(state, "a", 3);

    const validation = validateGrid(toGridColumns(state));
    expect(validation.ok).toBe(false);
    const colA = validation.columns[state.columns.find((c) => c.id === "a")!.id]!;
    expect(colA.issues.some((i) => i.code === "wrong_length" && i.message === "10 of 11 rows.")).toBe(
      true,
    );
  });
});

describe("setActiveReading (Stage 4: ReadingCompare's keep/reject buttons)", () => {
  function stateWithTwoReadings() {
    const state = emptyDraftState({ photoId: "photo-1", playedOn: "2026-09-11", columnIds: ["a"] });
    state.columns[0]!.readings = [
      {
        id: "r1",
        source: "sheet",
        photoId: "photo-1",
        transcriptionId: null,
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        at: "2026-09-11T00:00:00Z",
      },
      {
        id: "r2",
        source: "close-up",
        photoId: "photo-closeup",
        transcriptionId: "t1",
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 99],
        at: "2026-09-12T00:00:00Z",
      },
    ];
    state.columns[0]!.activeReadingId = "r2";
    return state;
  }

  it("⚠️ criteria 40, 41: switches which reading is active — one call, no network of its own", () => {
    const state = setActiveReading(stateWithTwoReadings(), "a", "r1");
    expect(state.columns[0]!.activeReadingId).toBe("r1");
    expect(effectiveValues(state.columns[0]!).at(-1)).toBe(11);
  });

  it("carries manualEdits forward untouched across the switch", () => {
    let state = stateWithTwoReadings();
    state = setCellValue(state, "a", 0, 42);
    state = setActiveReading(state, "a", "r1");
    expect(effectiveValues(state.columns[0]!)[0]).toBe(42);
  });

  it("a reading id the column doesn't have is a no-op", () => {
    const before = stateWithTwoReadings();
    const after = setActiveReading(before, "a", "not-a-real-reading");
    expect(after.columns[0]!.activeReadingId).toBe("r2");
  });

  it("touches only the named column", () => {
    let state = stateWithTwoReadings();
    state = addColumn(state);
    state = setCellValue(state, state.columns[1]!.id, 0, 7);
    state = setActiveReading(state, "a", "r1");
    expect(effectiveValues(state.columns[1]!)[0]).toBe(7);
  });
});

describe("setColumnPlayer / setColumnNewPlayerName", () => {
  it("an existing player and a pending name are mutually exclusive", () => {
    let state = setColumnNewPlayerName(freshState(), "a", "Sam");
    expect(state.columns[0]!.newPlayerName).toBe("Sam");

    state = setColumnPlayer(state, "a", "player_1");
    expect(state.columns[0]!.playerId).toBe("player_1");
    expect(state.columns[0]!.newPlayerName).toBeNull();
  });

  it("⚠️ criterion 31: reassigning a column's player never touches its handwritten sheetName", () => {
    let state = freshState();
    state.columns[0]!.sheetName = "Playr D"; // the original, possibly-misspelled handwritten read
    state = setColumnPlayer(state, "a", "player_real_d");
    expect(state.columns[0]!.sheetName).toBe("Playr D");

    state = setColumnNewPlayerName(state, "a", "Someone Else");
    expect(state.columns[0]!.sheetName).toBe("Playr D");
  });
});

describe("setColumnCrop", () => {
  it("sets the crop for one column only", () => {
    const crop = { x: 0.1, y: 0, width: 0.2, height: 1 };
    const state = setColumnCrop(freshState(), "b", crop);
    expect(state.columns[1]!.crop).toEqual(crop);
    expect(state.columns[0]!.crop).toBeNull();
  });
});

describe("location edits", () => {
  it("setLocation and setNewLocationName are mutually exclusive", () => {
    let state = setNewLocationName(freshState(), "Player C's place");
    expect(state.newLocationName).toBe("Player C's place");

    state = setLocation(state, "loc_1");
    expect(state.locationId).toBe("loc_1");
    expect(state.newLocationName).toBeNull();
  });

  it("clearLocation is the explicit 'No location' choice", () => {
    let state = setLocation(freshState(), "loc_1");
    state = clearLocation(state);
    expect(state.locationId).toBeNull();
    expect(state.newLocationName).toBeNull();
  });
});

describe("setPlayedOn", () => {
  it("replaces the date only", () => {
    const state = setPlayedOn(freshState(), "2026-01-02");
    expect(state.playedOn).toBe("2026-01-02");
  });
});

describe("isDuplicatePlayerName", () => {
  it("catches a case/space-insensitive match against a pending name already in this draft", () => {
    const state = setColumnNewPlayerName(freshState(), "a", "Player C's place");
    expect(isDuplicatePlayerName(state, "  player c's place ")).toBe(true);
    expect(isDuplicatePlayerName(state, "Someone else")).toBe(false);
  });

  it("⚠️ never reports a column's own in-progress name as a duplicate of itself", () => {
    const state = setColumnNewPlayerName(freshState(), "a", "Alex");
    expect(isDuplicatePlayerName(state, "Alex", "a")).toBe(false);
    // Still catches a genuine clash against a *different* column.
    expect(isDuplicatePlayerName(state, "Alex", "b")).toBe(true);
    expect(isDuplicatePlayerName(state, "Alex")).toBe(true);
  });
});
