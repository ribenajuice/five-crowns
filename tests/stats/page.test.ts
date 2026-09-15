/**
 * `/stats` — the catalogue index, PRD criteria 236–242. Same shallow "call
 * the async server component, inspect the rendered markup" style as
 * `tests/board/page.test.ts` — no React Testing Library / jsdom in this
 * project.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

vi.mock("@/lib/stats/queries", () => ({
  getStatsPage: vi.fn(),
  SINGLE_HAND_DISASTERS: 10,
}));

describe("/stats — an empty archive", () => {
  it("renders the empty state, not an error", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce({ empty: true });

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("No games yet.");
    expect(html).not.toContain("The eleven-hand trend");
  });
});

describe("/stats — populated (criteria 237–242)", () => {
  function populatedStats() {
    return {
      empty: false as const,
      trend: [
        { hand: 1, label: "3s" as const, mean: 3.1 },
        { hand: 11, label: "Kings" as const, mean: 15.7 },
      ],
      bestGameEver: null,
      worstGameEver: null,
      villains: [
        {
          playerId: "p1",
          displayName: "Player A",
          gamesPlayed: 12,
          hands: [
            { hand: 1, label: "3s" as const, mean: 2.9 },
            { hand: 11, label: "Kings" as const, mean: 16.2 },
          ],
          worstHands: ["Kings" as const],
        },
      ],
      disasters: [
        { playerId: "p1", displayName: "Player E", gameId: "g1", playedOn: "2026-09-05", hand: "Kings" as const, score: 41 },
        { playerId: "p2", displayName: "Player A", gameId: "g2", playedOn: "2026-08-01", hand: "Queens" as const, score: 39 },
        { playerId: "p3", displayName: "Player D", gameId: "g3", playedOn: "2026-08-28", hand: "Kings" as const, score: 28 },
        { playerId: "p4", displayName: "Player E", gameId: "g4", playedOn: "2026-08-01", hand: "Jacks" as const, score: 28 },
      ],
      playerAverages: [
        { playerId: "p1", displayName: "Player A", average: 55.7, gamesPlayed: 12 },
        { playerId: "p2", displayName: "Player D", average: 46.2, gamesPlayed: 9 },
      ],
      rosterAverages: [
        { rosterId: "r1", displayName: "Sunday crew", average: 64.8, gamesPlayed: 9, scoresCount: 40 },
        { rosterId: "r2", displayName: "Player A, B, C & D", average: 51.0, gamesPlayed: 5, scoresCount: 20 },
      ],
      dayOfWeek: [],
      timeOfYear: [],
    };
  }

  it("renders the eleven-hand trend with real text beside every bar, plus the honesty line", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce(populatedStats());

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("The eleven-hand trend");
    expect(html).toContain("3.1");
    expect(html).toContain("15.7");
    expect(html).toContain(
      "These are derived from the running totals — one misread total moves the two hands either side of it in opposite directions.",
    );
    // Criterion 237: the sample states the games and hands behind it, derived
    // from data `getStatsPage` already returned — 9 + 5 = 14 games, (12 + 9) × 11 = 231 hands.
    expect(html).toContain("14 games");
    expect(html).toContain("231 individual hands");
  });

  it("renders the villains table with the worst hand marked", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce(populatedStats());

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("Hand-by-hand villains");
    expect(html).toContain("Player A");
    expect(html).toContain("from 12 games");
    expect(html).toContain("16.2");
  });

  it("⚠️ criterion 240: ties at the last place both keep the same rank", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce(populatedStats());

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("Biggest single-hand disasters");
    // Two rows share score 28 — both should read rank 3 (two strictly-higher scores ahead of them).
    const rank3Occurrences = html.match(/>3</g) ?? [];
    expect(rank3Occurrences.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("/games/g3");
    expect(html).toContain("/games/g4");
  });

  it("⚠️ criterion 242: no ranking decoration on the averages table — plain alphabetical lists", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce(populatedStats());

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("Averages");
    expect(html).toContain("Players");
    expect(html).toContain("Rosters");
    expect(html).toContain("55.7");
    expect(html).toContain("64.8");
    expect(html).toContain("9 games · 40 scores");
    expect(html).not.toContain("🥇");
  });

  it("the AppBar links back to the board, labelled accordingly", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce(populatedStats());

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("Back to the board");
    expect(html).toContain('href="/"');
  });

  it("⚠️ criteria 265–267: day-of-week and time-of-year render every fixed row, with the no-data string at zero games, never a 0.0", async () => {
    const { getStatsPage } = await import("@/lib/stats/queries");
    vi.mocked(getStatsPage).mockResolvedValueOnce({
      ...populatedStats(),
      dayOfWeek: [
        { label: "Monday", gamesPlayed: 2, scoresCount: 8, average: 54.1 },
        { label: "Tuesday", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "Wednesday", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "Thursday", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "Friday", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "Saturday", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "Sunday", gamesPlayed: 0, scoresCount: 0, average: null },
      ],
      timeOfYear: [
        { label: "January", gamesPlayed: 0, scoresCount: 0, average: null },
        { label: "September", gamesPlayed: 2, scoresCount: 8, average: 63.5 },
      ],
    });

    const { default: StatsPage } = await import("@/app/stats/page");
    const html = renderToStaticMarkup(await StatsPage());

    expect(html).toContain("Day of the week");
    expect(html).toContain(
      "Games played and the mean final score posted, by day of the week.",
    );
    expect(html).toContain("Monday");
    expect(html).toContain("54.1");
    expect(html).toContain("2 games · 8 scores");
    expect(html).toContain("Wednesday");
    expect(html).not.toMatch(/Wednesday[\s\S]{0,120}0\.0/);

    expect(html).toContain("Time of year");
    expect(html).toContain(
      "Games played and the mean final score posted, by calendar month.",
    );
    expect(html).toContain("September");
    expect(html).toContain("63.5");

    // Criterion 267: no ranking decoration of any kind.
    expect(html).not.toContain("🥇");
    expect(html).not.toContain("best day");
    expect(html).not.toContain("worst month");
  });
});
