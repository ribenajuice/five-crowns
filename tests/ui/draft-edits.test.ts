import { describe, expect, it } from "vitest";

import { effectiveValues, emptyDraftState } from "@/lib/draft/state";
import {
  addColumn,
  clearLocation,
  isDuplicatePlayerName,
  removeColumn,
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
});

describe("setColumnPlayer / setColumnNewPlayerName", () => {
  it("an existing player and a pending name are mutually exclusive", () => {
    let state = setColumnNewPlayerName(freshState(), "a", "Sam");
    expect(state.columns[0]!.newPlayerName).toBe("Sam");

    state = setColumnPlayer(state, "a", "player_1");
    expect(state.columns[0]!.playerId).toBe("player_1");
    expect(state.columns[0]!.newPlayerName).toBeNull();
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
});
