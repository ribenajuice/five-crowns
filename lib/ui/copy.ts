/**
 * Fixed copy and flag-sentence rendering.
 *
 * `docs/DESIGN-SYSTEM.md` § Voice & tone, "Fixed strings" table: developers
 * use these strings verbatim, never paraphrased, and never with *checked,
 * validated, verified, confirmed, correct, looks right* or *all good*
 * (PRD criterion 24, 45). Centralised here so every screen that needs one of
 * these sentences renders it the same way.
 */

import { HANDS_PER_GAME, handLabel, type GridValidation } from "@/lib/scoring";

export const CAMERA_BUTTON_LABEL = "Take a photo";
export const GALLERY_BUTTON_LABEL = "Choose a photo";
export const ROTATE_ARIA_LABEL = "Rotate";
export const ROTATE_CAPTION = "Turn it until it's the right way up.";
export const UPRIGHT_CONFIRM_LABEL = "Use this photo";
export const UPLOAD_IN_PROGRESS_LABEL = "Saving the photo…";
export const UPLOAD_RETRY_LABEL = "Try again";
export const READ_SHEET_LABEL = "Read the sheet";
export const READ_SHEET_HELPER =
  "We'll read the numbers off your photo — you still check every one next.";
export const HAND_ENTRY_LABEL = "Type it in by hand";
export const HAND_ENTRY_HELPER =
  "We'll skip the automatic read. Your photo's already saved.";
export const DATE_FIELD_LABEL = "Played on";
export const VENUE_FIELD_LABEL = "Where";
export const VENUE_LIST_EMPTY = "No venues yet";
export const VENUE_ADD_NEW_ROW = "Add a new one";
export const PLAYER_ADD_NEW_ROW = "Someone new";
export const NO_LOCATION_ROW = "No location";
export const PLAYER_LIST_FIRST_GAME =
  "Nobody's in the book yet — add everyone's name";
export const PENDING_PILL_LABEL = "new";
export const CROP_STEP_HEADING = (player: string): string =>
  `Show us ${player}'s column.`;
export const CROP_GUESS_CAPTION = "We've guessed evenly — drag to line it up.";
export const CROP_CONFIRM_LABEL = "Use this crop";
export const CROP_NOT_SET_STRIP = "Not lined up yet";
export const CROP_NOT_SET_BUTTON = "Set the crop";
export const ADJUST_CROP_ARIA_LABEL = "Adjust crop";
export const SAVE_BUTTON_LABEL = "Put it in the book";
export const SAVE_BUTTON_BUSY_LABEL = "Putting it in the book…";
export const PASSING_STATEMENT =
  "Not obviously wrong — that's the most this screen can promise.";
export const TOO_FEW_PLAYERS_MESSAGE =
  "Add at least two players before this can be saved.";
export const NO_LOCATION_GAMES_LIST = "No location";

/**
 * The daily upload cap (security review, not in the design system's fixed
 * table): a plain `warn` banner, same voice as everything else — what
 * happened, what to do next.
 */
export const UPLOAD_CAP_TITLE = "That's today's photos used up.";
export const UPLOAD_CAP_MESSAGE = "Try again tomorrow.";

/* ------------------------------------------------------- Stage 3: reading */

export const TRANSCRIBE_PROGRESS_HEADING = "Reading the sheet…";
/** Cycles while the model works; the third line only earns its place after ~20s. */
export const TRANSCRIBE_PROGRESS_CAPTIONS = [
  "Finding the columns.",
  "Reading each player's numbers.",
  "Still going — this one's taking a little longer.",
] as const;

export const READ_ERROR_TITLE = "That didn't finish.";
export const READ_ERROR_MESSAGE = "Check your connection and try again.";
export const READ_RETRY_LABEL = "Try again";

export const DAILY_TRANSCRIBE_CAP_TITLE = "That's today's reads used up.";
export const DAILY_TRANSCRIBE_CAP_MESSAGE =
  "Try again tomorrow, or type this one in by hand — it's already saved.";

export function readHintSentence(hand: number): string {
  const label = handLabel(hand) ?? `hand ${hand}`;
  return `Least sure about the ${label} in this column.`;
}

/* ---------------------------------------------------- Stage 3: admin panel */

export const ADMIN_NO_KEY_TITLE = "No key set yet.";
export const ADMIN_NO_KEY_MESSAGE =
  "Nothing can be read from a photo until one is added.";
