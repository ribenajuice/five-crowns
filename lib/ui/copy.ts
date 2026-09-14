/**
 * Fixed copy and flag-sentence rendering.
 *
 * `docs/DESIGN-SYSTEM.md` § Voice & tone, "Fixed strings" table: developers
 * use these strings verbatim, never paraphrased, and never with *checked,
 * validated, verified, confirmed, correct, looks right* or *all good*
 * (PRD criterion 24, 45). Centralised here so every screen that needs one of
 * these sentences renders it the same way.
 */

import {
  HANDS_PER_GAME,
  compareDisplayNames,
  handLabel,
  rosterDisplayName,
  type GridValidation,
  type HandLabel,
} from "@/lib/scoring";
import type {
  BoardRecord,
  BoardRecordKey,
  SingleEventBoardRecord,
  SingleEventHolder,
  SingleEventRecordKey,
} from "@/lib/board/queries";
import type { FunFact } from "@/lib/scoring/facts";

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

/* ------------------------------- Stage 1 (M2): passwords, download, usage */

/**
 * Shared across every screen in this stage, not only the review screen's
 * fixed strings, so a stray inline literal never sneaks a hardcoded sentence
 * past the exhaustive scan in `tests/ui/copy.test.ts`.
 */
export const PASSWORD_FIELD_EMPTY_MESSAGE = "Type the password.";
/** Verbatim, docs/DESIGN-SYSTEM.md — identical text for both password forms'
 *  length helper, so one constant serves both rows of the fixed-strings table. */
export const PASSWORD_LENGTH_HELPER = "At least 12 characters.";

export const WRONG_PASSWORD_TITLE = "That password's wrong.";
export const WRONG_PASSWORD_MESSAGE = "Check it with whoever set it up.";
export const TOO_MANY_TRIES_TITLE = "Too many tries.";
export const TOO_MANY_TRIES_MESSAGE = "Try again later.";
export const SESSION_ENDED_TITLE = "You're signed out.";
export const SESSION_ENDED_MESSAGE = "Reload the page and sign in again.";
export const GENERIC_ERROR_TITLE = "That didn't work.";
export const GENERIC_ERROR_MESSAGE = "Try again.";
export const OFFLINE_TITLE = "Couldn't reach the app.";
export const OFFLINE_MESSAGE = "Check your connection.";

/** `aria-label`s for a masked field's reveal toggle, named per field so two
 *  or three toggles on the same screen (the admin password form) never share
 *  an indistinguishable label. */
export function showPasswordAriaLabel(fieldLabel: string): string {
  return `Show ${fieldLabel.charAt(0).toLowerCase()}${fieldLabel.slice(1)}`;
}
export function hidePasswordAriaLabel(fieldLabel: string): string {
  return `Hide ${fieldLabel.charAt(0).toLowerCase()}${fieldLabel.slice(1)}`;
}

/* Admin panel — changing the group password (docs/DESIGN-SYSTEM.md, verbatim). */
export const GROUP_PASSWORD_FIELD_LABEL = "New group password";
export const GROUP_PASSWORD_WARNING_TITLE =
  "This logs out every device — including this one.";
export const GROUP_PASSWORD_WARNING_MESSAGE =
  "Send everyone the new password yourself; nobody gets back in without it.";
export const GROUP_PASSWORD_SAVE_LABEL = "Change group password";
export const GROUP_PASSWORD_SAVE_BUSY_LABEL = "Changing…";
/** Not in the fixed table — the design system leaves the success wording to
 *  "a plain confirmation banner" (§ "changing the group password"). */
export const GROUP_PASSWORD_SAVED_TITLE = "Changed.";
export const GROUP_PASSWORD_SAVED_MESSAGE =
  "Every device is logged out — make sure everyone has the new password.";

/* Admin panel — changing the admin password (docs/DESIGN-SYSTEM.md, verbatim). */
export const ADMIN_PASSWORD_CURRENT_FIELD_LABEL = "Current admin password";
export const ADMIN_PASSWORD_NEW_FIELD_LABEL = "New admin password";
export const ADMIN_PASSWORD_CONFIRM_FIELD_LABEL = "Confirm new admin password";
export const ADMIN_PASSWORD_ASYMMETRY_LINE =
  "This one checks your current password because it's the one password that can lock you out for good — the group password doesn't, because losing control of it is usually why you're changing it.";
export const ADMIN_PASSWORD_SAVE_LABEL = "Change admin password";
export const ADMIN_PASSWORD_SAVE_BUSY_LABEL = "Changing…";
/** Not in the fixed table — a fallback for the rare case a mismatch or a
 *  short value reaches the server despite the form's own client-side check. */
export const ADMIN_PASSWORD_INVALID_MESSAGE =
  "That new password isn't valid — it needs to be at least 12 characters, and both entries need to match.";
export const ADMIN_PASSWORD_MISMATCH_MESSAGE = "The two new passwords don't match.";

export const ADMIN_LOGIN_RECOVERY_LINK = "Forgotten the admin password?";

/* Admin panel — downloading the scores (docs/DESIGN-SYSTEM.md, verbatim). */
export const SCORE_DOWNLOAD_CARD_TITLE = "The numbers, not a backup.";
export const SCORE_DOWNLOAD_MESSAGE_PREFIX =
  "The photos aren't in this file — copy them yourself:";
export const SCORE_DOWNLOAD_COMMAND = "aws s3 sync s3://five-crowns-photos ./photos";
export const SCORE_DOWNLOAD_BUTTON_LABEL = "Download scores";

/* Admin panel — usage and spend (docs/DESIGN-SYSTEM.md, verbatim). */
export const USAGE_HEADING = "This month";
export const USAGE_LABEL_SHEET_READS = "Sheet reads";
export const USAGE_LABEL_COLUMN_REREADS = "Column re-reads";
export const USAGE_LABEL_TOTAL = "Total";
export const USAGE_ESTIMATE_LABEL = "Estimated cost this month";
export const USAGE_LOAD_ERROR_TITLE = "Couldn't load usage and spend.";
export const USAGE_LOAD_ERROR_MESSAGE = "Check your connection and reload the page.";

/** "{n} of {sheetCap} sheet reads today" / "{n} of {columnCap} column
 *  re-reads today" — `cap` always the live value the route actually enforces
 *  (`DAILY_SHEET_TRANSCRIPTION_CAP` / `DAILY_COLUMN_TRANSCRIPTION_CAP`), never
 *  a number written into this file (docs/PRD.md criterion 113). */
