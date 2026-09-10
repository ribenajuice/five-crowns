import { describe, expect, it } from "vitest";

import { validateColumn, validateGrid } from "@/lib/scoring";
import { FIXTURE_SHEETS, SHEET_01 } from "../fixtures/sheets";

const gridFor = (sheet: (typeof FIXTURE_SHEETS)[number]) =>
  sheet.columns.map((column, i) => ({
    id: `col_${i}`,
    playerId: column.player,
    values: column.runningTotals,
  }));

describe("validateColumn — the two verified fixture grids", () => {
  for (const sheet of FIXTURE_SHEETS) {
    for (const column of sheet.columns) {
      it(`${sheet.file}: ${column.player}'s column is saveable with no issues`, () => {
        const result = validateColumn(column.runningTotals);
        expect(result.issues).toEqual([]);
        expect(result.ok).toBe(true);
        expect(result.filled).toBe(11);
      });
    }
  }
});

describe("validateGrid — the two verified fixture grids", () => {
  for (const sheet of FIXTURE_SHEETS) {
    it(`${sheet.file} saves`, () => {
      const result = validateGrid(gridFor(sheet));
      expect(result.issues).toEqual([]);
      expect(result.ok).toBe(true);
    });
  }
});

describe("validateColumn — what blocks a save", () => {
  it("blocks a column of ten and says '10 of 11'", () => {
    const short = [...SHEET_01.columns[0]!.runningTotals.slice(0, 10)];
    const result = validateColumn(short);

    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("wrong_length");
    expect(result.issues[0]!.message).toBe("10 of 11 rows.");
  });

  it("blocks a column of twelve after an insert", () => {
    const long = [...SHEET_01.columns[0]!.runningTotals, 140];
    expect(validateColumn(long).issues[0]!.message).toBe("12 of 11 rows.");
  });

  it("blocks an unread cell and reports it as a gap, not a shorter game", () => {
    const values: (number | null)[] = [...SHEET_01.columns[0]!.runningTotals];
    values[6] = null;

    const result = validateColumn(values);
    expect(result.ok).toBe(false);
    expect(result.filled).toBe(10);
    const issue = result.issues.find((i) => i.code === "unread_cells")!;
    expect(issue.message).toBe("10 of 11 numbers. Fill in the rest.");
    expect(issue.indices).toEqual([6]);
  });

  it("blocks a column that stops climbing and names both numbers", () => {
    const edited = [28, 32, 60, 71, 74, 70, 118, 123, 123, 123, 137];
    const result = validateColumn(edited);

    expect(result.ok).toBe(false);
    const issue = result.issues.find((i) => i.code === "not_monotonic")!;
    expect(issue.message).toBe("70 is lower than the 74 above it.");
    expect(issue.indices).toEqual([4, 5]);
    expect(result.flaggedIndices).toEqual([4, 5]);
  });

  it("blocks a negative running total", () => {
    const values = [...SHEET_01.columns[0]!.runningTotals];
    values[0] = -1;
    expect(
      validateColumn(values).issues.some((i) => i.code === "out_of_range"),
    ).toBe(true);
  });

  it("blocks a non-integer running total", () => {
    const values = [...SHEET_01.columns[0]!.runningTotals];
    values[3] = 71.5;
    expect(
      validateColumn(values).issues.some((i) => i.code === "not_an_integer"),
    ).toBe(true);
  });
});

describe("validateColumn — what must NEVER block a save", () => {
  it("never objects to six identical values in a row", () => {
    const playerD = SHEET_01.columns.find((c) => c.player === "Player D")!;
    expect(validateColumn(playerD.runningTotals).issues).toEqual([]);
  });

  it("never objects to a genuine 51-point hand", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    expect(validateColumn(playerB.runningTotals).ok).toBe(true);
  });

  it("never objects to a column starting at 0", () => {
    const playerB = SHEET_01.columns.find((c) => c.player === "Player B")!;
    expect(playerB.runningTotals[0]).toBe(0);
    expect(validateColumn(playerB.runningTotals).ok).toBe(true);
  });
});

describe("validateGrid — the grid as a whole", () => {
  it("blocks a game with only one player assigned", () => {
    const grid = gridFor(SHEET_01).map((c, i) => ({
      ...c,
      playerId: i === 0 ? c.playerId : null,
    }));
    const result = validateGrid(grid);

    expect(result.ok).toBe(false);
    expect(result.issues[0]!.message).toBe(
      "A game needs at least 2 players. 1 so far.",
    );
  });

  it("blocks the whole grid when one column is short", () => {
    const grid = gridFor(SHEET_01);
    grid[2] = { ...grid[2]!, values: grid[2]!.values.slice(0, 10) };

    const result = validateGrid(grid);
    expect(result.ok).toBe(false);
    expect(result.columns["col_2"]!.ok).toBe(false);
    expect(result.columns["col_0"]!.ok).toBe(true);
  });

  it("blocks an empty grid", () => {
    expect(validateGrid([]).ok).toBe(false);
  });
});