export const ADMIN_KEY_FIELD_LABEL = "Anthropic API key";
export const ADMIN_SAVE_BUTTON_LABEL = "Save key";
export const ADMIN_SAVE_BUSY_LABEL = "Testing…";
export const ADMIN_TESTING_HELPER =
  "Testing the key with a real call — this can take a couple of seconds.";
export const ADMIN_SAVED_TITLE = "Saved.";
export const ADMIN_SAVED_MESSAGE = "In use everywhere within a minute.";
export const ADMIN_REJECTED_TITLE = "That key didn't work.";
export const ADMIN_REJECTED_MESSAGE =
  "Check it and try again — the key you had before is untouched.";
export const ADMIN_STATUS_WORKING = "Working";
export const ADMIN_STATUS_NOT_WORKING = "Not working";
export const ADMIN_STATUS_UNTRIED = "Not tried yet";
export const ADMIN_REPLACE_BUTTON_LABEL = "Replace key";
export const ADMIN_SHOW_KEY_LABEL = "Show key";
export const ADMIN_HIDE_KEY_LABEL = "Hide key";

export function columnStatusLabel(filled: number, expected: number): string {
  return `${filled} of ${expected}`;
}

export function pairedFlagSentence(lower: number, higher: number): string {
  return `${lower} is lower than the ${higher} above it.`;
}

export function softWarningSentence(points: number, hand: number): string {
  const label = handLabel(hand) ?? `hand ${hand}`;
  return `${points} on the ${label} — a big one, saved as written.`;
}

export function blockedColumnShort(
  playerLabel: string,
  filled: number,
  expected: number,
): string {
  return `${playerLabel}'s column has ${filled} of ${expected}.`;
}

export function blockedColumnDips(playerLabel: string, hand: number): string {
  return `${playerLabel}'s column dips at hand ${hand}.`;
}

/** Everything after "In the book. " — what `Banner`'s second line shows. */
export function winnerConfirmationDetail(
  winners: readonly string[],
  score: number,
): string {
  if (winners.length === 0) return "";
  if (winners.length <= 1) return `${winners[0]} won on ${score}.`;

  const names =
    winners.length === 2
      ? `${winners[0]} and ${winners[1]}`
      : `${winners.slice(0, -1).join(", ")} and ${winners[winners.length - 1]}`;
  return `${names} shared it on ${score}.`;
}

export function soleWinnerConfirmation(player: string, score: number): string {
  return `In the book. ${player} won on ${score}.`;
}

export function sharedWinnerConfirmation(
  winners: readonly string[],
  score: number,
): string {
  if (winners.length <= 1) return soleWinnerConfirmation(winners[0] ?? "", score);
  return `In the book. ${winnerConfirmationDetail(winners, score)}`;
}

export function winnerConfirmation(
  winners: readonly string[],
  score: number,
): string {
  return winners.length > 1
    ? sharedWinnerConfirmation(winners, score)
    : soleWinnerConfirmation(winners[0] ?? "", score);
}

/** Games list row, shared win (design system: "{A} & {B} — shared"). */
export function sharedWinGamesListLabel(winners: readonly string[]): string {
  if (winners.length <= 1) return winners[0] ?? "";
  if (winners.length === 2) return `${winners[0]} & ${winners[1]} — shared`;
  return `${winners.slice(0, -1).join(", ")} & ${winners[winners.length - 1]} — shared`;
}

/**
 * "1st", "2nd", "3rd", "4th" … — used for the cell editor's "Nth line down"
 * caption and for every structural-repair confirm sentence, so a repair that
 * temporarily leaves a column at other than eleven rows never has to invent a
 * card rank for a row that doesn't have one yet (docs/DESIGN-SYSTEM.md § "Insert
 * or delete a value within a column").
 */
export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/**
 * The cell editor's row label: the card rank (`"6s"` … `"Kings"`) while the
 * column holds exactly eleven values, or a plain position (`"1st"`, `"2nd"`)
 * while it doesn't — mid a structural repair, there is no card rank for a
 * twelfth or tenth row (docs/DESIGN-SYSTEM.md § "Insert or delete a value
 * within a column").
 */
export function cellRowLabel(index: number, totalValues: number): string {
  if (totalValues === HANDS_PER_GAME) {
    return handLabel(index + 1) ?? ordinal(index + 1);
  }
  return ordinal(index + 1);
}

