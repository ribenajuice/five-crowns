/**
 * The sheet-transcription structured output.
 *
 * `docs/ARCHITECTURE.md` § Flow 2, step 5: "Output schema, roughly: `{
 * columns: [ { name, name_confidence, running_totals, least_confident_index
 * } ] }`". Two departures from that literal sketch, both deliberate:
 *
 * - **`name` is nullable.** A handwritten header can be as illegible as any
 *   other cell on the sheet, and `DraftColumn.sheetName` is already nullable
 *   for exactly that reason — there is no reason to force a guess here that
 *   the rest of the system doesn't require.
 * - **Nothing here enforces "exactly eleven" or "0–999".** Anthropic's
 *   structured-output JSON Schema dialect only supports `minItems` of 0 or 1
 *   (never an exact count) and no numeric bounds at all, so those hard
 *   checks couldn't live here even if it were desirable — and it isn't:
 *   `lib/scoring/validate.ts` already re-runs both, after merge, as the
 *   thing that actually blocks a save. A column short of eleven, or a value
 *   the model hallucinated outside range, must reach the review screen as a
 *   flagged, correctable column (PRD criterion 25), not fail here.
 */

import { z } from "zod";

export const sheetColumnReadingSchema = z.object({
  /** The handwritten header, or `null` if it can't be read. */
  name: z.string().nullable(),
  name_confidence: z.enum(["high", "medium", "low"]),
  /** Top to bottom, in order. `null` for a cell the model won't guess at. */
  running_totals: z.array(z.union([z.number().int(), z.null()])),
  /** 0-based index into `running_totals`, or `null` if nothing stood out. */
  least_confident_index: z.number().int().nullable(),
});

export const sheetTranscriptionSchema = z.object({
  columns: z.array(sheetColumnReadingSchema),
});

export type SheetColumnReading = z.infer<typeof sheetColumnReadingSchema>;
export type SheetTranscriptionOutput = z.infer<typeof sheetTranscriptionSchema>;

/** A column that failed its own schema check — all empty, all flagged. */
export const EMPTY_SHEET_COLUMN: SheetColumnReading = {
  name: null,
  name_confidence: "low",
  running_totals: [],
  least_confident_index: null,
};
