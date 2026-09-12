/**
 * The sheet-transcription vision call.
 *
 * ⚠️ Read `lib/vision/client.ts` and `docs/ARCHITECTURE.md` § Flow 2, step 5
 * before changing anything here — the exact model, thinking and
 * structured-output shape are load-bearing, not stylistic.
 *
 * Three outcomes, matching `transcription.status` exactly
 * (`docs/ARCHITECTURE.md` § Data model, `transcription`):
 *   - `"ok"` — the response validated cleanly against the sheet schema.
 *   - `"invalid"` — the upstream call succeeded but the response didn't
 *     parse, in whole or in part. PRD criterion 54: **never a hard failure**
 *     — every column that *did* parse is kept, and one that didn't becomes a
 *     fully empty, flagged column rather than discarding the rest of the
 *     read.
 *   - `"error"` — the upstream call itself failed (network, auth, timeout).
 *     Nothing parsed; there is nothing to salvage.
 */

import "server-only";

import { anthropicClient, sheetOutputFormat, SHEET_MODEL } from "./client";
import { SHEET_TRANSCRIPTION_PROMPT } from "./sheet-prompt";
import {
  EMPTY_SHEET_COLUMN,
  sheetColumnReadingSchema,
  sheetTranscriptionSchema,
  type SheetColumnReading,
} from "./sheet-schema";

/**
 * Thinking plus up to eight columns of JSON is comfortably inside this, and
 * generous headroom matters more than it costs: a response truncated at
 * `max_tokens` is invalid JSON, which is exactly the "whole read discarded"
 * failure criterion 54 exists to avoid.
 */
const MAX_OUTPUT_TOKENS = 16_000;

export interface SheetTranscriptionAttempt {
  status: "ok" | "invalid" | "error";
  columns: SheetColumnReading[];
  /** The model's raw response text, whatever it was. Never the API key. */
  rawJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  /** A plain description of what went wrong. `null` on `"ok"`. */
  error: string | null;
}

export interface TranscribeSheetArgs {
  apiKey: string;
  /** The `model.jpg` bytes, base64-encoded. */
  imageBase64: string;
}

export async function transcribeSheet(
  args: TranscribeSheetArgs,
): Promise<SheetTranscriptionAttempt> {
  const startedAt = Date.now();
  const client = anthropicClient(args.apiKey);

  let rawJson: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const stream = client.messages.stream({
      model: SHEET_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { format: sheetOutputFormat() },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: args.imageBase64,
              },
            },
            { type: "text", text: SHEET_TRANSCRIPTION_PROMPT },
          ],
        },
      ],
    });

    rawJson = await stream.finalText();
    const message = await stream.finalMessage();
    inputTokens = message.usage?.input_tokens ?? null;
    outputTokens = message.usage?.output_tokens ?? null;
  } catch (error) {
    return {
      status: "error",
      columns: [],
      rawJson,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      error: describeUpstreamError(error),
    };
  }

  const latencyMs = Date.now() - startedAt;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      status: "invalid",
      columns: [],
      rawJson,
      inputTokens,
      outputTokens,
      latencyMs,
      error: "The model's response wasn't valid JSON.",
    };
  }

  const whole = sheetTranscriptionSchema.safeParse(parsed);
  if (whole.success) {
    return {
      status: "ok",
      columns: whole.data.columns,
      rawJson,
      inputTokens,
      outputTokens,
      latencyMs,
      error: null,
    };
  }

  return {
    status: "invalid",
    columns: salvageColumns(parsed),
    rawJson,
    inputTokens,
    outputTokens,
    latencyMs,
    error: "The model's response didn't match the expected shape in every column.",
  };
}

/**
 * Best-effort recovery when the whole response doesn't validate: keep every
 * column that parses on its own, and turn one that doesn't into a fully
 * empty, flagged column rather than losing the columns around it.
 */
function salvageColumns(parsed: unknown): SheetColumnReading[] {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("columns" in parsed) ||
    !Array.isArray((parsed as { columns: unknown }).columns)
  ) {
    return [];
  }

  return (parsed as { columns: unknown[] }).columns.map((entry) => {
    const result = sheetColumnReadingSchema.safeParse(entry);
    return result.success ? result.data : { ...EMPTY_SHEET_COLUMN };
  });
}

function describeUpstreamError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "The transcription call failed.";
}