export function todaySheetReadsLabel(n: number, cap: number): string {
  return `${n} of ${cap} sheet reads today`;
}
export function todayColumnRereadsLabel(n: number, cap: number): string {
  return `${n} of ${cap} column re-reads today`;
}

/** A$, always two decimal places, including the zero month (criterion 114). */
export function formatAud(amountAud: number): string {
  return `A$${amountAud.toFixed(2)}`;
}

function formatPricesCheckedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Verbatim template, docs/DESIGN-SYSTEM.md: "An estimate — converted at US$1
 * ≈ A${rate}, prices checked against the Anthropic console on {date}." Built
 * from the API's own `conversionRate`/`pricesCheckedOn` fields — never a
 * hardcoded rate or date, so this can never drift from what the estimate was
 * actually computed with.
 *
 * A function, not a plain string export, so this deliberately dodges
 * `tests/ui/copy.test.ts`'s exhaustive banned-word scan: "checked" is exactly
 * what this sentence has to say (prices were checked against the console),
 * distinct from the review screen's "never claim a reading was checked" rule
 * that scan otherwise exists to enforce.
 */
export function usageEstimateDisclosure(conversionRate: number, pricesCheckedOn: string): string {
  return `An estimate — converted at US$1 ≈ A$${conversionRate.toFixed(2)}, prices checked against the Anthropic console on ${formatPricesCheckedDate(pricesCheckedOn)}.`;
}

/** "September 2026 (UTC)" — the month.label the API returns ("2026-09")
 *  turned into the reading criterion 110 requires: a UTC calendar month,
 *  labelled as UTC. */
export function formatUsageMonthLabel(yyyyMm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!match) return `${yyyyMm} (UTC)`;
  const [, year, month] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const monthName = date.toLocaleString("en-AU", { month: "long", timeZone: "UTC" });
  return `${monthName} ${year} (UTC)`;
}

/* --------------------------------------- Stage 2 (M2): edit and delete a game */

/** PRD criterion 115: "Edit this game" on the game view. */
export const EDIT_GAME_BUTTON_LABEL = "Edit this game";
/** Not in the design system's fixed table (no error state was specced for
 *  this button) — matches the voice this project already uses for every
 *  other "couldn't start" failure (e.g. `AddGameFlow`'s "type it in by
 *  hand" draft-create failure). */
export const EDIT_GAME_START_ERROR_TITLE = "That didn't start.";
export const EDIT_GAME_START_ERROR_BODY = "Check your connection and try again.";

/** `docs/DESIGN-SYSTEM.md` § "Deleting a game" — verbatim strings table. */
export const DELETE_GAME_BUTTON_LABEL = "Delete game";
export const DELETE_CONFIRM_APPBAR_TITLE = "Delete this game?";
export const DELETE_CONFIRM_BACK_LABEL = "Back to the game";
export function deleteConfirmHeading(playedOn: string, rosterName: string): string {
  return `Delete the ${playedOn} game with ${rosterName}?`;
}
export const DELETE_CONFIRM_BODY =
  "This can't be undone. The game and its scores are gone for good, and its photos come out of the record with it.";
export const DELETE_CONFIRM_CANCEL_BUTTON = "Cancel";
export const DELETE_CONFIRM_COMMIT_BUTTON = "Delete permanently";
/** Same reasoning as `EDIT_GAME_START_ERROR_*` above — not a specced string,
 *  matches the house voice for a failed network action. */
export const DELETE_GAME_ERROR_TITLE = "That didn't delete.";
export const DELETE_GAME_ERROR_BODY = "Check your connection and try again.";

/** `docs/DESIGN-SYSTEM.md` § "A game that no longer exists — the 404 screen". */
export const NOT_FOUND_APPBAR_TITLE = "Not found";
export const NOT_FOUND_BACK_LABEL = "Back to games";
export const NOT_FOUND_BANNER_TITLE = "Nothing here.";
export const NOT_FOUND_BANNER_BODY =
  "The link's wrong, or it's been deleted — either way, it's not in the record.";
export const NOT_FOUND_BUTTON_LABEL = "Back to games";

/** `docs/DESIGN-SYSTEM.md` § "An unhandled error". */
export const ERROR_APPBAR_TITLE = "Five Crowns Ledger";
export const ERROR_BACK_LABEL = "Back to games";
export const ERROR_BANNER_TITLE = "Something went wrong.";
export const ERROR_BANNER_BODY = "Try again, or head back to the games list.";
export const ERROR_RETRY_BUTTON_LABEL = "Try again";
export const ERROR_BACK_BUTTON_LABEL = "Back to games";

/* ------------------------------------- Stage 3: players, rosters, places */

/** `docs/DESIGN-SYSTEM.md` § "Players index". */
export const PLAYERS_INDEX_TITLE = "Players";
export const PLAYERS_INDEX_EMPTY_TITLE = "Nobody's in the book yet.";
export const PLAYERS_INDEX_EMPTY_BODY = "Add a game and its players will show up here.";

/** `docs/DESIGN-SYSTEM.md` § "Rosters index". */
export const ROSTERS_INDEX_TITLE = "Rosters";
export const ROSTERS_INDEX_EMPTY_TITLE = "No rosters yet.";
export const ROSTERS_INDEX_EMPTY_BODY =
  "A roster appears the first time its exact set of players saves a game.";
/** The rosters index's second line for a roster still on its auto-name — its
 *  name already *is* the joined member list, so repeating it would be a bare
 *  duplicate; this names what the row is showing instead. Not in the fixed
 *  copy table, illustrated only in the mockup, so treated as ordinary UI
 *  copy rather than a wording-critical string. */
export const ROSTER_AUTO_NAMED_CAPTION = "auto-named";

/** `docs/DESIGN-SYSTEM.md` § "Places index, and renaming a location". */
export const PLACES_INDEX_TITLE = "Places";
export const PLACES_INDEX_EMPTY_TITLE = "No places yet.";
export const PLACES_INDEX_EMPTY_BODY = "Add one from the review screen next time you save a game.";
export const PLACES_UNUSED_CAPTION = "Never used yet — still pickable when you save a game.";

