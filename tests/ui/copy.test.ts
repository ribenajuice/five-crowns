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
