import { describe, expect, it } from "vitest";

import { validateGrid, type GridColumn } from "@/lib/scoring";
import { SHEET_01 } from "../fixtures/sheets";
import * as copy from "@/lib/ui/copy";
import {
  ADMIN_REJECTED_MESSAGE,
  ADMIN_REJECTED_TITLE,
  ADMIN_SAVED_MESSAGE,
  ADMIN_SAVED_TITLE,
  DAILY_TRANSCRIBE_CAP_MESSAGE,
  DAILY_TRANSCRIBE_CAP_TITLE,
  PASSING_STATEMENT,
  READ_ERROR_MESSAGE,
  READ_ERROR_TITLE,
  TOO_FEW_PLAYERS_MESSAGE,
  blockedColumnDips,
  blockedColumnShort,
  cellRowLabel,
  columnStatusLabel,
  compareDifferingLinesSummary,
  compareDifferingLinesSummaryGeneral,
  compareHistoryLink,
  compareKeepActiveLabel,
  compareMakeActiveLabel,
  compareVsPastReadingHeading,
  deleteConfirmDetail,
  deleteConfirmQuestion,
  incompleteCloseupNote,
  insertConfirmDetail,
  insertConfirmQuestion,
  ordinal,
  pairedFlagSentence,
  readHintSentence,
  readingHistoryHeading,
  readingHistoryRowLabel,
  readingLabel,
  saveBlockedMessage,
  sharedWinGamesListLabel,
  sharedWinnerConfirmation,
  softWarningSentence,
  soleWinnerConfirmation,
  typedCellDisagreementSentence,
  winnerConfirmation,
  wrongColumnWarningTitle,
  formatAud,
  formatUsageMonthLabel,
  hidePasswordAriaLabel,
  showPasswordAriaLabel,
  todayColumnRereadsLabel,
  todaySheetReadsLabel,
  usageEstimateDisclosure,
  formatWinRatePercent,
  locationCollisionTitle,
  playerGamesHeading,
  playerZeroGamesBody,
  editPlaceAriaLabel,
  rosterDuplicateWarningBody,
  rosterDuplicateWarningTitle,
  rosterGamesHeading,
  rosterStatsSampleLine,
  statSampleCaption,
  LOCATION_COLLISION_BODY,
  MERGE_CONFIRM_INTRO,
  MERGE_NO_UNDO_SENTENCE,
  MERGE_SUCCESS_TITLE,
  PICKLIST_CLOSEST_MATCHES_LABEL,
  SAME_GAME_REFUSAL_BODY,
  SUGGESTED_MATCH_PILL_LABEL,
  UNASSIGNED_COLUMN_PILL_LABEL,
  locationCollisionMergeButtonLabel,
  mergeDetailSentencePlace,
  mergeDetailSentencePlayer,
  mergePickEmptyBodyPlace,
  mergePickEmptyBodyPlayer,
  mergeSuccessBodyPlace,
  mergeSuccessBodyPlayer,
  mergeTargetHeadingPlace,
  mergeTargetHeadingPlayer,
  mergeTargetRowGamesLabel,
  readAsCaption,
  rosterFoldNote,
  sameGameBackButtonLabel,
  sameGameRefusalTitle,
  survivorGamesPlayedLabel,
  survivorGamesPlayedThereLabel,
  RECORD_TITLES,
  RECORD_UNITS,
  archiveCountLine,
  drillThroughHeading,
  earlyDaysLine,
  formatRecordValue,
  recordSampleLine,
  roundsWonRowAnnotation,
  streakHolderRowAnnotation,
  NEMESIS_CARD_TITLE,
  PERSONAL_RECORD_DROUGHT_TITLE,
  PERSONAL_RECORD_DROUGHT_UNIT,
  PERSONAL_RECORD_STREAK_TITLE,
  PERSONAL_RECORD_STREAK_UNIT,
  PLAYER_BY_ROSTER_HEADING,
  PLAYER_BY_ROSTER_SAMPLE_LINE,
  PLAYER_HEAD_TO_HEAD_HEADING,
  PLAYER_HEAD_TO_HEAD_SAMPLE_LINE,
  PLAYER_STREAK_SECTION_HEADING,
  byRosterGamesCaption,
  headToHeadDrillThroughHeading,
  headToHeadTogetherCaption,
  nemesisDetailSentence,
  collectiveTriviaSentence,
  comebackSentence,
  currentDroughtSentence,
  flatlinerSentence,
  funFactDisplay,
  overdueSentence,
  randomOldNightSentence,
  rivalryNeedleSentence,
  slumpSentence,
} from "@/lib/ui/copy";
import {
  HAND_DERIVATION_HONESTY_LINE,
  SINGLE_EVENT_RECORD_TITLES,
  SINGLE_EVENT_RECORD_UNITS,
  catastropheInstanceRow,
  catastropheSampleLine,
  formatRecordDate,
  handTrendSampleLine,
  playerAverageSampleCaption,
  playerHandProfileSampleLine,
  rosterAverageSampleCaption,
  singleEventDisplayFacts,
  singleEventGameAnnotation,
  singleEventInstanceRow,
  singleEventSampleLine,
  villainsRowSampleCaption,
} from "@/lib/ui/copy";
import type { FunFact } from "@/lib/scoring/facts";
import type { ResolvedGamesFilter } from "@/lib/games/queries";
import {
  formatHomeAdvantageGap,
  gamesFilterClauseRoster,
  gamesFilterClauseVenue,
  gamesFilterClauses,
  gamesFilterContext,
  gamesFilterZeroMatchesBody,
  homeAdvantageDisplayFacts,
  homeAdvantageHolderLine,
  homeAdvantageSampleSentence,
  venueGamesHeading,
  venuePlayersSampleLine,
  venueZeroGamesBody,
} from "@/lib/ui/copy";
import {
  LOOKS_LIKE_CHEATING_RECORD_TITLE,
  LOOKS_LIKE_CHEATING_RECORD_UNIT,
  METRONOME_RECORD_TITLE,
  METRONOME_RECORD_UNIT,
  clutchComebackSampleSentence,
  formatLooksLikeCheatingGap,
  gettingWreckedSampleSentence,
  looksLikeCheatingDisplayFacts,
  looksLikeCheatingSampleSentence,
  metronomeDisplayFacts,
  metronomeSampleSentence,
  recordDisplayFacts,
} from "@/lib/ui/copy";

const BANNED_WORDS = [
  "checked",
  "validated",
  "verified",
  "confirmed",
  "correct",
  "looks right",
  "all good",
  // Criterion 45 ("the wording criterion, again"): the re-photograph flow
  // specifically may not describe itself as checking, verifying, confirming
  // or double-checking the earlier read. These overlap the criterion-24 list
  // above but add forms (bare "verify", "double-check") that list doesn't
  // already catch, so the exhaustive scan below also enforces 45.
  "verify",
  "verifying",
  "double-check",
  "double check",
  "confirm the read",
  // Criterion 192's own addition, restated for Stage 3 by criterion 246 and
  // the 2026-09-14 ADR ("Row 11 is not self-cancelling"): a final score, an
  // average or a record may never be called safe, protected or
  // self-cancelling. QA gap found in Stage 3 review — the exhaustive scan
  // above only ever checked the *checked/verified/confirmed* half of
  // criterion 192's ban; nothing caught this half, so a future record's
  // copy could say "safe" or "protected" with the whole suite still green.
  "safe",
  "protected",
  "self-cancelling",
  "self cancelling",
];

function assertNoBannedWords(sentence: string) {
  const lower = sentence.toLowerCase();
  for (const word of BANNED_WORDS) {
    expect(lower).not.toContain(word);
  }
}

const gridFor = (columns: { player: string; runningTotals: (number | null)[] }[]): GridColumn[] =>
  columns.map((c, i) => ({ id: `col_${i}`, playerId: c.player, values: c.runningTotals }));

describe("Every fixed string export in lib/ui/copy.ts — exhaustive, not curated", () => {
  // QA gap found in Stage 3 review: the hand-picked lists above miss several
  // real constants (e.g. ADMIN_TESTING_HELPER, ADMIN_KEY_FIELD_LABEL,
  // TRANSCRIBE_PROGRESS_HEADING/CAPTIONS, ADMIN_STATUS_*, READ_RETRY_LABEL).
  // This walks every string (and string-array) export automatically, so a
  // new fixed string can never silently skip the wording constraint again.
  const allExports = Object.entries(copy) as [string, unknown][];
  const stringExports = allExports.filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  const arrayExports = allExports.filter(
    (entry): entry is [string, readonly string[]] =>
      Array.isArray(entry[1]) && entry[1].every((v) => typeof v === "string"),
  );

  it("found a non-trivial number of string exports to check (sanity check on the scan itself)", () => {
    expect(stringExports.length).toBeGreaterThan(30);
  });

  it.each(stringExports)("%s has no banned word", (_name, value) => {
    assertNoBannedWords(value);
  });

  it.each(arrayExports)("%s (array) has no banned word in any entry", (_name, values) => {
    values.forEach((value) => assertNoBannedWords(value));
  });
});

