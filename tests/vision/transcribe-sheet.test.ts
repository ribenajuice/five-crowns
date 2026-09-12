/**
 * `transcribeSheet` — the three outcomes (`ok`, `invalid`, `error`), with the
 * Anthropic SDK mocked. Following the project's stated convention (never hit
 * the real API in tests): the default export of `@anthropic-ai/sdk` is
 * replaced with a fake whose `messages.stream()` returns a script-controlled
 * fake stream, so no network call is ever made.
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

describe("transcribeSheet", () => {
  it("returns status 'ok' and the parsed columns for a well-formed response", async () => {
    const { transcribeSheet } = await import("@/lib/vision/transcribe-sheet");

    nextStream = fakeStream(
      JSON.stringify({
        columns: [
          {
            name: "Player C",
            name_confidence: "high",
            running_totals: [23, 23, 27, 34, 37, 44, 57, 71, 75, 78, 78],
            least_confident_index: null,
          },
        ],
      }),
    );

    const result = await transcribeSheet({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("ok");
    expect(result.columns).toHaveLength(1);
    expect(result.columns[0]!.name).toBe("Player C");
    expect(result.error).toBeNull();
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(result.rawJson).toContain("Player C");

    // The exact contract from docs/ARCHITECTURE.md § Flow 2, step 5.
    const params = streamCalls[0] as {
      model: string;
      thinking?: { type: string };
      output_config?: { format?: { type: string } };
    };
    expect(params.model).toBe("claude-opus-5");
    expect(params.thinking).toEqual({ type: "adaptive" });
    expect(params.output_config?.format?.type).toBe("json_schema");
    // ⚠️ Never budget_tokens — Opus 5 400s on it.
    expect(params.thinking).not.toHaveProperty("budget_tokens");
  });

  it("salvages the columns that do parse when the whole response fails schema validation", async () => {
    const { transcribeSheet } = await import("@/lib/vision/transcribe-sheet");

    nextStream = fakeStream(
      JSON.stringify({
        columns: [
          {
            name: "Player A",
            name_confidence: "high",
            running_totals: [1, 2, 3],
            least_confident_index: null,
          },
          {
            // Missing required fields entirely.
            name: "Player B",
          },
        ],
      }),
    );

    const result = await transcribeSheet({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("invalid");
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]!.name).toBe("Player A");
    // The broken entry becomes a fully empty, flagged column — not dropped.
    expect(result.columns[1]).toEqual({
      name: null,
      name_confidence: "low",
      running_totals: [],
      least_confident_index: null,
    });
    expect(result.rawJson).toContain("Player B");
  });

  it("returns status 'invalid' with no columns and the raw text when the response isn't JSON at all", async () => {
    const { transcribeSheet } = await import("@/lib/vision/transcribe-sheet");
    nextStream = fakeStream("not json at all");

    const result = await transcribeSheet({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("invalid");
    expect(result.columns).toEqual([]);
    expect(result.rawJson).toBe("not json at all");
  });

  it("returns status 'error' with no raw JSON when the upstream call itself fails", async () => {
    const { transcribeSheet } = await import("@/lib/vision/transcribe-sheet");
    nextStreamError = new Error("connection reset");

    const result = await transcribeSheet({ apiKey: "sk-test", imageBase64: "ZmFrZQ==" });

    expect(result.status).toBe("error");
    expect(result.columns).toEqual([]);
    expect(result.rawJson).toBeNull();
    expect(result.error).toContain("connection reset");
    // ⚠️ The API key must never end up anywhere in the stored/returned shape.
    expect(JSON.stringify(result)).not.toContain("sk-test");
  });
});