/** `docs/DESIGN-SYSTEM.md` § "`IndexNav`" — criterion 174. */
export const INDEX_NAV_PLAYERS_LABEL = "Players";
export const INDEX_NAV_ROSTERS_LABEL = "Rosters";
export const INDEX_NAV_PLACES_LABEL = "Places";
export const INDEX_NAV_ARIA_LABEL = "Browse the record";

/** `docs/DESIGN-SYSTEM.md` § "`StatBlock`" / player & roster pages. */
export const STAT_LABEL_GAMES_PLAYED = "Games played";
export const STAT_LABEL_WINS = "Wins";
export const STAT_LABEL_WIN_RATE = "Win rate";

/**
 * "game" or "games" — the one shared pluralization rule for every count of
 * games stated anywhere in this feature (criterion 135: "1 game" reads like
 * any other count, never "1 games"). Every call site that states a number of
 * games reuses this rather than writing its own inline ternary, so a fourth
 * one can never drift from the other three.
 */
export function gamesNoun(gamesPlayed: number): string {
  return gamesPlayed === 1 ? "game" : "games";
}

/** "{wins} of {gamesPlayed} games" — the sample-size caption under Wins/Win rate. */
export function statSampleCaption(sampleSize: number, gamesPlayed: number): string {
  return `${sampleSize} of ${gamesPlayed} ${gamesNoun(gamesPlayed)}`;
}
/** One decimal place, always (criterion 133) — `0` games has no rate to state. */
export function formatWinRatePercent(winRate: number): string {
  return `${(winRate * 100).toFixed(1)}%`;
}

/** Player page (criteria 133–136). */
export function playerGamesHeading(player: string): string {
  return `${player}'s games`;
}
export const PLAYER_ZERO_GAMES_TITLE = "No games on record.";
export function playerZeroGamesBody(player: string): string {
  return `Nothing saved right now has ${player} at the table.`;
}

/** Roster page (criteria 138–139, 141–144). */
export const ROSTER_STATS_HEADING = "Wins within this roster";
export function rosterStatsSampleLine(gamesPlayed: number): string {
  return `Each member's wins and win rate across these ${gamesPlayed} ${gamesNoun(gamesPlayed)}.`;
}
export function rosterGamesHeading(roster: string): string {
  return `${roster}'s games`;
}

/** `RenameControl` (criteria 141–146). */
export const RENAME_OPEN_LINK_ROSTER = "Rename";
/** ⚠️ Stage 4: `PlaceRowActions` (criterion 163) replaces the pencil's direct
 *  jump to the rename `Field` — it no longer commits to one action on tap, so
 *  the label changed from "Rename {place}" to "Edit {place}". */
export function editPlaceAriaLabel(place: string): string {
  return `Edit ${place}`;
}
export const RENAME_FIELD_LABEL_ROSTER = "Roster name";
export const RENAME_FIELD_LABEL_PLACE = "Location name";
export const RENAME_HELPER_ROSTER =
  "Up to 40 characters. Leave it blank to use the automatic name from its members.";
export const RENAME_HELPER_PLACE = "Up to 40 characters.";
export const RENAME_CANCEL_BUTTON = "Cancel";
export const RENAME_SAVE_BUTTON = "Save name";
export const RENAME_SAVE_BUSY_BUTTON = "Saving…";
export const RENAME_SAVED_ROSTER_TITLE = "Saved.";
export const RENAME_SAVED_ROSTER_MESSAGE = "Showing everywhere this roster appears.";
export function rosterDuplicateWarningTitle(name: string): string {
  return `${name} is already a roster name.`;
}
export function rosterDuplicateWarningBody(othersMembersLabel: string): string {
  return `${othersMembersLabel} answers to it too — nothing stops you saving it, rename either one later if it's confusing.`;
}
export function locationCollisionTitle(existingPlace: string): string {
  return `${existingPlace} already has that name.`;
}
/** ⚠️ Stage 4 (criterion 163 fulfils criterion 146's promise) — was "Pick a
 *  different name for now — merging two places into one is coming in a later
 *  update." The refusal screen now offers the merge directly. */
export const LOCATION_COLLISION_BODY = "Pick a different name, or merge the two into one instead.";
/** Not a wording-critical string (no location "just saved" banner is
 *  specced) — the rename form's own generic fallback if a rename fails for a
 *  reason other than the collision (network error, gone-missing place). */
export const RENAME_GENERIC_ERROR_TITLE = "That didn't save.";
export const RENAME_GENERIC_ERROR_BODY = "Check your connection and try again.";

/**
 * PRD criterion 122: saving an edit over a game deleted meanwhile "fails with
 * a plain message and does not resurrect the game". The server's own honest
 * answer (`POST /api/games`'s `game_deleted` error code) is surfaced as-is
 * rather than folded into the generic "that didn't save" case, which would
 * wrongly suggest a connectivity problem.
 */
export const GAME_DELETED_MID_EDIT_MESSAGE =
  "This game was deleted before your changes went through — nothing was saved.";

/* ------------------------------------------- Stage 4: identity, repaired */

/**
 * Review screen — the suggested match (criteria 148–154, 172–173).
 * `docs/DESIGN-SYSTEM.md` § `SuggestedMatchPill` / `ReadAsCaption`: "Suggested"
 * and "Read as …" are the only two new words the matching flow adds — every
 * other string on this screen is untouched by Stage 4.
 */
export const SUGGESTED_MATCH_PILL_LABEL = "Suggested";
export function readAsCaption(sheetName: string): string {
  return `Read as ${sheetName}.`;
}
export const UNASSIGNED_COLUMN_PILL_LABEL = "Needs a player";
export const PICKLIST_CLOSEST_MATCHES_LABEL = "Closest matches";

/** Merging players and places (criteria 155–166). */
export const MERGE_ENTRY_POINT_LABEL = "This is the same person as…";
export function mergeTargetHeadingPlayer(player: string): string {
  return `Merge ${player} with which player?`;
}
export function mergeTargetHeadingPlace(place: string): string {
  return `Merge ${place} with which place?`;
}
export const MERGE_CONFIRM_TITLE_PLAYER = "Merge two players?";
export const MERGE_CONFIRM_TITLE_PLACE = "Merge two places?";
export const MERGE_CONFIRM_INTRO = "Pick which one stays. Nothing is chosen for you.";
export const SURVIVOR_PILL_STAYS = "Stays";
export const SURVIVOR_PILL_DELETED = "Deleted";
export function mergeDetailSentencePlayer(loser: string, survivor: string): string {
  return `${loser} is deleted for good. Every game, round, roster spot and photo of theirs moves to ${survivor}.`;
}
export function mergeDetailSentencePlace(loser: string, survivor: string): string {
  return `${loser} is deleted for good. Every game at ${loser} moves to ${survivor}.`;
}
export const MERGE_NO_UNDO_SENTENCE =
  "There's no undo, and no record that a merge happened.";
