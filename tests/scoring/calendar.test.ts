/**
 * Day-of-week and calendar-month derivation — PRD criteria 255, 265–266.
 */

import { describe, expect, it } from "vitest";

import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  dayOfWeekTable,
  monthIndex,
  timeOfYearTable,
  weekdayIndex,
  type TimeSliceInput,
} from "@/lib/scoring";

describe("weekdayIndex — criterion 255 (no Date object, ever)", () => {
  it("known Sundays land on index 6", () => {
    // 2023-01-01 and 2026-09-13 are both verified Sundays.
    expect(weekdayIndex("2023-01-01")).toBe(6);
    expect(weekdayIndex("2026-09-13")).toBe(6);
  });

  it("a known Monday lands on index 0", () => {
    expect(weekdayIndex("2026-09-14")).toBe(0);
  });

  it("is stable across a month boundary", () => {
    // 2024-01-31 is a Wednesday, 2024-02-01 the very next day is a Thursday.
    expect(weekdayIndex("2024-01-31")).toBe(2);
    expect(weekdayIndex("2024-02-01")).toBe(3);
  });

  it("is stable over a leap day", () => {
    // 2024-02-29 is a verified Thursday.
    expect(weekdayIndex("2024-02-29")).toBe(3);
    expect(weekdayIndex("2024-03-01")).toBe(4);
  });

  it("⚠️ is unaffected by the process's own timezone — pure arithmetic, no Date construction", () => {
    const originalTz = process.env.TZ;
    try {
      for (const tz of ["UTC", "Australia/Adelaide", "America/Los_Angeles"]) {
        process.env.TZ = tz;
        expect(weekdayIndex("2026-09-13")).toBe(6);
      }
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  it("throws on a value that isn't a calendar date", () => {
    expect(() => weekdayIndex("not-a-date")).toThrow();
  });
});

describe("monthIndex — criteria 255, 266", () => {
  it("reads the month straight off the string", () => {
    expect(monthIndex("2026-01-15")).toBe(0);
    expect(monthIndex("2026-12-31")).toBe(11);
  });
});

describe("dayOfWeekTable — criterion 265", () => {
  it("always renders seven rows, Monday through Sunday, in that fixed order", () => {
    const table = dayOfWeekTable([]);
    expect(table).toHaveLength(7);
    expect(table.map((r) => r.label)).toEqual([...WEEKDAY_LABELS]);
  });

  it("an empty day shows null (no-data), never a zero", () => {
    const rows: TimeSliceInput[] = [{ gameId: "g1", playedOn: "2026-09-14", finalScore: 50 }]; // Monday
    const table = dayOfWeekTable(rows);
    const monday = table.find((r) => r.label === "Monday")!;
    expect(monday.gamesPlayed).toBe(1);
    expect(monday.average).toBe(50);
    const tuesday = table.find((r) => r.label === "Tuesday")!;
    expect(tuesday.gamesPlayed).toBe(0);
    expect(tuesday.scoresCount).toBe(0);
    expect(tuesday.average).toBeNull();
  });

  it("games played is a distinct game count, not a row count of final scores", () => {
    const rows: TimeSliceInput[] = [
      { gameId: "g1", playedOn: "2026-09-14", finalScore: 40 },
      { gameId: "g1", playedOn: "2026-09-14", finalScore: 60 },
      { gameId: "g1", playedOn: "2026-09-14", finalScore: 80 },
    ];
    const table = dayOfWeekTable(rows);
    const monday = table.find((r) => r.label === "Monday")!;
    expect(monday.gamesPlayed).toBe(1);
    expect(monday.scoresCount).toBe(3);
    expect(monday.average).toBe(60);
  });
});

describe("timeOfYearTable — criterion 266", () => {
  it("always renders twelve rows, January through December, in that fixed order", () => {
    const table = timeOfYearTable([]);
    expect(table).toHaveLength(12);
    expect(table.map((r) => r.label)).toEqual([...MONTH_LABELS]);
  });

  it("groups by calendar month regardless of year", () => {
    const rows: TimeSliceInput[] = [
      { gameId: "g1", playedOn: "2024-09-01", finalScore: 40 },
      { gameId: "g2", playedOn: "2026-09-30", finalScore: 60 },
    ];
    const table = timeOfYearTable(rows);
    const september = table.find((r) => r.label === "September")!;
    expect(september.gamesPlayed).toBe(2);
    expect(september.average).toBe(50);
  });
});
