import { describe, expect, it } from "vitest";

import { localCalendarDay } from "@/lib/ui/local-date";

describe("localCalendarDay", () => {
  it("formats as YYYY-MM-DD, zero-padded", () => {
    expect(localCalendarDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localCalendarDay(new Date(2026, 8, 11, 0, 0))).toBe("2026-09-11");
  });

  it("reads the local calendar day, not the UTC one — the whole point (ARCHITECTURE.md, `game.played_on`)", () => {
    // 2026-09-11 00:30 in a UTC+10/+11 local time is still 2026-09-10 in UTC.
    // localCalendarDay must read the *local* fields, never toISOString().
    const localMidnightThirty = new Date(2026, 8, 11, 0, 30);
    expect(localCalendarDay(localMidnightThirty)).toBe("2026-09-11");
  });
});