describe("pairedFlagSentence (PRD criterion 21)", () => {
  it("names both numbers, lower first — '11 is lower than the 67 above it'", () => {
    expect(pairedFlagSentence(11, 67)).toBe("11 is lower than the 67 above it.");
    assertNoBannedWords(pairedFlagSentence(11, 67));
  });
});

describe("softWarningSentence (PRD criterion 27)", () => {
  it("names the points and the hand label", () => {
    expect(softWarningSentence(51, 4)).toBe("51 on the 6s — a big one, saved as written.");
  });

  it("falls back gracefully outside the 1–11 hand range", () => {
    expect(softWarningSentence(10, 0)).toBe("10 on the hand 0 — a big one, saved as written.");
  });
});

describe("columnStatusLabel (PRD criterion 25)", () => {
  it("renders the literal '10 of 11' wording, never a shorter game", () => {
    expect(columnStatusLabel(10, 11)).toBe("10 of 11");
  });
});

describe("readHintSentence (docs/DESIGN-SYSTEM.md § ReadHint fixed copy)", () => {
  it("names the hand label, never the cell's value", () => {
    expect(readHintSentence(4)).toBe("Least sure about the 6s in this column.");
    assertNoBannedWords(readHintSentence(4));
  });

  it("falls back gracefully outside the 1–11 hand range, same as softWarningSentence", () => {
    expect(readHintSentence(0)).toBe("Least sure about the hand 0 in this column.");
  });
});

describe("Stage 3 fixed banner copy — none of it uses a banned word", () => {
  it("the daily transcription cap banner", () => {
    assertNoBannedWords(DAILY_TRANSCRIBE_CAP_TITLE);
    assertNoBannedWords(DAILY_TRANSCRIBE_CAP_MESSAGE);
  });

  it("the read-error banner", () => {
    assertNoBannedWords(READ_ERROR_TITLE);
    assertNoBannedWords(READ_ERROR_MESSAGE);
  });

  it("the admin panel's saved/rejected banners", () => {
    assertNoBannedWords(ADMIN_SAVED_TITLE);
    assertNoBannedWords(ADMIN_SAVED_MESSAGE);
    assertNoBannedWords(ADMIN_REJECTED_TITLE);
    assertNoBannedWords(ADMIN_REJECTED_MESSAGE);
  });
});

describe("blocked messages", () => {
  it("names the player and the dipping hand", () => {
    expect(blockedColumnDips("Player D", 11)).toBe("Player D's column dips at hand 11.");
  });

  it("names the player and how many of eleven are filled", () => {
    expect(blockedColumnShort("Player B", 10, 11)).toBe("Player B's column has 10 of 11.");
  });
});

describe("winner confirmations", () => {
  it("sole winner", () => {
    expect(soleWinnerConfirmation("Player C", 78)).toBe("In the book. Player C won on 78.");
  });

  it("shared win between two (PRD criterion 66)", () => {
    expect(sharedWinnerConfirmation(["Player C", "Player D"], 78)).toBe(
      "In the book. Player C and Player D shared it on 78.",
    );
  });

  it("shared win among three or more reads naturally", () => {
    expect(sharedWinnerConfirmation(["Player A", "Player B", "Player C"], 50)).toBe(
      "In the book. Player A, Player B and Player C shared it on 50.",
    );
  });

  it("winnerConfirmation dispatches on winner count", () => {
    expect(winnerConfirmation(["Player C"], 78)).toBe("In the book. Player C won on 78.");
    expect(winnerConfirmation(["Player C", "Player D"], 78)).toContain("shared it on 78");
  });
});

describe("sharedWinGamesListLabel (games list row, design system: '{A} & {B} — shared')", () => {
  it("a single winner is just their name", () => {
    expect(sharedWinGamesListLabel(["Player C"])).toBe("Player C");
  });

  it("two winners use the '{A} & {B} — shared' form", () => {
    expect(sharedWinGamesListLabel(["Player C", "Player D"])).toBe("Player C & Player D — shared");
  });
});

describe("saveBlockedMessage — derived straight from validateGrid, over the fixtures", () => {
  it("is null (nothing blocks save) for a clean fixture grid", () => {
    const columns = gridFor(SHEET_01.columns);
    const validation = validateGrid(columns);
    expect(saveBlockedMessage(validation, () => "")).toBeNull();
  });

  it("names the dipping hand when editing a fixture value breaks monotonicity (criterion 21)", () => {
    const columns = gridFor(SHEET_01.columns).map((c) => ({ ...c, values: [...c.values] }));
    // Player A's row 6 (index 5) edited from 100 down to 70, as PRD criterion 21 does.
    const playerAIndex = SHEET_01.columns.findIndex((c) => c.player === "Player A");
    columns[playerAIndex]!.values[5] = 70;

    const validation = validateGrid(columns);
    const labels: Record<string, string> = {};
    columns.forEach((c, i) => {
      labels[c.id] = SHEET_01.columns[i]!.player;
    });

    const message = saveBlockedMessage(validation, (id) => labels[id] ?? id);
    expect(message).toBe("Player A's column dips at hand 6.");
  });

  it("reports too few players ahead of anything else", () => {
    const columns: GridColumn[] = [
      { id: "a", playerId: "Player A", values: Array(11).fill(1) },
    ];
    const validation = validateGrid(columns);
    expect(saveBlockedMessage(validation, () => "Player A")).toBe(TOO_FEW_PLAYERS_MESSAGE);
  });

  it("reports a short column", () => {
    const columns: GridColumn[] = [
      { id: "a", playerId: "Player A", values: Array(11).fill(1) },
      { id: "b", playerId: "Player B", values: [1, 2, 3] },
    ];
    const validation = validateGrid(columns);
    expect(saveBlockedMessage(validation, (id) => (id === "b" ? "Player B" : "Player A"))).toBe(
      "Player B's column has 3 of 11.",
    );
  });
});

describe("The wording constraint (PRD criterion 24) — none of the fixed strings use a banned word", () => {
  it("passing statement", () => {
    expect(PASSING_STATEMENT).toBe(
      "Not obviously wrong — that's the most this screen can promise.",
    );
    assertNoBannedWords(PASSING_STATEMENT);
  });

  it("every generated sentence in this module", () => {
    assertNoBannedWords(pairedFlagSentence(1, 2));
    assertNoBannedWords(softWarningSentence(50, 1));
    assertNoBannedWords(blockedColumnDips("Player A", 1));
    assertNoBannedWords(blockedColumnShort("Player A", 1, 11));
    assertNoBannedWords(soleWinnerConfirmation("Player A", 1));
    assertNoBannedWords(sharedWinnerConfirmation(["Player A", "Player B"], 1));
  });
});

describe("ordinal / cellRowLabel (Stage 4: 'fix the shape' row labels)", () => {
  it("renders the usual English ordinals, including the 11-13 exception", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(21)).toBe("21st");
  });

  it("uses the card rank while a column holds exactly eleven values", () => {
    expect(cellRowLabel(0, 11)).toBe("3s");
    expect(cellRowLabel(10, 11)).toBe("Kings");
  });

  it("⚠️ falls back to a plain position mid-repair, when the column isn't eleven", () => {
    expect(cellRowLabel(0, 12)).toBe("1st");
    expect(cellRowLabel(11, 12)).toBe("12th");
    expect(cellRowLabel(9, 10)).toBe("10th");
  });
});

describe("insert/delete confirm sentences (PRD criterion 33, verbatim '12 of 11' / '10 of 11')", () => {
  it("insert confirm names the line and the resulting count", () => {
    expect(insertConfirmQuestion(3)).toBe("Insert a blank line above the 3rd line down?");
    expect(insertConfirmDetail(11)).toBe(
      "Everything below shifts down one — this column will read 12 of 11 until it's filled in.",
    );
  });

  it("delete confirm names the line, its value, and the resulting count", () => {
    expect(deleteConfirmQuestion(3, 64)).toBe("Delete the 3rd line down — 64?");
    expect(deleteConfirmDetail(11)).toBe(
      "Everything below shifts up one — this column will read 10 of 11.",
    );
  });

  it("an unread line's value renders as a dash, never a literal null", () => {
    expect(deleteConfirmQuestion(1, null)).toBe("Delete the 1st line down — –?");
  });

  it("has no banned word", () => {
    assertNoBannedWords(insertConfirmQuestion(1));
    assertNoBannedWords(insertConfirmDetail(11));
    assertNoBannedWords(deleteConfirmQuestion(1, 10));
    assertNoBannedWords(deleteConfirmDetail(11));
  });
});