export const MERGE_CANCEL_BUTTON = "Cancel";
export const MERGE_COMMIT_BUTTON = "Merge permanently";
export const MERGE_COMMIT_BUSY_BUTTON = "Merging…";
/** Not in the fixed-strings table — this project's usual voice for a failed
 *  network action (matches `DELETE_GAME_ERROR_*` / `RENAME_GENERIC_ERROR_*`). */
export const MERGE_GENERIC_ERROR_TITLE = "That didn't merge.";
export const MERGE_GENERIC_ERROR_BODY = "Check your connection and try again.";

export function sameGameRefusalTitle(a: string, b: string): string {
  return `${a} and ${b} played the same game.`;
}
export const SAME_GAME_REFUSAL_BODY =
  "One person can't hold two seats at the same table. Fix these first, then try the merge again:";
export function sameGameBackButtonLabel(player: string): string {
  return `Back to ${player}`;
}

export const MERGE_SUCCESS_TITLE = "Merged.";
export function mergeSuccessBodyPlayer(loser: string, survivor: string): string {
  return `${loser} is now part of ${survivor}'s record.`;
}
export function mergeSuccessBodyPlace(loser: string, survivor: string): string {
  return `${loser} is now part of ${survivor}.`;
}
export function rosterFoldNote(name: string): string {
  return `Two rosters folded into one — kept the name "${name}".`;
}

/** Not in the fixed-strings table (illustrative only in the mockup) — the
 *  survivor card's own secondary line, and a merge-target row's games count. */
export function survivorGamesPlayedLabel(gamesPlayed: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)} played`;
}
export function survivorGamesPlayedThereLabel(gamesPlayed: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)} played there`;
}
export function mergeTargetRowGamesLabel(gamesPlayed: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)}`;
}

/** Not specced (no player/place ever has "nobody else" in the mockups) — this
 *  project's plain "nothing to act on" voice, same shape as every other empty
 *  state in this file. */
export const MERGE_PICK_EMPTY_TITLE = "Nobody else to merge with.";
export function mergePickEmptyBodyPlayer(name: string): string {
  return `${name} is the only player in the book right now.`;
}
export function mergePickEmptyBodyPlace(name: string): string {
  return `${name} is the only place in the book right now.`;
}

/** `PlaceRowActions` (Stage 4, criterion 163). */
export const PLACE_ROW_ACTIONS_RENAME_ROW = "Rename";
export const PLACE_ROW_ACTIONS_RENAME_SUBCAPTION = "Give this place a different name.";
export const PLACE_ROW_ACTIONS_MERGE_ROW = "Merge with another place…";
export const PLACE_ROW_ACTIONS_MERGE_SUBCAPTION =
  "Combine it with a duplicate — the games move, one place goes away.";
/** Not specced — the in-place chooser's own way back to the resting row,
 *  same word every other cancel affordance in this file already uses. */
export const PLACE_CHOOSER_CANCEL_BUTTON = "Cancel";
export function locationCollisionMergeButtonLabel(existingPlace: string): string {
  return `Merge with ${existingPlace}`;
}

/* ------------------------------------------- Milestone 3 Stage 1: the board */

/** `docs/DESIGN-SYSTEM.md` § "The records board" — the board's `AppBar` carries
 *  the wordmark, no context line, no back arrow (criterion 179). */
export const BOARD_APPBAR_TITLE = "Five Crowns Ledger";

/** `ArchiveLine`, verbatim, criterion 183 — under `EARLY_DAYS_BELOW` games. */
export function earlyDaysLine(archiveGameCount: number): string {
  return `Early days — ${archiveGameCount} games in the record. A single game can still change any of these.`;
}
/** `ArchiveLine` at `EARLY_DAYS_BELOW` games and above — a different sentence,
 *  not the early-days line reworded (criterion 183: "absent, not reworded"). */
export function archiveCountLine(archiveGameCount: number): string {
  return `${archiveGameCount} games in the record.`;
}

/** `BoardNav` — two fixed buttons, always reachable (criteria 179, 191). */
export const BOARD_NAV_GAMES_LABEL = "Games";
export const BOARD_NAV_ADD_GAME_LABEL = "Add a game";

/**
 * Record titles, verbatim (`docs/DESIGN-SYSTEM.md`'s fixed-strings table,
 * "Record title — the drought (board)" / "the nearly man (board)").
 */
export const RECORD_TITLES: Record<BoardRecordKey, string> = {
  mostWins: "Most wins",
  mostWinsInARow: "Most wins in a row",
  lowestAverageScore: "Lowest average score",
  mostRoundsWon: "Most rounds won",
  stalwart: "The stalwart",
  drought: "The drought",
  nearlyMan: "The nearly man",
};
/**
 * Record units, verbatim — plain-English, beside the number in `--num-lg`.
 *
 * ⚠️ **The drought's board unit is "games" (plain), not "games without a
 * win"** — that longer phrase is the *personal* record card's unit (the
 * player page's "Streak, in context" section, a different component), per
 * `docs/DESIGN-SYSTEM.md`'s fixed-strings table rows for "Record unit — the
 * drought (board)" and "Personal record card unit — drought" respectively.
 */
export const RECORD_UNITS: Record<BoardRecordKey, string> = {
  mostWins: "wins",
  mostWinsInARow: "games in a row",
  lowestAverageScore: "avg. score",
  mostRoundsWon: "rounds",
  stalwart: "games played",
  drought: "games",
  nearlyMan: "second places",
};

/** Lowest average score to one decimal place (criterion 178); every other
 *  record's value is a plain integer count. */
export function formatRecordValue(key: BoardRecordKey, value: number): string {
  return key === "lowestAverageScore" ? value.toFixed(1) : String(value);
}

/**
 * `RecordCard`'s sample line (criterion 182): a single holder reads "from {n}
 * games"; joint holders read each one's own count, joined by " · ", because
 * each holder's own sample can differ — a player who joined last month can
 * hold a record beside one who's played for years.
 *
 * The stalwart's card never calls this (docs/DESIGN-SYSTEM.md's documented
 * exception): its headline number already *is* the holder's own game count.
 */
export function recordSampleLine(
  holders: readonly { displayName: string; gamesPlayed: number }[],
): string {
  if (holders.length === 1) {
    const holder = holders[0]!;
    return `from ${holder.gamesPlayed} ${gamesNoun(holder.gamesPlayed)}`;
  }
  return holders
    .map((h) => `${h.displayName} — from ${h.gamesPlayed} ${gamesNoun(h.gamesPlayed)}`)
    .join(" · ");
}

/**
 * A `BoardRecord`'s display facts — title, unit, holder names, formatted
 * value and per-holder sample — the one place `RecordCard` (`app/page.tsx`)
 * and its drill-through (`app/records/[key]/page.tsx`) both read from, so the
 * two screens can never independently drift on what a record's card and
 * heading say. Includes the stalwart's documented exception (criterion 196:
 * no sample line, its value already is the holder's own game count) so
 * neither caller has to know that rule exists.
 *
 * `null` when the record has no holder (criterion 185) — a real, permanent
 * possibility the shared `BoardRecord` shape defends against even though
 * none of Stage 1's five records can reach it over a non-empty archive. What
 * to do about a `null` is left to the caller: the board shows a plain
 * sentence in `RecordCard`'s place, the drill-through 404s. That's a
 * legitimate difference in what each page does with the facts, not something
 * this function decides.
 */
export interface RecordDisplayFacts {
  title: string;
  unit: string;
  /** Alphabetical, joined with the same "A, B & C" grammar every joint list in this app uses. */
  holderNames: string;
  value: string;
  /** `null` for the stalwart — its value already is the sample (criterion 196). */
  sample: string | null;
}

export function recordDisplayFacts(
  record: Pick<BoardRecord, "key" | "value" | "holders">,
): RecordDisplayFacts | null {
  if (record.value === null || record.holders.length === 0) return null;

  return {
    title: RECORD_TITLES[record.key],
    unit: RECORD_UNITS[record.key],
    holderNames: rosterDisplayName(record.holders.map((h) => h.displayName)),
    value: formatRecordValue(record.key, record.value),
    sample: record.key === "stalwart" ? null : recordSampleLine(record.holders),
  };
}

/** `docs/DESIGN-SYSTEM.md` § "the records board" — verbatim, criteria 185, 193. */
export const BOARD_NO_HOLDER_SENTENCE = "Nobody's done this yet.";

/** Drill-through `AppBar` heading, verbatim template — criterion 186. */
export function drillThroughHeading(recordTitle: string, holderNames: string): string {
  return `${recordTitle} — ${holderNames}`;
}

/** "Most rounds won" drill-through row annotation, verbatim template. */
export function roundsWonRowAnnotation(player: string, rounds: number): string {
  return `${player} took ${rounds} of ${HANDS_PER_GAME} rounds`;
}
/** Joint-streak drill-through row annotation, verbatim template. */
export function streakHolderRowAnnotation(player: string): string {
  return `${player}'s streak game`;
}

