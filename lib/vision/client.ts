/**
 * The Anthropic client and structured-output format for the sheet path.
 *
 * ⚠️ Read `docs/ARCHITECTURE.md` § Flow 2, step 5 before touching this file.
 * Every constraint below is quoted from there, not reconstructed from memory:
 *   - Model: **`claude-opus-5`** (exact string, no date suffix).
 *   - `thinking: { type: "adaptive" }`. Never `budget_tokens` — Opus 5 400s.
 *   - Structured outputs via `output_config.format`, never the deprecated
 *     `output_format`.
 *   - No assistant prefill — it 400s on Opus 5. (Nothing here sends one: the
 *     only message is a single `user` turn.)
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { JSONOutputFormat } from "@anthropic-ai/sdk/resources/messages";

import { columnTranscriptionSchema } from "./column-schema";
import { sheetTranscriptionSchema } from "./sheet-schema";

/** Exact string, no date suffix — docs/ARCHITECTURE.md § Flow 2, step 5. */
export const SHEET_MODEL = "claude-opus-5" as const;

/**
 * Same exact model as the sheet path — `docs/ARCHITECTURE.md` § "Targeted
 * column re-read" is explicit that there is **no cheaper model on this
 * path**. Kept as its own constant (identical value) rather than reusing
 * `SHEET_MODEL` so the two call sites can diverge independently if a future
 * model split is ever decided, without a rename ambiguating which path
 * changed.
 */
export const COLUMN_MODEL = "claude-opus-5" as const;

export function anthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

/**
 * The sheet schema as a plain `JSONOutputFormat`, deliberately **without**
 * the SDK's own `.parse()` attached.
 *
 * `zodOutputFormat()` returns an `AutoParseableOutputFormat` whose `.parse()`
 * throws on the first validation failure — exactly the "whole response
 * discarded" behaviour PRD criterion 54 forbids ("whatever parsed,
 * pre-filled, and types the rest"). Stripping `.parse()` back off, so only
 * `type` and `schema` survive, means the SDK's own message parsing
 * (`MessageStream`'s `maybeParseMessage`) never attempts to auto-parse the
 * response at all and never throws — `lib/vision/transcribe-sheet.ts` reads
 * the raw text itself and salvages column by column.
 */
export function sheetOutputFormat(): JSONOutputFormat {
  const { type, schema } = zodOutputFormat(sheetTranscriptionSchema);
  return { type, schema };
}

/**
 * Same reasoning as {@link sheetOutputFormat}, for the single-column schema —
 * `.parse()` stripped so a malformed response never throws inside the SDK's
 * own message parsing. `lib/vision/transcribe-column.ts` reads the raw text
 * itself and salvages field by field.
 */
export function columnOutputFormat(): JSONOutputFormat {
  const { type, schema } = zodOutputFormat(columnTranscriptionSchema);
  return { type, schema };
}
