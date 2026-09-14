import { describe, expect, it } from "vitest";

import {
  extractSuggestedColumnIds,
  parseTranscribeColumnEvent,
  parseTranscribeEvent,
} from "@/lib/ui/transcribe-events";

describe("parseTranscribeEvent", () => {
  it("parses a progress event, defaulting an unexpected stage", () => {
    expect(parseTranscribeEvent({ type: "progress", stage: "transcribing" })).toEqual({
      type: "progress",
      stage: "transcribing",
    });
    expect(parseTranscribeEvent({ type: "progress" })).toEqual({
      type: "progress",
      stage: "transcribing",
    });
  });

  it("parses an error event, defaulting a missing code/message", () => {
    expect(parseTranscribeEvent({ type: "error", code: "upstream_error", message: "nope" })).toEqual({
      type: "error",
      code: "upstream_error",
      message: "nope",
    });
    expect(parseTranscribeEvent({ type: "error" })).toEqual({
      type: "error",
      code: "server_error",
      message: "Something went wrong at our end.",
    });
  });

  it("parses a result event with its column diagnostics", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      columns: [
        { columnId: "col_1", nameConfidence: "high", leastConfidentIndex: null },
        { columnId: "col_2", nameConfidence: "low", leastConfidentIndex: 4 },
      ],
    };
    expect(parseTranscribeEvent(raw)).toEqual(raw);
  });

  it("defaults an unrecognised status to 'ok' and a bad nameConfidence to 'low'", () => {
    const raw = {
      type: "result",
      status: "something-else",
      draftId: "draft_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      columns: [{ columnId: "col_1", nameConfidence: "extremely sure", leastConfidentIndex: null }],
    };
    const parsed = parseTranscribeEvent(raw);
    if (parsed?.type !== "result") throw new Error("expected a result event");
    expect(parsed.status).toBe("ok");
    expect(parsed.columns[0]!.nameConfidence).toBe("low");
  });

  it("drops a column with no columnId rather than keeping a blank one", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      columns: [{ nameConfidence: "high", leastConfidentIndex: null }, { columnId: "col_2" }],
    };
    const parsed = parseTranscribeEvent(raw);
    expect(parsed).toMatchObject({
      columns: [{ columnId: "col_2", nameConfidence: "low", leastConfidentIndex: null }],
    });
  });

  it("returns null for a result event missing required fields", () => {
    expect(
      parseTranscribeEvent({ type: "result", status: "ok", draftId: "d1" }),
    ).toBeNull();
  });

  it("returns null for an unrecognised type, or a non-object line", () => {
    expect(parseTranscribeEvent({ type: "something-else" })).toBeNull();
    expect(parseTranscribeEvent("just a string")).toBeNull();
    expect(parseTranscribeEvent(null)).toBeNull();
    expect(parseTranscribeEvent(42)).toBeNull();
  });

  it("carries the merged draft state through, unparsed (Stage 4: AddGameFlow reads it for suggested columns)", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      columns: [],
      state: { version: 1, columns: [{ id: "col_1", playerId: "p1" }] },
    };
    const parsed = parseTranscribeEvent(raw);
    if (parsed?.type !== "result") throw new Error("expected a result event");
    expect(parsed.state).toEqual(raw.state);
  });
});

describe("extractSuggestedColumnIds (Stage 4, criterion 172)", () => {
  it("names every column that already carries a playerId — a fresh draft starts with none, so any that has one got there by a suggestion", () => {
    const state = {
      columns: [
        { id: "col_1", playerId: "player-a" },
        { id: "col_2", playerId: null },
        { id: "col_3", playerId: "player-b" },
      ],
    };
    expect(extractSuggestedColumnIds(state)).toEqual(["col_1", "col_3"]);
  });

  it("returns an empty list for a malformed or missing state, never throws", () => {
    expect(extractSuggestedColumnIds(null)).toEqual([]);
    expect(extractSuggestedColumnIds(undefined)).toEqual([]);
    expect(extractSuggestedColumnIds({})).toEqual([]);
    expect(extractSuggestedColumnIds({ columns: "not an array" })).toEqual([]);
  });

  it("ignores a column with a non-string or blank playerId", () => {
    const state = { columns: [{ id: "col_1", playerId: 42 }, { id: "col_2", playerId: "" }] };
    expect(extractSuggestedColumnIds(state)).toEqual([]);
  });
});

describe("parseTranscribeColumnEvent (Stage 4: POST /api/transcribe/column)", () => {
  it("parses progress and error events identically to the sheet path", () => {
    expect(parseTranscribeColumnEvent({ type: "progress", stage: "transcribing" })).toEqual({
      type: "progress",
      stage: "transcribing",
    });
    expect(parseTranscribeColumnEvent({ type: "error" })).toEqual({
      type: "error",
      code: "server_error",
      message: "Something went wrong at our end.",
    });
  });

  it("parses a result event with its single diagnostics object, not an array", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      columnId: "col_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      state: { version: 1, columns: [] },
      diagnostics: {
        columnId: "col_1",
        nameConfidence: "high",
        leastConfidentIndex: 4,
        readPlayerName: "Player D",
        possibleWrongColumn: false,
        disagreesWithTypedCells: [{ index: 2, typedValue: 64, closeUpValue: 84 }],
      },
    };
    expect(parseTranscribeColumnEvent(raw)).toEqual(raw);
  });

  it("defaults a missing or malformed diagnostics object rather than throwing", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      columnId: "col_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      state: {},
    };
    const parsed = parseTranscribeColumnEvent(raw);
    if (parsed?.type !== "result") throw new Error("expected a result event");
    expect(parsed.diagnostics).toEqual({
      columnId: "col_1",
      nameConfidence: "low",
      leastConfidentIndex: null,
      readPlayerName: null,
      possibleWrongColumn: false,
      disagreesWithTypedCells: [],
    });
  });

  it("drops a malformed typed-cell disagreement entry rather than keeping a broken one", () => {
    const raw = {
      type: "result",
      status: "ok",
      draftId: "draft_1",
      columnId: "col_1",
      updatedAt: "2026-09-12T00:00:00.000Z",
      transcriptionId: "tr_1",
      state: {},
      diagnostics: {
        disagreesWithTypedCells: [{ index: 2, typedValue: 64, closeUpValue: 84 }, { index: "oops" }],
      },
    };
    const parsed = parseTranscribeColumnEvent(raw);
    if (parsed?.type !== "result") throw new Error("expected a result event");
    expect(parsed.diagnostics.disagreesWithTypedCells).toEqual([
      { index: 2, typedValue: 64, closeUpValue: 84 },
    ]);
  });

  it("returns null for a result event missing required fields (no `state`)", () => {
    expect(
      parseTranscribeColumnEvent({
        type: "result",
        draftId: "draft_1",
        columnId: "col_1",
        updatedAt: "2026-09-12T00:00:00.000Z",
        transcriptionId: "tr_1",
      }),
    ).toBeNull();
  });

  it("returns null for an unrecognised type, or a non-object line", () => {
    expect(parseTranscribeColumnEvent({ type: "something-else" })).toBeNull();
    expect(parseTranscribeColumnEvent("just a string")).toBeNull();
    expect(parseTranscribeColumnEvent(null)).toBeNull();
  });
});
