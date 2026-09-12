import { describe, expect, it } from "vitest";

import { validateGrid, type GridColumn } from "@/lib/scoring";
import { SHEET_01 } from "../fixtures/sheets";
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
  columnStatusLabel,
  pairedFlagSentence,
  readHintSentence,
  saveBlockedMessage,
  sharedWinGamesListLabel,
  sharedWinnerConfirmation,
  softWarningSentence,
  soleWinnerConfirmation,
  winnerConfirmation,
} from "@/lib/ui/copy";

const BANNED_WORDS = [
  "checked",
  "validated",
  "verified",
  "confirmed",
  "correct",
  "looks right",
  "all good",
];

function assertNoBannedWords(sentence: string) {
  const lower = sentence.toLowerCase();
  for (const word of BANNED_WORDS) {
    expect(lower).not.toContain(word);
  }
}

const gridFor = (columns: { player: string; runningTotals: (number | null)[] }[]): GridColumn[] =>
  columns.map((c, i) => ({ id: `col_${i}`, playerId: c.player, values: c.runningTotals }));

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