describe("wrongColumnWarningTitle / typedCellDisagreementSentence (PRD criteria 42, 43)", () => {
  it("names the sheet player and the assigned player", () => {
    expect(wrongColumnWarningTitle("Player B", "Player D")).toBe(
      "This looks like Player B's column, not Player D's.",
    );
  });

  it("names both the typed value and the close-up's own read, verbatim to the PRD's example", () => {
    expect(typedCellDisagreementSentence(64, 84)).toBe("You typed 64; the close-up reads 84.");
  });
});

describe("incompleteCloseupNote (PRD criterion 44)", () => {
  it("names the player and the resulting fill count, and reuses the save button's own label", () => {
    expect(incompleteCloseupNote("Player D", 8)).toBe(
      "Keeping this leaves Player D's column at 8 of 11 — Put it in the book stays blocked until it's filled in.",
    );
    assertNoBannedWords(incompleteCloseupNote("Player D", 8));
  });
});

describe("compareDifferingLinesSummary(General) (PRD criteria 39-41)", () => {
  it("names every differing hand label, verbatim to the design system's example", () => {
    expect(compareDifferingLinesSummary(["8s", "9s", "10s", "Jacks"])).toBe(
      "4 lines differ from what's saved: 8s, 9s, 10s, Jacks.",
    );
  });

  it("uses singular grammar for exactly one differing line", () => {
    expect(compareDifferingLinesSummary(["Kings"])).toBe("1 line differs from what's saved: Kings.");
  });

  it("says so plainly when nothing differs", () => {
    expect(compareDifferingLinesSummary([])).toBe("Every line matches what's saved.");
  });

  it("the generalised (past-vs-past) form never mentions 'saved'", () => {
    const summary = compareDifferingLinesSummaryGeneral(["8s"]);
    expect(summary).toBe("1 line differs between the two readings: 8s.");
    expect(summary.toLowerCase()).not.toContain("saved");
  });
});

describe("Stage 1 (M2): usage and spend copy (PRD criteria 110-114)", () => {
  it("formatAud always renders two decimal places, including the zero month (criterion 114)", () => {
    expect(formatAud(0)).toBe("A$0.00");
    expect(formatAud(12.3)).toBe("A$12.30");
    expect(formatAud(4.567)).toBe("A$4.57");
  });

  it("today's cap lines interpolate whatever cap the API actually sent, never a literal (criterion 113)", () => {
    expect(todaySheetReadsLabel(3, 20)).toBe("3 of 20 sheet reads today");
    expect(todayColumnRereadsLabel(0, 60)).toBe("0 of 60 column re-reads today");
    // A different cap must render differently — this would fail if either
    // number were ever hardcoded instead of interpolated.
    expect(todaySheetReadsLabel(3, 40)).toBe("3 of 40 sheet reads today");
  });

  it("usageEstimateDisclosure is built from the rate and date it's given, not a fixed constant", () => {
    expect(usageEstimateDisclosure(1.55, "2026-01-15")).toBe(
      "An estimate — converted at US$1 ≈ A$1.55, prices checked against the Anthropic console on 15 Jan 2026.",
    );
    expect(usageEstimateDisclosure(1.6, "2026-03-01")).toContain("A$1.60");
    expect(usageEstimateDisclosure(1.6, "2026-03-01")).toContain("1 Mar 2026");
  });

  it("formatUsageMonthLabel names the UTC month and year, and says so (criterion 110)", () => {
    expect(formatUsageMonthLabel("2026-09")).toBe("September 2026 (UTC)");
    expect(formatUsageMonthLabel("2026-01")).toBe("January 2026 (UTC)");
  });
});

describe("password-form reveal-toggle aria labels (Stage 1, M2)", () => {
  it("names the field the toggle belongs to, lower-casing its first letter", () => {
    expect(showPasswordAriaLabel("New group password")).toBe("Show new group password");
    expect(hidePasswordAriaLabel("Current admin password")).toBe("Hide current admin password");
  });
});

describe("reading history and past-reading compare copy (PRD criterion 41)", () => {
  it("readingLabel and readingHistoryRowLabel", () => {
    expect(readingLabel(2)).toBe("Reading 2");
    expect(readingHistoryRowLabel(2, "close-up", "12 Sep, 2:14 pm")).toBe(
      "Reading 2 · close-up · 12 Sep, 2:14 pm",
    );
    expect(readingHistoryRowLabel(1, "sheet", "10 Sep, 8:02 pm")).toContain("full sheet");
  });

  it("readingHistoryHeading names the player", () => {
    expect(readingHistoryHeading("Player D")).toBe("Every reading of Player D's column");
  });

  it("compareVsPastReadingHeading and the relabelled buttons", () => {
    expect(compareVsPastReadingHeading("Reading 2")).toBe("Reading 2 vs what's active now");
    expect(compareMakeActiveLabel("Reading 2")).toBe("Make Reading 2 active");
    expect(compareKeepActiveLabel("Reading 3")).toBe("Keep Reading 3 active");
  });

  it("compareHistoryLink names the count", () => {
    expect(compareHistoryLink(3)).toBe("See every reading (3)");
  });
});

describe("Stage 3: players, rosters, places copy", () => {
  it("formatWinRatePercent renders one decimal place, including 0% and 100% (criterion 133)", () => {
    expect(formatWinRatePercent(0)).toBe("0.0%");
    expect(formatWinRatePercent(1)).toBe("100.0%");
    expect(formatWinRatePercent(0.5)).toBe("50.0%");
    expect(formatWinRatePercent(1.25)).toBe("125.0%");
  });

  it("statSampleCaption uses singular grammar for exactly one game", () => {
    expect(statSampleCaption(1, 1)).toBe("1 of 1 game");
    expect(statSampleCaption(2, 4)).toBe("2 of 4 games");
    expect(statSampleCaption(0, 3)).toBe("0 of 3 games");
  });

  it("playerGamesHeading / playerZeroGamesBody name the player", () => {
    expect(playerGamesHeading("Player C")).toBe("Player C's games");
    expect(playerZeroGamesBody("Player F")).toBe(
      "Nothing saved right now has Player F at the table.",
    );
  });

  it("rosterStatsSampleLine uses singular grammar for exactly one game", () => {
    expect(rosterStatsSampleLine(1)).toBe(
      "Each member's wins and win rate across these 1 game.",
    );
    expect(rosterStatsSampleLine(4)).toBe(
      "Each member's wins and win rate across these 4 games.",
    );
  });

  it("rosterGamesHeading names the roster", () => {
    expect(rosterGamesHeading("Thursday crew")).toBe("Thursday crew's games");
  });

  it("⚠️ Stage 4: editPlaceAriaLabel names the place, and reads 'Edit', not 'Rename' (was renameOpenAriaLabelPlace pre-Stage-4)", () => {
    expect(editPlaceAriaLabel("The Deck")).toBe("Edit The Deck");
  });

  it("rosterDuplicateWarningTitle/Body name the colliding roster by its members, not by name (criterion 143)", () => {
    expect(rosterDuplicateWarningTitle("Sunday crew")).toBe("Sunday crew is already a roster name.");
    expect(rosterDuplicateWarningBody("Player B, Player D & Player E")).toBe(
      "Player B, Player D & Player E answers to it too — nothing stops you saving it, rename either one later if it's confusing.",
    );
  });

  it("locationCollisionTitle names the existing place (criterion 146)", () => {
    expect(locationCollisionTitle("The Deck")).toBe("The Deck already has that name.");
  });

  it("⚠️ Stage 4: LOCATION_COLLISION_BODY now offers the merge, not 'coming in a later update' (criterion 163 fulfils 146)", () => {
    expect(LOCATION_COLLISION_BODY).toBe("Pick a different name, or merge the two into one instead.");
    expect(LOCATION_COLLISION_BODY.toLowerCase()).not.toContain("later update");
  });
});

describe("Stage 4: identity, repaired — review screen copy (criteria 148–154, 172–173)", () => {
  it("SUGGESTED_MATCH_PILL_LABEL and UNASSIGNED_COLUMN_PILL_LABEL are the exact fixed strings", () => {
    expect(SUGGESTED_MATCH_PILL_LABEL).toBe("Suggested");
    expect(UNASSIGNED_COLUMN_PILL_LABEL).toBe("Needs a player");
    expect(PICKLIST_CLOSEST_MATCHES_LABEL).toBe("Closest matches");
  });

  it("readAsCaption names the sheet name, verbatim 'Read as {name}.'", () => {
    expect(readAsCaption("Sam")).toBe("Read as Sam.");
    assertNoBannedWords(readAsCaption("Sam"));
  });
});