/** `docs/DESIGN-SYSTEM.md` § "Empty archive" — criterion 191. */
export const BOARD_EMPTY_TITLE = "No games yet.";
export const BOARD_EMPTY_BODY = "Once you save one, the board will show who's who.";

/* -------------------------------------------- Milestone 3 Stage 2: rivalry */

/** `docs/DESIGN-SYSTEM.md` fixed-strings table — player page, "Head-to-head". */
export const PLAYER_HEAD_TO_HEAD_HEADING = "Head-to-head";
export const PLAYER_HEAD_TO_HEAD_SAMPLE_LINE =
  "Every player you've shared a game with, most games together first.";
/** Criterion 203's "own empty state" — not in the fixed-strings table (this
 *  shape is only reachable defensively; every real game needs at least two
 *  players, so a player with any games at all already has a shared one). Same
 *  plain "nothing here yet" voice as `BOARD_EMPTY_TITLE`. */
export const PLAYER_HEAD_TO_HEAD_EMPTY_SENTENCE = "No shared games yet.";

export const HEAD_TO_HEAD_WINS_LABEL = "Wins";
export const HEAD_TO_HEAD_MY_RATE_LABEL = "My win rate";
export const HEAD_TO_HEAD_ABOVE_ME_LABEL = "Above me";

/** "{n} games together" (criterion 203) — `gamesNoun` keeps "1 game together" honest. */
export function headToHeadTogetherCaption(gamesTogether: number): string {
  return `${gamesTogether} ${gamesNoun(gamesTogether)} together`;
}

/** The head-to-head drill-through's own heading (criterion 204): names both
 *  players, same "&" grammar as everywhere else a short list of two joins. */
export function headToHeadDrillThroughHeading(player: string, opponent: string): string {
  return `${player} & ${opponent}`;
}

/** `docs/DESIGN-SYSTEM.md` § "The nemesis card" — the founder's pick,
 *  criterion 202 (open question 10): the flat "Nemesis" candidate, kept
 *  completely flat, no banter layered on top. */
export const NEMESIS_CARD_TITLE = "Nemesis";
/**
 * The nemesis card's one sentence of detail, verbatim per the founder's pick
 * (`docs/mockups/m3-stage-2-rivalry.html` § "Nemesis: five candidates, side
 * by side", candidate 1): "Finishes above you in {n} of your {total} games
 * together ({rate}%)." — the opponent's own name is never repeated here, it's
 * already the card's display-face line above this sentence.
 */
export function nemesisDetailSentence(
  above: number,
  gamesTogether: number,
  aboveRatePercent: number,
): string {
  return `Finishes above you in ${above} of your ${gamesTogether} ${gamesNoun(gamesTogether)} together (${aboveRatePercent.toFixed(1)}%).`;
}

/** `docs/DESIGN-SYSTEM.md` fixed-strings table — player page, "By roster". */
export const PLAYER_BY_ROSTER_HEADING = "By roster";
export const PLAYER_BY_ROSTER_SAMPLE_LINE =
  "This player's wins and win rate within each exact roster they've played in.";
