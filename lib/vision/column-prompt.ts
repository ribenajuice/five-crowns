/**
 * The column-only transcription prompt — Flow 2b (`docs/ARCHITECTURE.md` §
 * "Targeted column re-read").
 *
 * ⚠️ **Deliberately never names the expected player.** Telling the model
 * whose column this is would bias it into reading that name whatever the
 * photo actually shows, and destroy the only cheap check the app has on
 * whether the founder photographed the right column at all — the server
 * compares the name the model reports against the column's assigned player
 * *afterwards*, in `lib/draft/merge-column.ts`. Do not add a hint here.
 */
export const COLUMN_TRANSCRIPTION_PROMPT = `You are reading a close-up photograph of ONE column from a hand-scored Five Crowns scoresheet: a hand-ruled grid on a notepad, drawn fresh for this game. This photo shows a single player's column only, cropped tight — not the whole sheet.

What the column holds:
- A handwritten name at the top.
- Below it, eleven numbers, top to bottom. These are RUNNING TOTALS, always — a cumulative score after each hand, never a per-hand score. The eleven numbers are non-decreasing from top to bottom (they can repeat, but never go down). The last number is this player's final score for the game.
- If a ruled box below the eleventh number is blank, it is meant to be blank — ignore it, and never invent a twelfth value to fill it.
- Repeated identical values are normal and expected — they mean a hand scored zero points. Do not "correct" them, do not deduplicate them, and do not treat a run of the same number as a misread.

Reading conditions to expect, all of them normal:
- Shadows, glare, a finger or thumb in frame, a kitchen-table angle.
- The photo may be rotated or skewed.
- The column may contain a crossed-out or overwritten value. Read the surviving value — the one that is not struck through — and ignore whatever was crossed out underneath or beside it.

What to do with a cell you cannot read with confidence: report it as null. Never guess a plausible-looking digit. A null tells a human exactly where to look at the photo themselves, which is strictly better than a wrong number that reads as correct.

Also report:
- name_confidence: how sure you are of the handwritten name at the top, as "high", "low", or "medium" if reading it is not perfectly clear.
- least_confident_index: the 0-based index (0-10) of the single running total you are least sure of — the one worth a human's closest look first. null if nothing gave you pause.

Return player_name exactly as you read it — or null if it can't be read at all — and running_totals with exactly eleven entries, using null for any of the eleven you could not read. Never fewer than eleven entries, never more.`;