describe("Stage 4: identity, repaired — merging players and places (criteria 155–166)", () => {
  it("mergeTargetHeadingPlayer/Place name who's being merged", () => {
    expect(mergeTargetHeadingPlayer("Samuel")).toBe("Merge Samuel with which player?");
    expect(mergeTargetHeadingPlace("The Deck")).toBe("Merge The Deck with which place?");
  });

  it("MERGE_CONFIRM_INTRO is the exact fixed sentence, and states nothing is pre-chosen (criterion 156)", () => {
    expect(MERGE_CONFIRM_INTRO).toBe("Pick which one stays. Nothing is chosen for you.");
  });

  it("mergeDetailSentencePlayer names every table criterion 158 repoints", () => {
    expect(mergeDetailSentencePlayer("Samuel", "Sam")).toBe(
      "Samuel is deleted for good. Every game, round, roster spot and photo of theirs moves to Sam.",
    );
  });

  it("mergeDetailSentencePlace names the games moving", () => {
    expect(mergeDetailSentencePlace("The Deck (typo)", "The Deck")).toBe(
      "The Deck (typo) is deleted for good. Every game at The Deck (typo) moves to The Deck.",
    );
  });

  it("MERGE_NO_UNDO_SENTENCE covers both 'no undo' (157) and 'no history' (162) in one sentence", () => {
    expect(MERGE_NO_UNDO_SENTENCE).toBe("There's no undo, and no record that a merge happened.");
    assertNoBannedWords(MERGE_NO_UNDO_SENTENCE);
  });

  it("sameGameRefusalTitle/Body name both players and the reason (criterion 160)", () => {
    expect(sameGameRefusalTitle("Sam", "Player A")).toBe("Sam and Player A played the same game.");
    expect(SAME_GAME_REFUSAL_BODY).toBe(
      "One person can't hold two seats at the same table. Fix these first, then try the merge again:",
    );
  });

  it("sameGameBackButtonLabel names the originating player", () => {
    expect(sameGameBackButtonLabel("Sam")).toBe("Back to Sam");
  });

  it("MERGE_SUCCESS_TITLE / mergeSuccessBodyPlayer / mergeSuccessBodyPlace / rosterFoldNote match the fixed table verbatim", () => {
    expect(MERGE_SUCCESS_TITLE).toBe("Merged.");
    expect(mergeSuccessBodyPlayer("Samuel", "Sam")).toBe("Samuel is now part of Sam's record.");
    expect(mergeSuccessBodyPlace("The Deck (typo)", "The Deck")).toBe(
      "The Deck (typo) is now part of The Deck.",
    );
    expect(rosterFoldNote("Thursday crew")).toBe(
      'Two rosters folded into one — kept the name "Thursday crew".',
    );
  });

  it("survivor-card and merge-target-row games labels use singular grammar for exactly one game", () => {
    expect(survivorGamesPlayedLabel(0)).toBe("0 games played");
    expect(survivorGamesPlayedLabel(1)).toBe("1 game played");
    expect(survivorGamesPlayedThereLabel(1)).toBe("1 game played there");
    expect(survivorGamesPlayedThereLabel(2)).toBe("2 games played there");
    expect(mergeTargetRowGamesLabel(1)).toBe("1 game");
    expect(mergeTargetRowGamesLabel(9)).toBe("9 games");
  });

  it("mergePickEmptyBodyPlayer/Place name the only player/place left", () => {
    expect(mergePickEmptyBodyPlayer("Sam")).toBe("Sam is the only player in the book right now.");
    expect(mergePickEmptyBodyPlace("The Deck")).toBe("The Deck is the only place in the book right now.");
  });

  it("locationCollisionMergeButtonLabel names the existing place", () => {
    expect(locationCollisionMergeButtonLabel("The Deck")).toBe("Merge with The Deck");
  });

  it("none of this stage's new sentences use a banned word (criterion 154, restated)", () => {
    assertNoBannedWords(mergeTargetHeadingPlayer("Sam"));
    assertNoBannedWords(mergeDetailSentencePlayer("Samuel", "Sam"));
    assertNoBannedWords(mergeDetailSentencePlace("A", "B"));
    assertNoBannedWords(sameGameRefusalTitle("Sam", "Player A"));
    assertNoBannedWords(mergeSuccessBodyPlayer("Samuel", "Sam"));
    assertNoBannedWords(mergeSuccessBodyPlace("A", "B"));
    assertNoBannedWords(rosterFoldNote("Thursday crew"));
  });
});

describe("Milestone 3 Stage 1: the records board (PRD criteria 179–196)", () => {
  it("⚠️ earlyDaysLine is criterion 183's fixed sentence, verbatim, with the archive count interpolated", () => {
    expect(earlyDaysLine(3)).toBe(
      "Early days — 3 games in the record. A single game can still change any of these.",
    );
    expect(earlyDaysLine(9)).toContain("9 games in the record");
    assertNoBannedWords(earlyDaysLine(1));
  });

  it("⚠️ archiveCountLine is a different sentence at EARLY_DAYS_BELOW and above — never the early-days line reworded", () => {
    expect(archiveCountLine(10)).toBe("10 games in the record.");
    expect(archiveCountLine(23)).toBe("23 games in the record.");
    expect(archiveCountLine(10).toLowerCase()).not.toContain("early days");
    expect(archiveCountLine(10).toLowerCase()).not.toContain("can still change");
  });

  it("record titles and units match the design system's fixed-strings table verbatim", () => {
    expect(RECORD_TITLES.mostWins).toBe("Most wins");
    expect(RECORD_TITLES.mostWinsInARow).toBe("Most wins in a row");
    expect(RECORD_TITLES.lowestAverageScore).toBe("Lowest average score");
    expect(RECORD_TITLES.mostRoundsWon).toBe("Most rounds won");
    expect(RECORD_TITLES.stalwart).toBe("The stalwart");

    expect(RECORD_UNITS.mostWins).toBe("wins");
    expect(RECORD_UNITS.mostWinsInARow).toBe("games in a row");
    expect(RECORD_UNITS.lowestAverageScore).toBe("avg. score");
    expect(RECORD_UNITS.mostRoundsWon).toBe("rounds");
    expect(RECORD_UNITS.stalwart).toBe("games played");
  });

  it("formatRecordValue renders lowest average score to one decimal place, every other record as a plain integer", () => {
    expect(formatRecordValue("lowestAverageScore", 41)).toBe("41.0");
    expect(formatRecordValue("lowestAverageScore", 68.44)).toBe("68.4");
    expect(formatRecordValue("mostWins", 3)).toBe("3");
    expect(formatRecordValue("mostRoundsWon", 47)).toBe("47");
    expect(formatRecordValue("stalwart", 23)).toBe("23");
  });

  it("recordSampleLine: a single holder reads 'from {n} games', singular for exactly one", () => {
    expect(recordSampleLine([{ displayName: "Sam", gamesPlayed: 1 }])).toBe("from 1 game");
    expect(recordSampleLine([{ displayName: "Sam", gamesPlayed: 4 }])).toBe("from 4 games");
  });

  it("⚠️ criterion 182: joint holders each state their own count, joined by ' · '", () => {
    expect(
      recordSampleLine([
        { displayName: "Player A", gamesPlayed: 23 },
        { displayName: "Player E", gamesPlayed: 14 },
      ]),
    ).toBe("Player A — from 23 games · Player E — from 14 games");
  });

  it("drillThroughHeading is the verbatim '{Record title} — {Holder(s)}' template", () => {
    expect(drillThroughHeading("Most wins", "Player A")).toBe("Most wins — Player A");
    expect(drillThroughHeading("The stalwart", "Player A, Player C & Player D")).toBe(
      "The stalwart — Player A, Player C & Player D",
    );
  });

  it("roundsWonRowAnnotation / streakHolderRowAnnotation are the verbatim templates", () => {
    expect(roundsWonRowAnnotation("Player C", 4)).toBe("Player C took 4 of 11 rounds");
    expect(streakHolderRowAnnotation("Player A")).toBe("Player A's streak game");
    assertNoBannedWords(roundsWonRowAnnotation("Player C", 4));
    assertNoBannedWords(streakHolderRowAnnotation("Player A"));
  });
});