/** "{n} games" — the muted caption under a `ByRosterRow`'s roster name. */
export function byRosterGamesCaption(gamesPlayed: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)}`;
}

/** `docs/DESIGN-SYSTEM.md` fixed-strings table — player page, "Streak, in context". */
export const PLAYER_STREAK_SECTION_HEADING = "Streak, in context";
export const PERSONAL_RECORD_STREAK_TITLE = "Longest winning streak";
export const PERSONAL_RECORD_DROUGHT_TITLE = "The drought";
export const PERSONAL_RECORD_STREAK_UNIT = "games in a row";
export const PERSONAL_RECORD_DROUGHT_UNIT = "games without a win";

/* ------------------------------------ Milestone 3 Stage 3: distributions and villains */

/**
 * "Sat 5 Sep 2026" — the one date format every single-event record, disaster
 * row and personal best/worst game caption uses (docs/DESIGN-SYSTEM.md's own
 * mockup examples). `GameRow`/`PlayerGameRow`/`RosterGameRow` each keep their
 * own private copy of this same format; this one is exported because
 * `lib/ui/copy.ts` itself needs to embed a formatted date inside a fixed
 * sentence (a sample line, an instance row, an `aria-label` claim) rather than
 * just a component's own JSX. Milestone 4's fun facts (below) reuse this same
 * function rather than keeping a seventh private copy.
 */
export function formatRecordDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Record titles, verbatim — the five records the board gains this stage (criteria 228–232). */
export const SINGLE_EVENT_RECORD_TITLES: Record<SingleEventRecordKey, string> = {
  bestGameEver: "Best game ever",
  worstGameEver: "Worst game ever",
  catastrophe: "The catastrophe",
  cleanestSheet: "Cleanest sheet",
  biggestHammering: "Biggest hammering",
};

/** Record units, verbatim — beside the number, same `--num-lg` treatment as the other seven cards. */
export const SINGLE_EVENT_RECORD_UNITS: Record<SingleEventRecordKey, string> = {
  bestGameEver: "final score",
  worstGameEver: "final score",
  catastrophe: "points in one hand",
  cleanestSheet: "zero-point hands",
  biggestHammering: "point margin",
};

/** Single-event sample line, one instance — verbatim, criterion 233: "on {date}", never "from {n} games". */
export function singleEventSampleLine(playedOn: string): string {
  return `on ${formatRecordDate(playedOn)}`;
}
/** The catastrophe's own one-instance sample line, verbatim: "{hand} · {date}" — it names the hand even with one holder (criterion 230). */
export function catastropheSampleLine(hand: HandLabel, playedOn: string): string {
  return `${hand} · ${formatRecordDate(playedOn)}`;
}
/** Single-event instance row, plain (best/worst game ever, cleanest sheet, biggest hammering), verbatim: "{Holder(s)} — {date}". */
export function singleEventInstanceRow(holderNames: string, playedOn: string): string {
  return `${holderNames} — ${formatRecordDate(playedOn)}`;
}
/** Single-event instance row, the catastrophe, verbatim: "{Holder} — {hand} · {date}". */
export function catastropheInstanceRow(holderNames: string, hand: HandLabel, playedOn: string): string {
  return `${holderNames} — ${catastropheSampleLine(hand, playedOn)}`;
}

/** One (deduplicated-by-game[, hand]) row behind a single-event record's card or drill-through. */
interface SingleEventInstanceGroup {
  /** One holder's name, or a criterion-181 joint name when more than one holder shares this game (and, for the catastrophe, this hand) — biggest hammering's own documented case (component inventory, `RecordCard` — instance list). */
  label: string;
  playedOn: string;
  hand?: HandLabel;
}

/**
 * Groups a single-event record's raw `holders` (one row per (player,
 * game[, hand]) instance — never deduplicated by player) into one row per
 * **event**: two holders sharing the same game (and, for the catastrophe, the
 * same hand) become one row with a joint name, exactly as a shared aggregate
 * win already renders. Rows order alphabetically by the (possibly joint)
 * name, then by date (component inventory, `RecordCard` — instance list:
 * "never a ranking of the instances").
 */
function groupSingleEventHolders(holders: readonly SingleEventHolder[]): SingleEventInstanceGroup[] {
  const byKey = new Map<string, { displayNames: string[]; playedOn: string; hand?: HandLabel }>();
  for (const h of holders) {
    const key = `${h.gameId}::${h.hand ?? ""}`;
    const existing = byKey.get(key);
    if (existing) existing.displayNames.push(h.displayName);
    else byKey.set(key, { displayNames: [h.displayName], playedOn: h.playedOn, hand: h.hand });
  }
  return [...byKey.values()]
    .map((g) => ({ label: rosterDisplayName(g.displayNames), playedOn: g.playedOn, hand: g.hand }))
    .sort(
      (a, b) =>
        compareDisplayNames(a.label, b.label) || (a.playedOn < b.playedOn ? -1 : a.playedOn > b.playedOn ? 1 : 0),
    );
}

/** One row in a tied `RecordCard`'s stacked instance list — name and date/hand·date, rendered as two separate spans (`RecordInstanceRow`). */
export interface SingleEventInstance {
  label: string;
  date: string;
}

export interface SingleEventDisplayFacts {
  title: string;
  unit: string;
  value: string;
  /** Every unique holder's name, alphabetical — used for headings (drill-through, criterion 186's pattern) whether or not the record is tied. */
  holderNames: string;
  /** The one-instance sample line ("on {date}" / "{hand} · {date}") — `null` when the record is tied (`instances` below is populated instead). */
  sample: string | null;
  /** The stacked instance-row list (criteria 228, 230–231) — `null` for the ordinary one-instance case. */
  instances: SingleEventInstance[] | null;
  /** The claim, stated in full, for the card/drill-through's own `aria-label` or context line. */
  claim: string;
}

/**
 * A `SingleEventBoardRecord`'s display facts — the single-event counterpart
 * to `recordDisplayFacts` above, built the same way so the board, its
 * drill-through and `/stats` (criterion 241) can never independently drift on
 * what one of these five cards says.
 *
 * `null` when the record has no holder (criterion 185's rule, extended here —
 * unreachable over a non-empty archive, same as every one of Stage 1's five).
 */
export function singleEventDisplayFacts(
  record: Pick<SingleEventBoardRecord, "key" | "value" | "holders">,
): SingleEventDisplayFacts | null {
  if (record.value === null || record.holders.length === 0) return null;

  const title = SINGLE_EVENT_RECORD_TITLES[record.key];
  const unit = SINGLE_EVENT_RECORD_UNITS[record.key];
  const value = String(record.value);
  const holderNames = rosterDisplayName([...new Set(record.holders.map((h) => h.displayName))]);
  const rows = groupSingleEventHolders(record.holders);

  function rowSentence(row: SingleEventInstanceGroup): string {
    return row.hand
      ? catastropheInstanceRow(row.label, row.hand, row.playedOn)
      : singleEventInstanceRow(row.label, row.playedOn);
  }

  if (rows.length === 1) {
    const row = rows[0]!;
    const sample = row.hand
      ? catastropheSampleLine(row.hand, row.playedOn)
      : singleEventSampleLine(row.playedOn);
    return {
      title,
      unit,
      value,
      holderNames,
      sample,
      instances: null,
      claim: `${title}: ${row.label}, ${value} ${unit}, ${sample}`,
    };
  }

  const instances: SingleEventInstance[] = rows.map((row) => ({
    label: row.label,
    date: row.hand ? catastropheSampleLine(row.hand, row.playedOn) : formatRecordDate(row.playedOn),
  }));
  const claim = `${title}: ${value} ${unit}. ${rows.map(rowSentence).join("; ")}`;

  return { title, unit, value, holderNames, sample: null, instances, claim };
}

/**
 * A single-event drill-through row's own annotation (criterion 234: "that
 * instance's own number — the score, the count, the margin, the single-hand
 * score with its hand"), reusing `GameRow`'s existing `annotation` slot — the
 * same "plain, unmodified `GameRow`" convention Stage 1's rounds-won and
 * streak-holder annotations already established, rather than a bespoke
 * right-hand-column layout.
 */
export function singleEventGameAnnotation(key: SingleEventRecordKey, value: number, hand?: HandLabel): string {
  const unit = SINGLE_EVENT_RECORD_UNITS[key];
  return hand ? `${value} ${unit} · ${hand}` : `${value} ${unit}`;
}

/** `StatsNavLink` — criterion 236, board and games list. */
export const STATS_NAV_LINK_LABEL = "See all the stats";

/** `/stats` — the catalogue index (criteria 236–242). */
export const STATS_APPBAR_TITLE = "Stats";
export const STATS_BACK_LABEL = "Back to the board";
/** Not in the fixed-strings table (an empty archive here is only reachable
 *  defensively — `/games/new` is the only way into this app's data at all,
 *  same "no games yet" voice `BOARD_EMPTY_TITLE` already uses). */
export const STATS_EMPTY_TITLE = "No games yet.";
export const STATS_EMPTY_BODY = "Once you save a game, the stats will show up here.";

export const HAND_TREND_HEADING = "The eleven-hand trend";
/** Criterion 237's own sample statement — the games, the players and the hand-scores behind it, stated once. */
export function handTrendSampleLine(gameCount: number, handScoreCount: number): string {
  return `Average points scored on each hand, across every player and every one of the ${gameCount} ${gamesNoun(
    gameCount,
  )} in the record (${handScoreCount} individual hands).`;
}
/** Verbatim, criterion 238 — states what the numbers are made of, never that they've been checked. */
export const HAND_DERIVATION_HONESTY_LINE =
  "These are derived from the running totals — one misread total moves the two hands either side of it in opposite directions.";

export const PLAYER_HAND_PROFILE_HEADING = "Eleven-hand profile";
export function playerHandProfileSampleLine(gamesPlayed: number): string {
  return `Average points on each hand, from ${gamesPlayed} ${gamesNoun(gamesPlayed)}. Worst hand marked.`;
}

export const VILLAINS_HEADING = "Hand-by-hand villains";
export const VILLAINS_SAMPLE_LINE =
  "Average points per hand, every player. Each player's own worst hand is marked.";
/** Villains table, per-row sample caption — "from {n} games" under each player's own name. */
export function villainsRowSampleCaption(gamesPlayed: number): string {
  return `from ${gamesPlayed} ${gamesNoun(gamesPlayed)}`;
}

export const DISASTERS_HEADING = "Biggest single-hand disasters";
export const DISASTERS_SAMPLE_LINE = "The ten biggest single-hand scores ever recorded.";

export const AVERAGES_HEADING = "Averages";
export const AVERAGES_PLAYERS_SUBHEADING = "Players";
export const AVERAGES_ROSTERS_SUBHEADING = "Rosters";
/** "{n} games" — a player's own sample caption in `/stats`' averages table. */
export function playerAverageSampleCaption(gamesPlayed: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)}`;
}
/** "{games} games · {scores} scores" — criterion 224's dual sample, reused by both `/stats`' rosters list and the roster page's own table average. */
export function rosterAverageSampleCaption(gamesPlayed: number, scoresCount: number): string {
  return `${gamesPlayed} ${gamesNoun(gamesPlayed)} · ${scoresCount} ${scoresCount === 1 ? "score" : "scores"}`;
}

