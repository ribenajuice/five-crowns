import { SHEET_MODEL } from "./client";

/**
 * Dated pricing constants for the admin panel's spend estimate (PRD criteria
 * 111, 112). Both vision paths (`transcribe-sheet.ts`, `transcribe-column.ts`)
 * call the same model, `SHEET_MODEL`/`COLUMN_MODEL` in `lib/vision/client.ts`
 * — so one pair of per-token prices covers every transcription row.
 *
 * ⚠️ **A dated constant, not a live lookup** (decision, this file, 2026-09-14):
 * the founder's own criterion 112 asks for a checked date and a pointer to
 * the Anthropic console as the authority, not a promise this number tracks
 * price changes automatically. Update both the prices and
 * {@link PRICES_CHECKED_ON} together when they're next verified.
 *
 * Source: https://platform.claude.com/docs/en/about-claude/pricing, standard
 * (non-fast-mode, non-batch) API pricing for Claude Opus 5, checked
 * 2026-09-14: $5 / MTok input, $25 / MTok output.
 */

/**
 * Reuses `client.ts`'s own constant rather than re-typing the model name as a
 * third independent literal — if `SHEET_MODEL` is ever bumped, this is forced
 * to follow rather than silently going stale. Picks `SHEET_MODEL` specifically
 * because both paths price identically today; if `SHEET_MODEL` and
 * `COLUMN_MODEL` are ever allowed to diverge, this constant (and the
 * assumption that one price pair covers both) needs revisiting alongside
 * whatever caused the split.
 */
export const PRICED_MODEL = SHEET_MODEL;

/** ISO date this file's prices were last checked against the Anthropic console. */
export const PRICES_CHECKED_ON = "2026-09-14";

export const INPUT_USD_PER_MILLION_TOKENS = 5;
export const OUTPUT_USD_PER_MILLION_TOKENS = 25;

/**
 * US$ → A$, the same fixed rate `docs/DESIGN-SYSTEM.md`'s usage-estimate
 * disclosure states verbatim ("converted at US$1 ≈ A$1.55"). Not a live FX
 * lookup, for the same reason the token prices aren't: this is a rough
 * estimate meant to catch a runaway or borrowed key, not an invoice.
 */
export const USD_TO_AUD_RATE = 1.55;

/**
 * A$ estimate for a bucket of stored tokens, rounded to the cent. Callers
 * pass the *sum* across whatever rows they're estimating (a month, a day);
 * this function has no notion of time itself.
 */
export function estimateCostAud(inputTokens: number, outputTokens: number): number {
  const usd =
    (inputTokens / 1_000_000) * INPUT_USD_PER_MILLION_TOKENS +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MILLION_TOKENS;
  const aud = usd * USD_TO_AUD_RATE;
  return Math.round(aud * 100) / 100;
}