describe("Milestone 3 Stage 2 (rivalry) — fixed strings", () => {
  it("headToHeadTogetherCaption keeps '1 game together' honest, same pluralisation rule as everywhere else", () => {
    expect(headToHeadTogetherCaption(9)).toBe("9 games together");
    expect(headToHeadTogetherCaption(1)).toBe("1 game together");
  });

  it("headToHeadDrillThroughHeading names both players with the project's own '&' grammar", () => {
    expect(headToHeadDrillThroughHeading("Sam", "Player B")).toBe("Sam & Player B");
  });

  it("byRosterGamesCaption keeps '1 game' honest", () => {
    expect(byRosterGamesCaption(5)).toBe("5 games");
    expect(byRosterGamesCaption(1)).toBe("1 game");
  });

  it("⚠️ the fixed heading and sample-line strings match docs/DESIGN-SYSTEM.md's table verbatim", () => {
    expect(PLAYER_HEAD_TO_HEAD_HEADING).toBe("Head-to-head");
    expect(PLAYER_HEAD_TO_HEAD_SAMPLE_LINE).toBe(
      "Every player you've shared a game with, most games together first.",
    );
    expect(PLAYER_BY_ROSTER_HEADING).toBe("By roster");
    expect(PLAYER_BY_ROSTER_SAMPLE_LINE).toBe(
      "This player's wins and win rate within each exact roster they've played in.",
    );
    expect(PLAYER_STREAK_SECTION_HEADING).toBe("Streak, in context");
    expect(PERSONAL_RECORD_STREAK_TITLE).toBe("Longest winning streak");
    expect(PERSONAL_RECORD_DROUGHT_TITLE).toBe("The drought");
    expect(PERSONAL_RECORD_STREAK_UNIT).toBe("games in a row");
    expect(PERSONAL_RECORD_DROUGHT_UNIT).toBe("games without a win");
  });

  describe("the nemesis card — the founder's pick (open question 10, PRD criterion 202): the flat 'Nemesis' candidate", () => {
    it("the title is exactly 'Nemesis', flat, no banter layered on top", () => {
      expect(NEMESIS_CARD_TITLE).toBe("Nemesis");
    });

    it("⚠️ nemesisDetailSentence matches candidate 1's exact wording from docs/mockups/m3-stage-2-rivalry.html, verbatim", () => {
      // "Player E finishes above Player C in 6 of their 9 shared games (66.7%)" —
      // the mockup's own worked example for every candidate, candidate 1's card reading:
      // "Finishes above you in 6 of your 9 games together (66.7%)."
      expect(nemesisDetailSentence(6, 9, 66.7)).toBe(
        "Finishes above you in 6 of your 9 games together (66.7%).",
      );
    });

    it("keeps '1 game together' honest and always states one decimal place, even a whole-number rate", () => {
      expect(nemesisDetailSentence(1, 1, 100)).toBe(
        "Finishes above you in 1 of your 1 game together (100.0%).",
      );
    });

    it("⚠️ criterion 202: passes the mechanical test — printable with both named players reading it over one shoulder each", () => {
      const sentence = nemesisDetailSentence(6, 9, 66.7);
      assertNoBannedWords(sentence);
      for (const word of [
        "weak",
        "hopeless",
        "dominated",
        "owned",
        "victim",
        "walkover",
        "can't",
        "never will",
      ]) {
        expect(sentence.toLowerCase()).not.toContain(word);
      }
    });
  });
});

describe("Milestone 3 Stage 3 — distributions and villains, fixed strings", () => {
  it("single-event record titles and units match the design system's fixed-strings table verbatim", () => {
    expect(SINGLE_EVENT_RECORD_TITLES.bestGameEver).toBe("Best game ever");
    expect(SINGLE_EVENT_RECORD_TITLES.worstGameEver).toBe("Worst game ever");
    expect(SINGLE_EVENT_RECORD_TITLES.catastrophe).toBe("The catastrophe");
    expect(SINGLE_EVENT_RECORD_TITLES.cleanestSheet).toBe("Cleanest sheet");
    expect(SINGLE_EVENT_RECORD_TITLES.biggestHammering).toBe("Biggest hammering");

    expect(SINGLE_EVENT_RECORD_UNITS.bestGameEver).toBe("final score");
    expect(SINGLE_EVENT_RECORD_UNITS.worstGameEver).toBe("final score");
    expect(SINGLE_EVENT_RECORD_UNITS.catastrophe).toBe("points in one hand");
    expect(SINGLE_EVENT_RECORD_UNITS.cleanestSheet).toBe("zero-point hands");
    expect(SINGLE_EVENT_RECORD_UNITS.biggestHammering).toBe("point margin");
  });

  it("⚠️ criterion 233: singleEventSampleLine is 'on {date}', never a game count", () => {
    expect(singleEventSampleLine("2026-09-05")).toMatch(/^on /);
    expect(singleEventSampleLine("2026-09-05")).not.toContain("from");
    expect(singleEventSampleLine("2026-09-05")).not.toContain("game");
  });

  it("the catastrophe's one-instance sample line names the hand: '{hand} · {date}'", () => {
    const sample = catastropheSampleLine("Kings", "2026-09-05");
    expect(sample.startsWith("Kings · ")).toBe(true);
    assertNoBannedWords(sample);
  });

  it("singleEventInstanceRow / catastropheInstanceRow are the verbatim '{Holder(s)} — {date}' templates", () => {
    expect(singleEventInstanceRow("Player A", "2026-08-28")).toMatch(/^Player A — /);
    expect(catastropheInstanceRow("Player E", "Kings", "2026-09-05")).toMatch(/^Player E — Kings · /);
  });

  it("formatRecordDate falls back to the raw string on an unparseable date", () => {
    expect(formatRecordDate("not-a-date")).toBe("not-a-date");
  });

  describe("singleEventDisplayFacts", () => {
    it("returns null for a record with no holder", () => {
      expect(singleEventDisplayFacts({ key: "worstGameEver", value: null, holders: [], games: [] })).toBeNull();
    });

    it("a single instance renders the ordinary holder + date-sample shape", () => {
      const facts = singleEventDisplayFacts({
        key: "worstGameEver",
        value: 178,
        holders: [{ playerId: "p2", displayName: "Player B", gameId: "g1", playedOn: "2026-09-05" }],
        games: [],
      });
      expect(facts).not.toBeNull();
      expect(facts!.title).toBe("Worst game ever");
      expect(facts!.unit).toBe("final score");
      expect(facts!.value).toBe("178");
      expect(facts!.holderNames).toBe("Player B");
      expect(facts!.sample).toMatch(/^on /);
      expect(facts!.instances).toBeNull();
      expect(facts!.claim).toContain("Player B");
      expect(facts!.claim).toContain("178");
      assertNoBannedWords(facts!.claim);
    });

    it("⚠️ a tie (two different games) renders the instance-list shape, alphabetical by player", () => {
      const facts = singleEventDisplayFacts({
        key: "bestGameEver",
        value: 28,
        holders: [
          { playerId: "p4", displayName: "Player D", gameId: "g2", playedOn: "2026-07-12" },
          { playerId: "p1", displayName: "Player A", gameId: "g1", playedOn: "2026-08-28" },
        ],
        games: [],
      });
      expect(facts).not.toBeNull();
      expect(facts!.sample).toBeNull();
      expect(facts!.instances).toHaveLength(2);
      expect(facts!.instances![0]!.label).toBe("Player A");
      expect(facts!.instances![1]!.label).toBe("Player D");
      expect(facts!.claim).toContain("Player A");
      expect(facts!.claim).toContain("Player D");
    });

    it("⚠️ the same player twice, in two different games, is two instances, not one", () => {
      const facts = singleEventDisplayFacts({
        key: "bestGameEver",
        value: 40,
        holders: [
          { playerId: "p1", displayName: "Amy", gameId: "g1", playedOn: "2026-02-01" },
          { playerId: "p1", displayName: "Amy", gameId: "g2", playedOn: "2026-02-08" },
        ],
        games: [],
      });
      expect(facts!.instances).toHaveLength(2);
      expect(facts!.instances!.every((i) => i.label === "Amy")).toBe(true);
      expect(facts!.instances![0]!.date).not.toBe(facts!.instances![1]!.date);
    });

    it("⚠️ criterion 230: the same player twice, on two different hands in the same game, is two instances", () => {
      const facts = singleEventDisplayFacts({
        key: "catastrophe",
        value: 41,
        holders: [
          { playerId: "p1", displayName: "Player E", gameId: "g1", playedOn: "2026-09-05", hand: "Kings" },
          { playerId: "p1", displayName: "Player E", gameId: "g1", playedOn: "2026-09-05", hand: "9s" },
        ],
        games: [],
      });
      expect(facts!.instances).toHaveLength(2);
      expect(facts!.instances!.map((i) => i.date).sort()).toEqual(
        ["9s · " + formatRecordDate("2026-09-05"), "Kings · " + formatRecordDate("2026-09-05")].sort(),
      );
    });

    it("biggest hammering's own documented case: a shared win in one game renders as one joint-named instance row, not two", () => {
      const facts = singleEventDisplayFacts({
        key: "biggestHammering",
        value: 52,
        holders: [
          { playerId: "p1", displayName: "Player A", gameId: "g1", playedOn: "2026-08-15" },
          { playerId: "p2", displayName: "Player B", gameId: "g1", playedOn: "2026-08-15" },
        ],
        games: [],
      });
      // One game, one instance — the ordinary (non-tied) shape, with a joint name.
      expect(facts!.instances).toBeNull();
      expect(facts!.holderNames).toBe("Player A & Player B");
      expect(facts!.sample).toMatch(/^on /);
    });
  });

  it("singleEventGameAnnotation reuses GameRow's plain annotation slot — '{value} {unit}', hand appended for the catastrophe", () => {
    expect(singleEventGameAnnotation("worstGameEver", 178)).toBe("178 final score");
    expect(singleEventGameAnnotation("biggestHammering", 52)).toBe("52 point margin");
    expect(singleEventGameAnnotation("catastrophe", 41, "Kings")).toBe("41 points in one hand · Kings");
  });

  it("handTrendSampleLine states the games and the hand-scores behind the trend, once", () => {
    expect(handTrendSampleLine(20, 98)).toBe(
      "Average points scored on each hand, across every player and every one of the 20 games in the record (98 individual hands).",
    );
    expect(handTrendSampleLine(1, 11)).toContain("1 game in the record");
  });

  it("⚠️ criterion 238: the honesty line is verbatim and never claims the numbers were checked", () => {
    expect(HAND_DERIVATION_HONESTY_LINE).toBe(
      "These are derived from the running totals — one misread total moves the two hands either side of it in opposite directions.",
    );
    assertNoBannedWords(HAND_DERIVATION_HONESTY_LINE);
  });

  it("playerHandProfileSampleLine states the sample and that the worst hand is marked", () => {
    expect(playerHandProfileSampleLine(9)).toBe("Average points on each hand, from 9 games. Worst hand marked.");
    expect(playerHandProfileSampleLine(1)).toContain("from 1 game.");
  });

  it("villainsRowSampleCaption is 'from {n} games', keeping '1 game' honest", () => {
    expect(villainsRowSampleCaption(12)).toBe("from 12 games");
    expect(villainsRowSampleCaption(1)).toBe("from 1 game");
  });

  it("playerAverageSampleCaption / rosterAverageSampleCaption match the design system's own two shapes", () => {
    expect(playerAverageSampleCaption(9)).toBe("9 games");
    expect(playerAverageSampleCaption(1)).toBe("1 game");
    expect(rosterAverageSampleCaption(9, 40)).toBe("9 games · 40 scores");
    expect(rosterAverageSampleCaption(1, 4)).toBe("1 game · 4 scores");
    expect(rosterAverageSampleCaption(5, 1)).toBe("5 games · 1 score");
  });
});