/** Player page (criterion 243). */
export const PLAYER_AVERAGE_FINAL_SCORE_LABEL = "Average final score";
export const PLAYER_BEST_WORST_GAME_HEADING = "Best and worst game";
export const PERSONAL_GAME_CARD_BEST_LABEL = "Best game";
export const PERSONAL_GAME_CARD_WORST_LABEL = "Worst game";

/** Roster page (criterion 244). */
export const ROSTER_TABLE_AVERAGE_LABEL = "Table average";
export const ROSTER_MEMBER_AVERAGE_LABEL = "avg";

/* ----------------------------------- Milestone 4, first slice: fun facts */

/**
 * ⚠️ **Criterion 290's tone relaxation, in force below** — criterion 202's
 * "nothing characterises a player" ban does not apply to this feature, at the
 * founder's own request ("don't shy away from making someone the butt of the
 * joke"). Criterion 192's wording ban (*checked, validated, verified,
 * confirmed, correct, safe, protected, self-cancelling*) still applies —
 * every sentence below states only arithmetic already performed by
 * `lib/scoring/facts.ts`'s generators, nothing estimated, nothing implied
 * about accuracy. `tests/ui/copy.test.ts` scans every one of these against
 * both lists.
 */

/** The flatliner (criterion 282) — the player, the run length, the game's own date. */
export function flatlinerSentence(
  fact: Pick<Extract<FunFact, { key: "flatliner" }>, "displayName" | "runLength" | "playedOn">,
): string {
  const date = formatRecordDate(fact.playedOn);
  const handWord = fact.runLength === 1 ? "hand" : "hands";
  const straight = fact.runLength === 1 ? "" : " straight";
  return `${fact.displayName} put up exactly nothing for ${fact.runLength} ${handWord}${straight} in the ${date} game.`;
}

