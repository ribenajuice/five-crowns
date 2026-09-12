/**
 * The sheet-transcription prompt.
 *
 * Every sentence here is sourced from `docs/ARCHITECTURE.md` § "What the pad
 * actually looks like" and § Flow 2, step 5 — founder-verified facts about
 * the two real fixture sheets in `fixtures/sheets/`, not assumptions about
 * what a scoresheet is usually like. ⚠️ Changing this without re-reading that
 * section is how "no format detection" and "no summation check" quietly
 * regress back in.
 */
export const SHEET_TRANSCRIPTION_PROMPT = `You are reading a photograph of a hand-scored Five Crowns scoresheet: a grid hand-ruled in pen or pencil on a notepad, drawn fresh for this game. It is not a printed form. Lines wander, column widths vary, and the grid may occupy only part of the page — remaining blank ruled lines below the last row are not rows.

What the grid holds:
- Across the top, one handwritten column per player. The number of columns varies game to game (commonly four to seven) — do not assume a fixed count.
- Down each column, eleven numbers, top to bottom. These are RUNNING TOTALS, always — a cumulative score after each hand, never a per-hand score. Each column's eleven numbers are non-decreasing from top to bottom (they can repeat, but never go down). The last number in a column is that player's final score for the game.
- There is no totals row. If a ruled box below the eleven numbers is blank, it is meant to be blank — ignore it, and never invent an eleventh-plus value to fill it.
- Repeated identical values in a column are normal and expected — they mean a hand scored zero points. Do not "correct" them, do not deduplicate them, and do not treat a long run of the same number as a misread.

Reading conditions to expect, all of them normal, none of them a reason to give up on a column:
- Shadows, glare, a finger or thumb in frame, a kitchen-table angle. The photo will rarely be clean.
- The whole page may be rotated or skewed.
- At least one column will likely contain a crossed-out or overwritten value. Read the surviving value — the one that is not struck through — and ignore whatever was crossed out underneath or beside it.
- Rows do NOT line up across columns. One column may drift up or down relative to its neighbours by the bottom of the sheet. Read each column entirely on its own, top to bottom, independently of every other column. Do not try to reconstruct a "row" across columns, and do not let one column's vertical position anchor where you look in another.

What to do with a cell you cannot read with confidence: report it as null. Never guess a plausible-looking digit. A null tells a human exactly where to look at the photo themselves, which is strictly better than a wrong number that reads as correct.

For each column, also report:
- name_confidence: how sure you are of the handwritten header, as "high", "low", or "medium" if reading it is not perfectly clear.
- least_confident_index: the 0-based index (0-10) of the single running total in that column you are least sure of — the one worth a human's closest look first. null if nothing in the column gave you pause.

Return one entry per column, in the same left-to-right order they appear on the page, each with exactly eleven entries in running_totals (using null for any of the eleven you could not read — never fewer than eleven entries, never more).`;