describe("Milestone 4, first slice — fun facts (PRD criteria 281–293)", () => {
  /**
   * ⚠️ Criterion 290's own wording line, restated for this feature: the
   * honesty ban (*checked, validated, verified, confirmed, correct, safe,
   * protected, self-cancelling*) still applies here even though criterion
   * 202's characterisation ban does not. The shared `BANNED_WORDS` list above
   * (criteria 24/45) already covers the first five; this adds the three this
   * feature's own criterion spells out by name (criterion 192/290) that
   * aren't already in that list, so every one of the eight templates below is
   * scanned against the full set.
   */
  const HONESTY_BANNED_WORDS = [...BANNED_WORDS, "safe", "protected", "self-cancelling"];

  function assertNoDishonestWords(sentence: string) {
    const lower = sentence.toLowerCase();
    for (const word of HONESTY_BANNED_WORDS) {
      expect(lower).not.toContain(word);
    }
  }

  const flatlinerFact = {
    key: "flatliner" as const,
    playerId: "p1",
    displayName: "Cody",
    gameId: "g1",
    playedOn: "2026-02-01",
    runLength: 5,
  };
  const currentDroughtFact = {
    key: "currentDrought" as const,
    playerId: "p2",
    displayName: "Priya",
    gamesSinceWin: 7,
  };
  const comebackFact = {
    key: "comeback" as const,
    playerId: "p3",
    displayName: "Dev",
    worstGameId: "g10",
    worstPlayedOn: "2026-01-05",
    hand: 11,
    score: 44,
    nextGameId: "g11",
    nextPlayedOn: "2026-01-12",
  };
  const slumpFact = {
    key: "slump" as const,
    playerId: "p4",
    displayName: "Ash",
    allTimeAverage: 41.2,
    recentAverage: 55.8,
    gamesPlayed: 9,
  };
  const rivalryNeedleFact = {
    key: "rivalryNeedle" as const,
    dominantPlayerId: "p5",
    dominantDisplayName: "Sam",
    opponentPlayerId: "p6",
    opponentDisplayName: "Lee",
    aboveRate: 0.8,
    gamesTogether: 5,
  };
  const overdueFact = { key: "overdue" as const, gamesSinceSharedWin: 12 };
  const randomOldNightFact = {
    key: "randomOldNight" as const,
    gameId: "g42",
    playedOn: "2026-03-14",
    locationName: null,
    rosterName: "Thursday crew",
    players: [{ displayName: "Cody", finalScore: 40 }],
    winners: ["Cody"],
    winningScore: 40,
  };
  const collectiveTriviaFact = { key: "collectiveTrivia" as const, totalGames: 12, totalHands: 132 };

  const allFacts: FunFact[] = [
    flatlinerFact,
    currentDroughtFact,
    comebackFact,
    slumpFact,
    rivalryNeedleFact,
    overdueFact,
    randomOldNightFact,
    collectiveTriviaFact,
  ];

  describe("the eight templates — each states only the numbers it was given", () => {
    it("flatliner (criterion 282): player, run length, the game's own date", () => {
      expect(flatlinerSentence(flatlinerFact)).toBe(
        "Cody put up exactly nothing for 5 hands straight in the Sun, 1 Feb 2026 game.",
      );
    });

    it("flatliner keeps a single hand grammatically singular", () => {
      expect(flatlinerSentence({ ...flatlinerFact, runLength: 1 })).toBe(
        "Cody put up exactly nothing for 1 hand in the Sun, 1 Feb 2026 game.",
      );
    });

    it("current drought (criterion 283): verbatim seed, counted in games", () => {
      expect(currentDroughtSentence(currentDroughtFact)).toBe(
        "It's been 7 games since Priya last won. Maybe go easy on them.",
      );
    });

    it("current drought keeps '1 game' honest", () => {
      expect(currentDroughtSentence({ ...currentDroughtFact, gamesSinceWin: 1 })).toContain(
        "It's been 1 game since Priya last won.",
      );
    });

    it("the comeback nobody asked for (criterion 284): the disaster, then the very next result plainly", () => {
      expect(comebackSentence(comebackFact)).toBe(
        "Dev gave up 44 points on the Kings hand in the Mon, 5 Jan 2026 game. Their very next game was a win.",
      );
    });

    it("the slump (criterion 285): both averages, one decimal place", () => {
      expect(slumpSentence(slumpFact)).toBe(
        "Ash's last three games are averaging 55.8, well up from their 9-game average of 41.2.",
      );
    });

    it("rivalry needle (criterion 286): both players named, the above-rate stated", () => {
      expect(rivalryNeedleSentence(rivalryNeedleFact)).toBe(
        "Sam finishes above Lee in 4 of their 5 games together (80.0%).",
      );
    });

    it("overdue (criterion 287): verbatim, archive-wide, targets nobody", () => {
      expect(overdueSentence(overdueFact)).toBe("It's been 12 games since anyone shared a win.");
    });

    it("a random old night (criterion 288): date, 'no location', roster, winner and score — no joke, no comparison", () => {
      expect(randomOldNightSentence(randomOldNightFact)).toBe(
        "Sat, 14 Mar 2026 — No location, with Thursday crew. Cody won on 40.",
      );
    });

    it("a random old night states a real venue when there is one", () => {
      expect(randomOldNightSentence({ ...randomOldNightFact, locationName: "The Deck" })).toContain(
        "The Deck, with Thursday crew.",
      );
    });

    it("a random old night states a shared win with both names, same grammar as the save confirmation", () => {
      expect(
        randomOldNightSentence({ ...randomOldNightFact, winners: ["Cody", "Priya"], winningScore: 40 }),
      ).toContain("Cody and Priya shared it on 40.");
    });

    it("collective trivia (criterion 289): verbatim, archive-wide, targets nobody", () => {
      expect(collectiveTriviaSentence(collectiveTriviaFact)).toBe(
        "You've played 12 games and 132 hands together.",
      );
    });
  });

  describe("funFactDisplay (criterion 292: tap-through wherever meaningful)", () => {
    it("flatliner, comeback and a random old night each link straight to their own game", () => {
      expect(funFactDisplay(flatlinerFact).href).toBe("/games/g1");
      expect(funFactDisplay(comebackFact).href).toBe("/games/g10");
      expect(funFactDisplay(randomOldNightFact).href).toBe("/games/g42");
    });

    it("current drought and the slump link to the player's own page — neither fact carries a gameId", () => {
      expect(funFactDisplay(currentDroughtFact).href).toBe("/players/p2");
      expect(funFactDisplay(slumpFact).href).toBe("/players/p4");
    });

    it("rivalry needle links to the existing head-to-head drill-through (M3 Stage 2), never a second implementation", () => {
      expect(funFactDisplay(rivalryNeedleFact).href).toBe("/players/p5?opponent=p6");
    });

    it("overdue and collective trivia have no tap-through at all (criterion 292's own carve-out)", () => {
      expect(funFactDisplay(overdueFact).href).toBeNull();
      expect(funFactDisplay(collectiveTriviaFact).href).toBeNull();
    });

    it("every fact's sentence matches its own dedicated template function", () => {
      expect(funFactDisplay(flatlinerFact).sentence).toBe(flatlinerSentence(flatlinerFact));
      expect(funFactDisplay(currentDroughtFact).sentence).toBe(currentDroughtSentence(currentDroughtFact));
      expect(funFactDisplay(comebackFact).sentence).toBe(comebackSentence(comebackFact));
      expect(funFactDisplay(slumpFact).sentence).toBe(slumpSentence(slumpFact));
      expect(funFactDisplay(rivalryNeedleFact).sentence).toBe(rivalryNeedleSentence(rivalryNeedleFact));
      expect(funFactDisplay(overdueFact).sentence).toBe(overdueSentence(overdueFact));
      expect(funFactDisplay(randomOldNightFact).sentence).toBe(randomOldNightSentence(randomOldNightFact));
      expect(funFactDisplay(collectiveTriviaFact).sentence).toBe(
        collectiveTriviaSentence(collectiveTriviaFact),
      );
    });
  });

  describe("⚠️ criterion 290: the honesty ban still applies even though the characterisation ban doesn't", () => {
    it("none of the eight templates ever uses a still-banned word, however sharp the rest of the sentence gets", () => {
      for (const fact of allFacts) {
        assertNoDishonestWords(funFactDisplay(fact).sentence);
      }
    });

    it("⚠️ the relaxation is real: the flatliner and the comeback are allowed to name a specific, unflattering consequence", () => {
      // Criterion 202's ban (nothing characterises a player) is exactly what
      // doesn't apply here — unlike the nemesis test above, this deliberately
      // does NOT scan for words like "gave up" or "nothing": naming the
      // specific, true, unflattering thing is the whole point of this feature.
      expect(flatlinerSentence(flatlinerFact)).toContain("Cody");
      expect(flatlinerSentence(flatlinerFact)).toContain("exactly nothing");
      expect(comebackSentence(comebackFact)).toContain("Dev");
      expect(comebackSentence(comebackFact)).toContain("gave up 44 points");
    });
  });
});