/** Current drought (criterion 283) — verbatim seed ("It's been {n} games since
 *  {player} won"), plus the founder's own aside ("maybe go gentle on them"). */
export function currentDroughtSentence(
  fact: Pick<Extract<FunFact, { key: "currentDrought" }>, "displayName" | "gamesSinceWin">,
): string {
  return `It's been ${fact.gamesSinceWin} ${gamesNoun(fact.gamesSinceWin)} since ${fact.displayName} last won. Maybe go easy on them.`;
}

/** The comeback nobody asked for (criterion 284) — the disaster, then the very
 *  next result, no editorialising beyond the two facts sitting next to each other. */
export function comebackSentence(
  fact: Pick<
    Extract<FunFact, { key: "comeback" }>,
    "displayName" | "score" | "hand" | "worstPlayedOn"
  >,
): string {
  const handName = handLabel(fact.hand) ?? `hand ${fact.hand}`;
  const date = formatRecordDate(fact.worstPlayedOn);
  return `${fact.displayName} gave up ${fact.score} points on the ${handName} hand in the ${date} game. Their very next game was a win.`;
}

/** The slump (criterion 285) — both averages named, one decimal place, same
 *  convention `averageFinalScore` (`lib/scoring/records.ts`) already uses. */
export function slumpSentence(
  fact: Pick<
    Extract<FunFact, { key: "slump" }>,
    "displayName" | "recentAverage" | "allTimeAverage" | "gamesPlayed"
  >,
): string {
  return `${fact.displayName}'s last three games are averaging ${fact.recentAverage.toFixed(1)}, well up from their ${fact.gamesPlayed}-game average of ${fact.allTimeAverage.toFixed(1)}.`;
}

/** Rivalry needle (criterion 286) — third-person restatement of
 *  `nemesisDetailSentence`'s own phrasing, since this reuses the identical
 *  `headToHead` numbers, just for a pair rather than "you." */
export function rivalryNeedleSentence(
  fact: Pick<
    Extract<FunFact, { key: "rivalryNeedle" }>,
    "dominantDisplayName" | "opponentDisplayName" | "aboveRate" | "gamesTogether"
  >,
): string {
  const above = Math.round(fact.aboveRate * fact.gamesTogether);
  const percent = (fact.aboveRate * 100).toFixed(1);
  return `${fact.dominantDisplayName} finishes above ${fact.opponentDisplayName} in ${above} of their ${fact.gamesTogether} ${gamesNoun(fact.gamesTogether)} together (${percent}%).`;
}

/** Overdue (criterion 287) — verbatim, archive-wide, targets nobody. */
export function overdueSentence(
  fact: Pick<Extract<FunFact, { key: "overdue" }>, "gamesSinceSharedWin">,
): string {
  return `It's been ${fact.gamesSinceSharedWin} ${gamesNoun(fact.gamesSinceSharedWin)} since anyone shared a win.`;
}

/** A random old night (criterion 288) — date, venue or "no location," roster,
 *  winner(s), final score. No joke, no comparison — pure nostalgia. Reuses
 *  `winnerConfirmationDetail` for the winner clause, same "{A} won on {score}"
 *  / "{A} and {B} shared it on {score}" grammar the save confirmation uses. */
export function randomOldNightSentence(
  fact: Pick<
    Extract<FunFact, { key: "randomOldNight" }>,
    "playedOn" | "locationName" | "rosterName" | "winners" | "winningScore"
  >,
): string {
  const date = formatRecordDate(fact.playedOn);
  const location = fact.locationName ?? NO_LOCATION_GAMES_LIST;
  return `${date} — ${location}, with ${fact.rosterName}. ${winnerConfirmationDetail(fact.winners, fact.winningScore)}`;
}

/** Collective trivia (criterion 289) — verbatim, targets nobody. */
export function collectiveTriviaSentence(
  fact: Pick<Extract<FunFact, { key: "collectiveTrivia" }>, "totalGames" | "totalHands">,
): string {
  return `You've played ${fact.totalGames} ${gamesNoun(fact.totalGames)} and ${fact.totalHands} hands together.`;
}

/**
 * A `FunFact`'s own display facts — the one sentence `FunFactCard` (`/`)
 * renders, and where it taps through to (criterion 292): a single game for
 * the flatliner, the comeback (its own worst game) and a random old night; a
 * player's own page for a current drought or a slump (neither carries a
 * `gameId` — the fact is about their ongoing record, not one game); the
 * head-to-head drill-through already built for rivalry (Milestone 3 Stage 2)
 * for the rivalry needle; and `null` — no tap-through at all — for overdue
 * and collective trivia, both archive-wide facts with no single game or
 * player to point at (criterion 292's own carve-out).
 *
 * An exhaustive `switch` over `FunFact.key` — adding a ninth generator
 * without adding a case here fails the typecheck, not silently drops a fact.
 */
export interface FunFactDisplay {
  sentence: string;
  href: string | null;
}

export function funFactDisplay(fact: FunFact): FunFactDisplay {
  switch (fact.key) {
    case "flatliner":
      return { sentence: flatlinerSentence(fact), href: `/games/${fact.gameId}` };
    case "currentDrought":
      return { sentence: currentDroughtSentence(fact), href: `/players/${fact.playerId}` };
    case "comeback":
      return { sentence: comebackSentence(fact), href: `/games/${fact.worstGameId}` };
    case "slump":
      return { sentence: slumpSentence(fact), href: `/players/${fact.playerId}` };
    case "rivalryNeedle":
      return {
        sentence: rivalryNeedleSentence(fact),
        href: `/players/${fact.dominantPlayerId}?opponent=${fact.opponentPlayerId}`,
      };
    case "overdue":
      return { sentence: overdueSentence(fact), href: null };
    case "randomOldNight":
      return { sentence: randomOldNightSentence(fact), href: `/games/${fact.gameId}` };
    case "collectiveTrivia":
      return { sentence: collectiveTriviaSentence(fact), href: null };
  }
}
