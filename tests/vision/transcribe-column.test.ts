/**
 * `transcribeColumn` — the three outcomes (`ok`, `invalid`, `error`), with
 * the Anthropic SDK mocked. Same convention as
 * `tests/vision/transcribe-sheet.test.ts`: never hit the real API.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeStream {
  finalText: () => Promise<string>;
  finalMessage: () => Promise<{ usage: { input_tokens: number; output_tokens: number } }>;
}

let nextStream: FakeStream | null = null;
let nextStreamError: Error | null = null;
const streamCalls: unknown[] = [];

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        stream: (params: unknown) => {
          streamCalls.push(params);
          if (nextStreamError) throw nextStreamError;
          return nextStream;
        },
      };
    },
  };
});

function fakeStream(text: string, usage = { input_tokens: 10, output_tokens: 20 }): FakeStream {
  return {
    finalText: async () => text,
    finalMessage: async () => ({ usage }),
  };
}

beforeEach(() => {
  nextStream = null;
  nextStreamError = null;
  streamCalls.length = 0;
});

describe("transcribeColumn", () => {
  it("returns status 'ok' and the parsed reading for a well-formed response", async () => {
    const { transcribeColumn } = await import("@/lib/vision/transcribe-column");

    nextStream = fakeStream(
      JSON.stringify({
        player_name: "Player D",
        name_confidence: "high",
        running_totals: [29, 29, 64, 64, 64, 64, 64, 64, 67, 67, 111],
        least_confident_index: null,
      }),
    );

    const result = await transcribeColumn({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("ok");
    expect(result.reading.player_name).toBe("Player D");
    expect(result.error).toBeNull();
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(result.rawJson).toContain("Player D");

    // The exact contract from docs/ARCHITECTURE.md § "Targeted column re-read".
    const params = streamCalls[0] as {
      model: string;
      thinking?: { type: string };
      output_config?: { format?: { type: string } };
      messages: { content: { type: string; text?: string }[] }[];
    };
    expect(params.model).toBe("claude-opus-5");
    expect(params.thinking).toEqual({ type: "adaptive" });
    expect(params.output_config?.format?.type).toBe("json_schema");
    expect(params.thinking).not.toHaveProperty("budget_tokens");

    // ⚠️ The expected player name must never appear in the prompt sent upstream.
    const promptText = params.messages[0]!.content.find((c) => c.type === "text")!.text!;
    expect(promptText).not.toContain("Player D");
  });

  it("salvages the fields that do parse when the whole response fails schema validation", async () => {
    const { transcribeColumn } = await import("@/lib/vision/transcribe-column");

    nextStream = fakeStream(
      JSON.stringify({
        player_name: "Player B",
        name_confidence: "not-a-real-confidence",
        running_totals: [1, 2, 3],
        least_confident_index: null,
      }),
    );

    const result = await transcribeColumn({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("invalid");
    // The fields that did parse survive; the broken one falls back rather
    // than discarding the whole reading.
    expect(result.reading.player_name).toBe("Player B");
    expect(result.reading.running_totals).toEqual([1, 2, 3]);
    expect(result.reading.name_confidence).toBe("low");
  });

  it("returns status 'invalid' with an empty reading when the response isn't JSON at all", async () => {
    const { transcribeColumn } = await import("@/lib/vision/transcribe-column");
    nextStream = fakeStream("not json at all");

    const result = await transcribeColumn({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("invalid");
    expect(result.reading.running_totals).toEqual([]);
    expect(result.rawJson).toBe("not json at all");
  });

  it("returns status 'error' with an empty reading when the upstream call itself fails", async () => {
    const { transcribeColumn } = await import("@/lib/vision/transcribe-column");
    nextStreamError = new Error("connection reset");

    const result = await transcribeColumn({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("error");
    expect(result.reading.running_totals).toEqual([]);
    expect(result.rawJson).toBeNull();
    expect(result.error).toContain("connection reset");
    // ⚠️ The API key must never end up anywhere in the stored/returned shape.
    expect(JSON.stringify(result)).not.toContain("sk-test");
  });
});