describe("Milestone 3 Stage 4 — place, time, and the filters", () => {
  it("venueGamesHeading/venuePlayersSampleLine/venueZeroGamesBody name the venue", () => {
    expect(venueGamesHeading("Player E's")).toBe("Player E's's games");
    expect(venuePlayersSampleLine("Player E's")).toBe(
      "Everyone who's played at Player E's, most games here first.",
    );
    expect(venueZeroGamesBody("The Rec Hall")).toBe("Nothing saved so far happened at The Rec Hall.");
  });

  describe("gamesFilterClauses / gamesFilterContext / gamesFilterZeroMatchesBody (criteria 262–264)", () => {
    it("a venue-only filter reads 'At {venue}'", () => {
      const filter: ResolvedGamesFilter = { location: { kind: "venue", id: "loc1", name: "Player E's" } };
      expect(gamesFilterClauses(filter)).toEqual(["At Player E's"]);
      expect(gamesFilterContext(gamesFilterClauses(filter), 6)).toBe("At Player E's · 6 games");
    });

    it("`?location=none` reads the bare 'No location' clause, with no 'At' prefix", () => {
      const filter: ResolvedGamesFilter = { location: { kind: "none" } };
      expect(gamesFilterClauses(filter)).toEqual(["No location"]);
    });

    it("a roster-only filter capitalises 'With {roster}'", () => {
      const filter: ResolvedGamesFilter = { roster: { id: "r1", name: "Player A & Player B" } };
      expect(gamesFilterClauses(filter)).toEqual(["With Player A & Player B"]);
    });

    it("combined filters: the venue clause first, the roster clause lower-cased", () => {
      const filter: ResolvedGamesFilter = {
        location: { kind: "venue", id: "loc1", name: "Player E's" },
        roster: { id: "r1", name: "Player A & Player B" },
      };
      expect(gamesFilterClauses(filter)).toEqual(["At Player E's", "with Player A & Player B"]);
    });

    it("gamesFilterZeroMatchesBody states the clause without the count", () => {
      expect(gamesFilterZeroMatchesBody(["At The Rec Hall"])).toBe("At The Rec Hall.");
      expect(gamesFilterZeroMatchesBody(["At Player E's", "with Player A & Player B"])).toBe(
        "At Player E's, with Player A & Player B.",
      );
    });

    it("gamesFilterClauseVenue/gamesFilterClauseRoster match the fixed templates verbatim", () => {
      expect(gamesFilterClauseVenue("The Deck")).toBe("At The Deck");
      expect(gamesFilterClauseRoster("Thursday crew", true)).toBe("With Thursday crew");
      expect(gamesFilterClauseRoster("Thursday crew", false)).toBe("with Thursday crew");
    });
  });

  describe("home advantage (criteria 253–254, 268–269)", () => {
    it("formatHomeAdvantageGap always signs the value, one decimal, never a % sign", () => {
      expect(formatHomeAdvantageGap(41.7)).toBe("+41.7");
      expect(formatHomeAdvantageGap(41.7)).not.toContain("%");
      expect(formatHomeAdvantageGap(100)).toBe("+100.0");
    });

    it("homeAdvantageHolderLine / homeAdvantageSampleSentence are the verbatim templates", () => {
      expect(homeAdvantageHolderLine("Sam", "Player E's")).toBe("Sam, Player E's");
      expect(
        homeAdvantageSampleSentence({ wins: 4, games: 6 }, { wins: 2, games: 14 }),
      ).toBe("won 4 of 6 there, 2 of 14 elsewhere");
    });

    it("homeAdvantageDisplayFacts returns null when nobody has a positive gap", () => {
      expect(homeAdvantageDisplayFacts({ gapPercentagePoints: null, holders: [] })).toBeNull();
    });

    function oneHolder() {
      return {
        playerId: "p1",
        displayName: "Sam",
        locationId: "loc1",
        locationName: "Player E's",
        here: { wins: 4, games: 6, ratePercent: 66.7 },
        elsewhere: { wins: 2, games: 14, ratePercent: 14.3 },
        gapPercentagePoints: 41.7,
      };
    }

    it("a single holder's sample never repeats their own name", () => {
      const facts = homeAdvantageDisplayFacts({ gapPercentagePoints: 41.7, holders: [oneHolder()] });
      expect(facts).not.toBeNull();
      expect(facts!.title).toBe("Home advantage");
      expect(facts!.unit).toBe("points");
      expect(facts!.holderNames).toBe("Sam, Player E's");
      expect(facts!.value).toBe("+41.7");
      expect(facts!.sample).toBe("won 4 of 6 there, 2 of 14 elsewhere");
      expect(facts!.sample.startsWith("Sam")).toBe(false);
      assertNoBannedWords(facts!.claim);
    });

    it("⚠️ criterion 254: joint holders each get their own name-prefixed two-sided sentence, joined by ' · '", () => {
      const second = {
        playerId: "p2",
        displayName: "Player A",
        locationId: "loc2",
        locationName: "The Lake House",
        here: { wins: 3, games: 5, ratePercent: 60 },
        elsewhere: { wins: 1, games: 17, ratePercent: 5.9 },
        gapPercentagePoints: 41.7,
      };
      const facts = homeAdvantageDisplayFacts({
        gapPercentagePoints: 41.7,
        holders: [second, oneHolder()],
      });
      expect(facts!.holderNames).toBe("Player A, The Lake House & Sam, Player E's");
      expect(facts!.sample).toBe(
        "Player A — won 3 of 5 there, 1 of 17 elsewhere · Sam — won 4 of 6 there, 2 of 14 elsewhere",
      );
    });
  });
});

