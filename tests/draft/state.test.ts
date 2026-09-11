import { describe, expect, it } from "vitest";

import {
  columnPlayerKey,
  createDraftSchema,
  draftStateSchema,
  effectiveValues,
  emptyDraftState,
  nameKey,
  toGridColumns,
  type DraftColumn,
  type DraftState,
} from "@/lib/draft/state";
import { validateGrid } from "@/lib/scoring";
import { SHEET_01 } from "../fixtures/sheets";

/** A sheet-01 draft typed entirely by hand, every cell entered as a manual edit. */
function typedSheet01(): DraftState {
  const state = emptyDraftState({
    photoId: "photo-1",
    playedOn: "2026-09-11",
    columnIds: SHEET_01.columns.map((_, i) => `col-${i}`),
  });
  state.columns.forEach((column, i) => {
    column.newPlayerName = SHEET_01.columns[i]!.player;
    SHEET_01.columns[i]!.runningTotals.forEach((value, index) => {
      column.manualEdits[String(index)] = value;
    });
  });
  return state;
}

describe("nameKey", () => {
  it("makes 'Player C's place' and '  player c's place ' one venue (criterion 62)", () => {
    expect(nameKey("Player C's place")).toBe(nameKey("  player c's place "));
  });

  it("collapses inner whitespace", () => {
    expect(nameKey("Player   C")).toBe("player c");
  });
});

describe("effectiveValues", () => {
  it("is eleven empty cells for a column typed by hand with nothing entered", () => {
    const [column] = emptyDraftState({
      photoId: "p",
      playedOn: "2026-09-11",
      columnIds: ["a"],
    }).columns;
    expect(effectiveValues(column!)).toEqual(Array(11).fill(null));
  });

  it("lays manual edits over the active reading, and a null edit clears a cell", () => {
    const column: DraftColumn = {
      id: "a",
      order: 0,
      playerId: null,
      newPlayerName: null,
      sheetName: null,
      activeReadingId: "r1",
      readings: [
        {
          id: "r1",
          source: "sheet",
          photoId: "p",
          transcriptionId: "t1",
          values: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 11],
          at: "2026-09-11T00:00:00Z",
        },
      ],
      manualEdits: { "10": 111, "0": null },
    };
    expect(effectiveValues(column)).toEqual([
      null, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111,
    ]);
  });
});

describe("toGridColumns", () => {
  it("feeds validateGrid a typed sheet-01 that passes, repeats and all", () => {
    expect(validateGrid(toGridColumns(typedSheet01())).ok).toBe(true);
  });

  it("returns columns in the paper's order, whatever order they're stored in", () => {
    const state = typedSheet01();
    state.columns.reverse();
    expect(toGridColumns(state).map((c) => c.id)).toEqual([
      "col-0", "col-1", "col-2", "col-3",
    ]);
  });

  it("treats two pending names that differ only in case as the same person", () => {
    const state = typedSheet01();
    state.columns[1]!.newPlayerName = "  player a ";
    expect(columnPlayerKey(state.columns[0]!)).toBe(
      columnPlayerKey(state.columns[1]!),
    );
    const result = validateGrid(toGridColumns(state));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "duplicate_player")).toBe(true);
  });

  it("blocks a column with no player, picked or new", () => {
    const state = typedSheet01();
    state.columns[2]!.newPlayerName = null;
    const result = validateGrid(toGridColumns(state));
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "unassigned_column")).toBe(true);
  });
});

describe("draftStateSchema", () => {
  it("accepts a typed sheet-01 draft", () => {
    expect(draftStateSchema.safeParse(typedSheet01()).success).toBe(true);
  });

  it("rejects a column that is both an existing and a new player", () => {
    const state = typedSheet01();
    state.columns[0]!.playerId = "player-1";
    expect(draftStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a venue that is both an existing and a new one", () => {
    const state = typedSheet01();
    state.locationId = "loc-1";
    state.newLocationName = "Player C's place";
    expect(draftStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a blank new name", () => {
    const state = typedSheet01();
    state.columns[0]!.newPlayerName = "   ";
    expect(draftStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects dates that aren't real", () => {
    const state = typedSheet01();
    state.playedOn = "2026-02-30";
    expect(draftStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects negative, fractional and absurd values", () => {
    for (const bad of [-1, 2.5, 1000]) {
      const state = typedSheet01();
      state.columns[0]!.manualEdits["3"] = bad;
      expect(draftStateSchema.safeParse(state).success).toBe(false);
    }
  });

  it("rejects duplicate column ids", () => {
    const state = typedSheet01();
    state.columns[1]!.id = state.columns[0]!.id;
    expect(draftStateSchema.safeParse(state).success).toBe(false);
  });
});

describe("createDraftSchema", () => {
  it("requires the draft's photo to be the photo it was created for", () => {
    const state = typedSheet01();
    expect(createDraftSchema.safeParse({ photoId: "photo-1", state }).success).toBe(true);
    expect(createDraftSchema.safeParse({ photoId: "photo-2", state }).success).toBe(false);
  });
});
