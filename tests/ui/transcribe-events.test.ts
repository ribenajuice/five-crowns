import { describe, expect, it } from "vitest";

import { parseTranscribeEvent } from "@/lib/ui/transcribe-events";

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
});