describe("Milestone 4, second slice — the four personality stats (PRD criteria 294–319)", () => {
  describe("looks like cheating (criteria 297–299)", () => {
    it("title and unit are the founder's picks, verbatim", () => {
      expect(LOOKS_LIKE_CHEATING_RECORD_TITLE).toBe("Looks like cheating");
      expect(LOOKS_LIKE_CHEATING_RECORD_UNIT).toBe("points");
    });

    it("looksLikeCheatingSampleSentence matches the founder's example exactly", () => {
      expect(
        looksLikeCheatingSampleSentence(
          { wins: 9, games: 12, ratePercent: 75 },
          { wins: 10, games: 36, ratePercent: 27.6 },
        ),
      ).toBe(
        "Wins 75.0% of their games (9 of 12) — the table wins 27.6% in those same games (10 of 36).",
      );
    });

    it("formatLooksLikeCheatingGap always shows a sign, one decimal — including a negative gap (criterion 298: no floor)", () => {
      expect(formatLooksLikeCheatingGap(47.4)).toBe("+47.4");
      expect(formatLooksLikeCheatingGap(0)).toBe("+0.0");
      expect(formatLooksLikeCheatingGap(-5.2)).toBe("-5.2");
    });

    it("looksLikeCheatingDisplayFacts returns null when nobody has a holder", () => {
      expect(looksLikeCheatingDisplayFacts({ gapPercentagePoints: null, holders: [] })).toBeNull();
    });

    function cheatingHolder() {
      return {
        playerId: "p1",
        displayName: "Player B",
        gamesPlayed: 12,
        own: { wins: 9, games: 12, ratePercent: 75 },
        others: { wins: 10, games: 36, ratePercent: 27.6 },
        gapPercentagePoints: 47.4,
      };
    }

    it("a single holder's sample never repeats their own name, and the claim carries every number", () => {
      const facts = looksLikeCheatingDisplayFacts({ gapPercentagePoints: 47.4, holders: [cheatingHolder()] });
      expect(facts).not.toBeNull();
      expect(facts!.title).toBe("Looks like cheating");
      expect(facts!.unit).toBe("points");
      expect(facts!.holderNames).toBe("Player B");
      expect(facts!.value).toBe("+47.4");
      expect(facts!.sample).toBe(
        "Wins 75.0% of their games (9 of 12) — the table wins 27.6% in those same games (10 of 36).",
      );
      expect(facts!.sample.startsWith("Player B")).toBe(false);
      assertNoBannedWords(facts!.claim);
    });

    it("⚠️ criterion 299: joint holders each get their own name-prefixed sentence, joined by ' · '", () => {
      const second = {
        playerId: "p2",
        displayName: "Player A",
        gamesPlayed: 5,
        own: { wins: 4, games: 5, ratePercent: 80 },
        others: { wins: 2, games: 10, ratePercent: 20 },
        gapPercentagePoints: 47.4,
      };
      const facts = looksLikeCheatingDisplayFacts({
        gapPercentagePoints: 47.4,
        holders: [second, cheatingHolder()],
      });
      expect(facts!.holderNames).toBe("Player A & Player B");
      expect(facts!.sample).toBe(
        "Player A — Wins 80.0% of their games (4 of 5) — the table wins 20.0% in those same games (2 of 10). · " +
          "Player B — Wins 75.0% of their games (9 of 12) — the table wins 27.6% in those same games (10 of 36).",
      );
    });
  });

  describe("getting absolutely wrecked (criteria 300–303)", () => {
    it("gettingWreckedSampleSentence matches the founder's example (formatRecordDate's own rendering — a full 'short weekday, day month year')", () => {
      expect(gettingWreckedSampleSentence(6, "2026-08-02")).toBe(
        `Last place in every one of their last 6 games — since ${formatRecordDate("2026-08-02")}.`,
      );
      expect(gettingWreckedSampleSentence(6, "2026-08-02")).toContain("2 Aug 2026");
    });

    it("recordDisplayFacts: a single holder's 'since' date is the oldest game in the record's own games list", () => {
      const facts = recordDisplayFacts({
        key: "gettingWrecked",
        value: 6,
        holders: [{ playerId: "p1", displayName: "Player C", gamesPlayed: 9 }],
        games: [
          { id: "g1", playedOn: "2026-08-02" } as never,
          { id: "g2", playedOn: "2026-08-09" } as never,
        ],
      });
      expect(facts).not.toBeNull();
      expect(facts!.title).toBe("Getting absolutely wrecked");
      expect(facts!.unit).toBe("games in last place");
      expect(facts!.sample).toBe(
        `Last place in every one of their last 6 games — since ${formatRecordDate("2026-08-02")}.`,
      );
    });

    it("⚠️ joint holders: each one's own 'since' date is read from their own streakOwner-tagged games, not the shared list's oldest", () => {
      const facts = recordDisplayFacts({
        key: "gettingWrecked",
        value: 2,
        holders: [
          { playerId: "p1", displayName: "Bo", gamesPlayed: 5 },
          { playerId: "p2", displayName: "Cy", gamesPlayed: 3 },
        ],
        // `record.games` arrives already oldest→newest (`streakDrillThrough`'s
        // own ordering) — Bo's own earlier game must sort before the shared one.
        games: [
          { id: "g0", playedOn: "2025-12-01", streakOwner: "Bo" } as never, // Bo's own earlier game only.
          { id: "g1", playedOn: "2026-01-01" } as never, // Shared game (no streakOwner) — belongs to both.
        ],
      });
      expect(facts!.sample).toBe(
        `Bo — Last place in every one of their last 2 games — since ${formatRecordDate("2025-12-01")}. · ` +
          `Cy — Last place in every one of their last 2 games — since ${formatRecordDate("2026-01-01")}.`,
      );
    });
  });

  describe("most clutch comeback (criteria 304–306)", () => {
    it("clutchComebackSampleSentence matches the founder's example (formatRecordDate's own rendering)", () => {
      expect(clutchComebackSampleSentence(132, "2025-11-09")).toBe(
        `Won it outright, finishing on 132 · ${formatRecordDate("2025-11-09")}.`,
      );
      expect(clutchComebackSampleSentence(132, "2025-11-09")).toContain("9 Nov 2025");
    });

    it("singleEventDisplayFacts: a single instance states the deficit-holder's own final score, read off the game's winning score", () => {
      const facts = singleEventDisplayFacts({
        key: "clutchComeback",
        value: 71,
        holders: [{ playerId: "p1", displayName: "Player A", gameId: "g1", playedOn: "2025-11-09" }],
        games: [{ id: "g1", winningScore: 132 } as never],
      });
      expect(facts).not.toBeNull();
      expect(facts!.title).toBe("Most clutch comeback");
      expect(facts!.unit).toBe("points down at hand 9");
      expect(facts!.sample).toBe(`Won it outright, finishing on 132 · ${formatRecordDate("2025-11-09")}.`);
      expect(facts!.instances).toBeNull();
      assertNoBannedWords(facts!.claim);
    });

    it("⚠️ a tie (two different games) still renders the ordinary instance-list shape, unchanged", () => {
      const facts = singleEventDisplayFacts({
        key: "clutchComeback",
        value: 20,
        holders: [
          { playerId: "p1", displayName: "Cy", gameId: "g1", playedOn: "2026-01-01" },
          { playerId: "p2", displayName: "Eli", gameId: "g2", playedOn: "2026-01-08" },
        ],
        games: [
          { id: "g1", winningScore: 80 } as never,
          { id: "g2", winningScore: 80 } as never,
        ],
      });
      expect(facts!.sample).toBeNull();
      expect(facts!.instances).toHaveLength(2);
      expect(facts!.instances![0]!.label).toBe("Cy");
      expect(facts!.instances![1]!.label).toBe("Eli");
    });
  });

  describe("the metronome (criteria 307–309)", () => {
    it("title and unit are the founder's picks, verbatim (candidate 2 of 3, not 'Most consistent')", () => {
      expect(METRONOME_RECORD_TITLE).toBe("The metronome");
      expect(METRONOME_RECORD_UNIT).toBe("point range");
    });

    it("metronomeSampleSentence matches the founder's example exactly, and keeps '1 game' honest", () => {
      expect(metronomeSampleSentence(58, 92, 9)).toBe("Best 58, worst 92, from 9 games.");
      expect(metronomeSampleSentence(50, 50, 1)).toBe("Best 50, worst 50, from 1 game.");
    });

    it("metronomeDisplayFacts returns null when nobody has a range yet", () => {
      expect(metronomeDisplayFacts({ range: null, holders: [] })).toBeNull();
    });

    it("⚠️ criterion 309: the sample always states the game count and both ends of the range — never optional, never hidden", () => {
      const facts = metronomeDisplayFacts({
        range: 34,
        holders: [{ playerId: "p1", displayName: "Player E", gamesPlayed: 9, range: 34, highest: 92, lowest: 58 }],
      });
      expect(facts).not.toBeNull();
      expect(facts!.value).toBe("34");
      expect(facts!.sample).toBe("Best 92, worst 58, from 9 games.");
      assertNoBannedWords(facts!.claim);
    });

    it("⚠️ a two-game holder is shown plainly, unhedged (criterion 308: no minimum-games floor)", () => {
      const facts = metronomeDisplayFacts({
        range: 2,
        holders: [{ playerId: "p1", displayName: "Newbie", gamesPlayed: 2, range: 2, highest: 52, lowest: 50 }],
      });
      expect(facts!.sample).toBe("Best 52, worst 50, from 2 games.");
    });

    it("joint holders each get their own name-prefixed sentence, joined by ' · '", () => {
      const facts = metronomeDisplayFacts({
        range: 40,
        holders: [
          { playerId: "p1", displayName: "Amy", gamesPlayed: 3, range: 40, highest: 95, lowest: 55 },
          { playerId: "p2", displayName: "Bo", gamesPlayed: 3, range: 40, highest: 90, lowest: 50 },
        ],
      });
      expect(facts!.holderNames).toBe("Amy & Bo");
      expect(facts!.sample).toBe(
        "Amy — Best 95, worst 55, from 3 games. · Bo — Best 90, worst 50, from 3 games.",
      );
    });
  });
});
