/**
 * Fixed copy and flag-sentence rendering.
 *
 * `docs/DESIGN-SYSTEM.md` § Voice & tone, "Fixed strings" table: developers
 * use these strings verbatim, never paraphrased, and never with *checked,
 * validated, verified, confirmed, correct, looks right* or *all good*
 * (PRD criterion 24, 45). Centralised here so every screen that needs one of
 * these sentences renders it the same way.
 */

import { handLabel, type GridValidation } from "@/lib/scoring";

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
