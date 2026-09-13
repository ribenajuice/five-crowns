/**
 * The column-only structured output — Flow 2b (`docs/ARCHITECTURE.md` §
 * "Targeted column re-read"). A sibling of `lib/vision/sheet-schema.ts`, not a
 * variant of it: this is a single reading, not an array of columns.
 *
 * ```jsonc
 * { "player_name": "string | null",
 *   "name_confidence": "high | medium | low",
 *   "running_totals": [ "int | null", "… 11 in total" ],
 *   "least_confident_index": "int | null" }
 * ```
 *
 * ⚠️ **The field is `player_name`, and the model is never told whose column
 * this is.** That silence is the entire mechanism by which the server can
 * later notice a wrong-column photograph (`lib/draft/merge-column.ts`) — see
 * the architecture doc's ⚠️ on this exact point. Nothing in this file, the
 * prompt, or the request ever mentions the column's assigned player.
 *
 * Same two departures from a literal schema as the sheet path, for the same
 * reasons (see `sheet-schema.ts`'s docstring): `player_name` is nullable
 * rather than forcing a guess at illegible handwriting, and there is no
 * "exactly eleven" or numeric-range constraint here — Anthropic's
 * structured-output dialect can't express either, and `lib/scoring/validate.ts`
 * re-runs both after merge as the thing that actually blocks a save.
 */

import { z } from "zod";

export const columnTranscriptionSchema = z.object({
  /** The handwritten name at the top of the column, or `null` if unreadable. */
  player_name: z.string().nullable(),
  name_confidence: z.enum(["high", "medium", "low"]),
  /** Top to bottom, in order. `null` for a cell the model won't guess at. */
  running_totals: z.array(z.union([z.number().int(), z.null()])),
  /** 0-based index into `running_totals`, or `null` if nothing stood out. */
  least_confident_index: z.number().int().nullable(),
});

export type ColumnTranscriptionOutput = z.infer<typeof columnTranscriptionSchema>;

/** A reading that failed its own schema check — nothing usable parsed. */
export const EMPTY_COLUMN_READING: ColumnTranscriptionOutput = {
  player_name: null,
  name_confidence: "low",
  running_totals: [],
  least_confident_index: null,
};