/**
 * The single most relevant reason save is blocked, in the order a person
 * would want to hear it: too few players, then a dipping column, then a short
 * one. `null` once the grid passes (which is never a claim of correctness —
 * see {@link PASSING_STATEMENT}).
 */
export function saveBlockedMessage(
  validation: GridValidation,
  playerLabelFor: (columnId: string) => string,
): string | null {
  if (validation.ok) return null;

  if (validation.issues.some((issue) => issue.code === "wrong_length")) {
    return TOO_FEW_PLAYERS_MESSAGE;
  }

  const duplicate = validation.issues.find(
    (issue) => issue.code === "duplicate_player",
  );
  if (duplicate) return duplicate.message;

  const unassigned = validation.issues.find(
    (issue) => issue.code === "unassigned_column",
  );
  if (unassigned) return unassigned.message;

  for (const [columnId, column] of Object.entries(validation.columns)) {
    const dip = column.issues.find((issue) => issue.code === "not_monotonic");
    if (dip) {
      const hand = (dip.indices[dip.indices.length - 1] ?? 0) + 1;
      return blockedColumnDips(playerLabelFor(columnId), hand);
    }
  }

  for (const [columnId, column] of Object.entries(validation.columns)) {
    if (!column.ok) {
      return blockedColumnShort(playerLabelFor(columnId), column.filled, column.expected);
    }
  }

  return "Something on this sheet still needs fixing.";
}

/* ---------------------------------------------- Stage 4: structural repairs */

export const FIX_SOMETHING_LINK = "Fix something";

export const STRUCTURE_MENU_ADD_COLUMN_ROW = "Add a missing column";
export const STRUCTURE_MENU_ADD_COLUMN_SUBCAPTION =
  "A player's whole column never got typed in.";
export const STRUCTURE_MENU_REMOVE_COLUMN_ROW = "Remove this column";
export const STRUCTURE_MENU_REMOVE_COLUMN_SUBCAPTION =
  "A margin note or stray column that isn't really a player.";
export const STRUCTURE_MENU_REASSIGN_ROW = "Reassign this column's player";
export const STRUCTURE_MENU_REASSIGN_SUBCAPTION = "Pick a different name for this column.";
export const STRUCTURE_MENU_REORDER_ROW = "Reorder columns";
export const STRUCTURE_MENU_REORDER_SUBCAPTION =
  "Match the order they're written in on the photo.";
export const STRUCTURE_MENU_INSERT_DELETE_ROW = "Insert or delete a value";
export const STRUCTURE_MENU_INSERT_DELETE_SUBCAPTION = "Fixes a row that's shifted by one.";
export const STRUCTURE_MENU_HAND_ENTRY_ROW = HAND_ENTRY_LABEL;
export const STRUCTURE_MENU_HAND_ENTRY_SUBCAPTION =
  "Every cell is already editable — this just closes the menu.";

export const REORDER_SCREEN_HEADING = "Reorder columns";
export const REORDER_SCREEN_CAPTION =
  "Match the order the columns are written in on the photo — top is the left-most column.";
export const REORDER_DONE_BUTTON = "Done";
export const REORDER_MOVE_UP_ARIA_LABEL = "Move up";
export const REORDER_MOVE_DOWN_ARIA_LABEL = "Move down";

export const FIX_THE_SHAPE_LINK = "Fix the shape";
export const FIX_THE_SHAPE_HELPER =
  "If a row got missed or doubled near here, fix the shape instead of retyping the column.";
export const INSERT_ABOVE_ACTION = "Insert a blank line above";
export const INSERT_BELOW_ACTION = "Insert a blank line below";
export const DELETE_LINE_ACTION = "Delete this line";
export const STRUCTURE_CANCEL_BUTTON = "Cancel";

/** {n}th line down, above which a blank row will be inserted. */
export function insertConfirmQuestion(n: number): string {
  return `Insert a blank line above the ${ordinal(n)} line down?`;
}
export function insertConfirmDetail(n: number): string {
  return `Everything below shifts down one — this column will read ${columnStatusLabel(n + 1, HANDS_PER_GAME)} until it's filled in.`;
}
export function deleteConfirmQuestion(n: number, value: number | null): string {
  return `Delete the ${ordinal(n)} line down — ${value ?? "–"}?`;
}
export function deleteConfirmDetail(n: number): string {
  return `Everything below shifts up one — this column will read ${columnStatusLabel(n - 1, HANDS_PER_GAME)}.`;
}

/* ------------------------------------------------- Stage 4: re-photograph */

