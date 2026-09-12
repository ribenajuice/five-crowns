import { describe, expect, it } from "vitest";

import { consumeNdjsonStream, parseNdjsonLine, splitNdjsonLines } from "@/lib/ui/ndjson";

describe("splitNdjsonLines", () => {
  it("splits complete lines and keeps a trailing partial one as `rest`", () => {
    expect(splitNdjsonLines('{"a":1}\n{"b":2}\n{"c":3')).toEqual({
      lines: ['{"a":1}', '{"b":2}'],
      rest: '{"c":3',
    });
  });

  it("drops blank lines", () => {
    expect(splitNdjsonLines('{"a":1}\n\n{"b":2}\n')).toEqual({
      lines: ['{"a":1}', '{"b":2}'],
      rest: "",
    });
  });

  it("a buffer with no newline yet is entirely `rest`", () => {
    expect(splitNdjsonLines('{"a":1')).toEqual({ lines: [], rest: '{"a":1' });
  });
});

describe("parseNdjsonLine", () => {
  it("parses a JSON line", () => {
    expect(parseNdjsonLine('{"type":"progress"}')).toEqual({ type: "progress" });
  });

  it("throws on malformed JSON — the caller decides what to do", () => {
    expect(() => parseNdjsonLine("not json")).toThrow();
  });
});

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]!));
      i += 1;
    },
  });
}

describe("consumeNdjsonStream", () => {
  it("calls onEvent once per line, even when a line is split across chunks", async () => {
    const events: unknown[] = [];
    // `{"type":"progress"}` is deliberately split mid-object across two chunks.
    await consumeNdjsonStream(
      streamOf(['{"type":"prog', 'ress"}\n{"type":"result","draftId":"d1"}\n']),
      (event) => events.push(event),
    );
    expect(events).toEqual([
      { type: "progress" },
      { type: "result", draftId: "d1" },
    ]);
  });

  it("still delivers the final line when the stream ends without a trailing newline", async () => {
    const events: unknown[] = [];
    await consumeNdjsonStream(streamOf(['{"type":"error","code":"x"}']), (event) =>
      events.push(event),
    );
    expect(events).toEqual([{ type: "error", code: "x" }]);
  });

  it("skips a malformed line rather than throwing, and keeps reading", async () => {
    const events: unknown[] = [];
    await consumeNdjsonStream(
      streamOf(['not json at all\n{"type":"progress"}\n']),
      (event) => events.push(event),
    );
    expect(events).toEqual([{ type: "progress" }]);
  });

  it("does nothing for an empty stream", async () => {
    const events: unknown[] = [];
    await consumeNdjsonStream(streamOf([]), (event) => events.push(event));
    expect(events).toEqual([]);
  });
});
