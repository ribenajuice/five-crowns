/**
 * The column-transcription vision call — Flow 2b
 * (`docs/ARCHITECTURE.md` § "Targeted column re-read").
 *
 * A sibling of `lib/vision/transcribe-sheet.ts`, not a variant bolted onto
 * it: its own prompt, its own schema, its own model constant, called with the
 * same `claude-opus-5` / `thinking: {type:"adaptive"}` / `output_config`
 * contract `lib/vision/client.ts` documents. ⚠️ Read that file and the
 * architecture doc's Flow 2b before touching this one — the expected player
 * name is never sent to the model; that silence is load-bearing.
 *
 * Same three outcomes as the sheet path, matching `transcription.status`:
 *   - `"ok"` — the response validated cleanly against the column schema.
 *   - `"invalid"` — the upstream call succeeded but the response didn't
 *     parse. A column is one reading, not N independent columns, so there is
 *     nothing to salvage *between* entries the way the sheet path salvages
 *     column by column — instead each field of the single object is parsed
 *     on its own, so (for example) a well-formed `running_totals` survives
 *     even if `player_name` came back a wrong type.
 *   - `"error"` — the upstream call itself failed. Nothing parsed.
 */

import "server-only";

import { anthropicClient, columnOutputFormat, COLUMN_MODEL } from "./client";
import { COLUMN_TRANSCRIPTION_PROMPT } from "./column-prompt";
import {
  columnTranscriptionSchema,
  EMPTY_COLUMN_READING,
  type ColumnTranscriptionOutput,
} from "./column-schema";

/**
 * A close-up is a single reading, not up to eight columns of JSON — generous
 * headroom still matters (a truncated response is invalid JSON, the "whole
 * read discarded" failure criterion 54 exists to avoid) but the budget scales
 * down with the far smaller output.
 */
const MAX_OUTPUT_TOKENS = 8_000;

export interface ColumnTranscriptionAttempt {
  status: "ok" | "invalid" | "error";
  /** Always present. Fully empty (`EMPTY_COLUMN_READING`) on `"error"`, or
   *  when nothing at all parsed on `"invalid"`. */
  reading: ColumnTranscriptionOutput;
  /** The model's raw response text, whatever it was. Never the API key. */
  rawJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  /** A plain description of what went wrong. `null` on `"ok"`. */
  error: string | null;
}

export interface TranscribeColumnArgs {
  apiKey: string;
  /** The close-up's `model.jpg` bytes, base64-encoded. */
  imageBase64: string;
  /**
   * Aborts the in-flight Anthropic call when the caller no longer wants the
   * result — same reasoning as `transcribeSheet`'s `signal`.
   */
  signal?: AbortSignal;
}

export async function transcribeColumn(
  args: TranscribeColumnArgs,
): Promise<ColumnTranscriptionAttempt> {
  const startedAt = Date.now();
  const client = anthropicClient(args.apiKey);

  let rawJson: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const stream = client.messages.stream(
      {
        model: COLUMN_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { format: columnOutputFormat() },
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
              { type: "text", text: COLUMN_TRANSCRIPTION_PROMPT },
            ],
          },
        ],
      },
      { signal: args.signal },
    );

    rawJson = await stream.finalText();
    const message = await stream.finalMessage();
    inputTokens = message.usage?.input_tokens ?? null;
    outputTokens = message.usage?.output_tokens ?? null;
  } catch (error) {
    return {
      status: "error",
      reading: { ...EMPTY_COLUMN_READING },
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
      reading: { ...EMPTY_COLUMN_READING },
      rawJson,
      inputTokens,
      outputTokens,
      latencyMs,
      error: "The model's response wasn't valid JSON.",
    };
  }

  const whole = columnTranscriptionSchema.safeParse(parsed);
  if (whole.success) {
    return {
      status: "ok",
      reading: whole.data,
      rawJson,
      inputTokens,
      outputTokens,
      latencyMs,
      error: null,
    };
  }

  return {
    status: "invalid",
    reading: salvageColumnReading(parsed),
    rawJson,
    inputTokens,
    outputTokens,
    latencyMs,
    error: "The model's response didn't match the expected shape.",
  };
}

/**
 * Best-effort recovery when the whole object doesn't validate: keep whatever
 * individual field parses on its own — a column is one reading, so "salvage
 * column by column" (the sheet path's strategy) becomes "salvage field by
 * field" here.
 */
function salvageColumnReading(parsed: unknown): ColumnTranscriptionOutput {
  if (!parsed || typeof parsed !== "object") {
    return { ...EMPTY_COLUMN_READING };
  }
  const obj = parsed as Record<string, unknown>;

  const name = columnTranscriptionSchema.shape.player_name.safeParse(obj.player_name);
  const confidence = columnTranscriptionSchema.shape.name_confidence.safeParse(
    obj.name_confidence,
  );
  const totals = columnTranscriptionSchema.shape.running_totals.safeParse(
    obj.running_totals,
  );
  const leastConfident = columnTranscriptionSchema.shape.least_confident_index.safeParse(
    obj.least_confident_index,
  );

  return {
    player_name: name.success ? name.data : null,
    name_confidence: confidence.success ? confidence.data : "low",
    running_totals: totals.success ? totals.data : [],
    least_confident_index: leastConfident.success ? leastConfident.data : null,
  };
}

function describeUpstreamError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "The transcription call failed.";
}