export const PHOTOGRAPH_COLUMN_BUTTON = "Photograph this column";
export function photographColumnHeading(player: string): string {
  return `Photograph ${player}'s column.`;
}
export const PHOTOGRAPH_COLUMN_HELPER =
  "A close-up gives the reader far more pixels per digit than the whole page did — new pixels, not a second opinion.";

export function columnReadHeading(player: string): string {
  return `Reading ${player}'s column…`;
}
export const COLUMN_READ_CAPTION_PRIMARY = "One column, eleven numbers.";
/** Shares Stage 3's slow-only line rather than inventing a second one. */
export const COLUMN_READ_CAPTIONS = [
  COLUMN_READ_CAPTION_PRIMARY,
  TRANSCRIBE_PROGRESS_CAPTIONS[2],
] as const;

export const COMPARE_SUBHEADING = "Compared with what's saved now.";
export const COMPARE_OLD_LABEL_DEFAULT = "Saved now";
export const COMPARE_NEW_LABEL_DEFAULT = "New close-up";
export const COMPARE_KEEP_NEW_LABEL = "Keep the new reading";
export const COMPARE_KEEP_OLD_LABEL = "Keep what's saved";
export const COMPARE_RESHOOT_LINK = "Photograph again";
export function compareHistoryLink(n: number): string {
  return `See every reading (${n})`;
}

/** "Reading {n}" — the short handle used both in the history list and when
 *  comparing against a specific past reading (docs/DESIGN-SYSTEM.md's
 *  "{Reading} vs what's active now"). `n` is 1-based, oldest reading first. */
export function readingLabel(n: number): string {
  return `Reading ${n}`;
}

export const READING_SOURCE_LABEL: Record<"sheet" | "close-up", string> = {
  sheet: "full sheet",
  "close-up": "close-up",
};

export function readingHistoryHeading(player: string): string {
  return `Every reading of ${player}'s column`;
}
export function readingHistoryRowLabel(
  n: number,
  source: "sheet" | "close-up",
  when: string,
): string {
  return `${readingLabel(n)} · ${READING_SOURCE_LABEL[source]} · ${when}`;
}
export const READING_HISTORY_ACTIVE_PILL = "Active";
export const READING_HISTORY_LINK_TEXT = "See every reading";

export function compareVsPastReadingHeading(reading: string): string {
  return `${reading} vs what's active now`;
}
export function compareMakeActiveLabel(reading: string): string {
  return `Make ${reading} active`;
}
export function compareKeepActiveLabel(reading: string): string {
  return `Keep ${reading} active`;
}

/**
 * The differing-lines summary beneath `ReadingCompare`'s grid. Fixed template
 * for the common newest-vs-saved case (docs/DESIGN-SYSTEM.md, verbatim example
 * "4 lines differ from what's saved: 8s, 9s, 10s, Jacks."); a second form below
 * covers the generalised any-two-readings case the design system extends the
 * component to, which has no "saved" side to name.
 */
export function compareDifferingLinesSummary(handLabels: readonly string[]): string {
  if (handLabels.length === 0) return "Every line matches what's saved.";
  const verb = handLabels.length === 1 ? "line differs" : "lines differ";
  return `${handLabels.length} ${verb} from what's saved: ${handLabels.join(", ")}.`;
}
export function compareDifferingLinesSummaryGeneral(handLabels: readonly string[]): string {
  if (handLabels.length === 0) return "Every line matches between the two readings.";
  const verb = handLabels.length === 1 ? "line differs" : "lines differ";
  return `${handLabels.length} ${verb} between the two readings: ${handLabels.join(", ")}.`;
}

export function wrongColumnWarningTitle(sheetPlayer: string, assignedPlayer: string): string {
  return `This looks like ${sheetPlayer}'s column, not ${assignedPlayer}'s.`;
}
export const WRONG_COLUMN_WARNING_MESSAGE =
  "The close-up's own reading of the name doesn't match — you can use the new numbers anyway.";

export function typedCellDisagreementSentence(typed: number, read: number): string {
  return `You typed ${typed}; the close-up reads ${read}.`;
}

export function incompleteCloseupNote(
  player: string,
  filled: number,
  expected: number = HANDS_PER_GAME,
): string {
  return `Keeping this leaves ${player}'s column at ${columnStatusLabel(filled, expected)} — ${SAVE_BUTTON_LABEL} stays blocked until it's filled in.`;
}
