/**
 * `/` — the records board, PRD criteria 179–196. Same shallow
 * "call the async server component, inspect the rendered markup" style as
 * `tests/players/page.test.ts` / `tests/places/page.test.ts` — no React
 * Testing Library / jsdom in this project.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HandLabel } from "@/lib/scoring";

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

vi.mock("@/lib/board/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/board/queries")>();
  return { ...actual, getBoard: vi.fn() };
});

function holder(displayName: string, gamesPlayed: number) {
  return { playerId: displayName, displayName, gamesPlayed };
}

function game(id: string, playedOn: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    playedOn,
    locationName: "The Deck",
    rosterId: "r1",
    rosterName: "Thursday crew",
    winners: ["Player A"],
    winningScore: 50,
    ...overrides,
  };
}

describe("/ — empty archive (criterion 191)", () => {
  it("renders the empty state, BoardNav still reachable, and no record card", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: Home } = await import("@/app/page");
    const element = await Home();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No games yet.");
    expect(html).toContain("Once you save one, the board will show who&#x27;s who.");
    expect(html).toContain("Add a game");
    expect(html).toContain("Games");
    expect(html).not.toContain("games in the record");
  });
});

describe("/ — early days (criteria 182, 183)", () => {
  it("renders the exact early-days line with the archive count, and every record's holder and number", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 3,
      singleEventRecords: [],
      earlyDays: true,
      records: [
        {
          key: "mostWins",
          value: 2,
          holders: [holder("Player A", 3)],
          games: [game("g1", "2026-01-01"), game("g2", "2026-01-08")],
        },
        {
          key: "mostWinsInARow",
          value: 1,
          holders: [holder("Player A", 3), holder("Player B", 2)],
          games: [game("g1", "2026-01-01"), game("g2", "2026-01-08")],
        },
        {
          key: "lowestAverageScore",
          value: 41,
          holders: [holder("Player E", 1)],
          games: [game("g3", "2026-01-01")],
        },
        {
          key: "mostRoundsWon",
          value: 9,
          holders: [holder("Player C", 3)],
          games: [game("g1", "2026-01-01")],
        },
        {
          key: "stalwart",
          value: 3,
          holders: [holder("Player A", 3), holder("Player C", 3), holder("Player D", 3)],
          games: [game("g1", "2026-01-01")],
        },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain(
      "Early days — 3 games in the record. A single game can still change any of these.",
    );
    // Under criterion 182, the archive size is not printed a second time.
    expect(html).not.toContain("3 games in the record.</div>");

    expect(html).toContain("Most wins");
    expect(html).toContain("Player A");
    expect(html).toContain("from 3 games");

    expect(html).toContain("Lowest average score");
    expect(html).toContain("41.0");
    expect(html).toContain("Player E");
    expect(html).toContain("from 1 game<");

    // The stalwart card never repeats its own headline figure as a sample:
    // "from " appears once per single-holder record (mostWins, lowestAverageScore,
    // mostRoundsWon) plus once per holder of the joint streak (2) — five
    // occurrences, each rendered twice (once in the card's visible sample
    // line, once in the link's own `aria-label`, which states the claim in
    // full for a screen reader) — ten total, none of them the stalwart's.
    expect(html).toContain("games played");
    expect((html.match(/from \d+ games?/g) ?? []).length).toBe(10);
  });

  it("⚠️ 3+ joint holders render every name, alphabetically, with no truncation ('and N others')", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 3,
      singleEventRecords: [],
      earlyDays: true,
      records: [
        {
          key: "stalwart",
          value: 3,
          // Deliberately out of alphabetical order — rosterDisplayName must fix it.
          holders: [holder("Player D", 3), holder("Player A", 3), holder("Player C", 3)],
          games: [game("g1", "2026-01-01")],
        },
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Player A, Player C &amp; Player D");
    expect(html).not.toContain("and 1 other");
    expect(html).not.toContain("and 2 others");
  });

  it("a no-holder record renders the fixed sentence, never a warning, and drops the chevron/link", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 2,
      singleEventRecords: [],
      earlyDays: true,
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Nobody&#x27;s done this yet.");
    expect(html).not.toContain("/records/mostWins");
  });
});

describe("/ — steady state at and past EARLY_DAYS_BELOW (criterion 183: absent, not reworded)", () => {
  it("exactly at 10 games, the early-days line is gone and only the plain count remains", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 10,
      singleEventRecords: [],
      earlyDays: false,
      records: [
        {
          key: "mostWins",
          value: 4,
          holders: [holder("Player C", 10), holder("Player E", 6)],
          games: [game("g1", "2026-01-01")],
        },
        { key: "mostWinsInARow", value: 3, holders: [holder("Player D", 10)], games: [game("g2", "2026-01-01")] },
        { key: "lowestAverageScore", value: 68.4, holders: [holder("Player B", 10)], games: [game("g3", "2026-01-01")] },
        { key: "mostRoundsWon", value: 20, holders: [holder("Player A", 10)], games: [game("g4", "2026-01-01")] },
        { key: "stalwart", value: 10, holders: [holder("Player A", 10)], games: [game("g5", "2026-01-01")] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).not.toContain("Early days");
    expect(html).not.toContain("A single game can still change any of these.");
    expect(html).toContain("10 games in the record.");
    // Joint "most wins" holders each get their own sample.
    expect(html).toContain("Player C — from 10 games");
    expect(html).toContain("Player E — from 6 games");
  });
});

function singleEventHolder(displayName: string, gameId: string, playedOn: string, hand?: HandLabel) {
  return { playerId: displayName, displayName, gameId, playedOn, ...(hand ? { hand } : {}) };
}

describe("/ — Stage 3's five single-event cards (criteria 228–235)", () => {
  it("renders the ordinary one-holder card with a date, not a game count", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
      ],
      singleEventRecords: [
        {
          key: "worstGameEver",
          value: 178,
          holders: [singleEventHolder("Player B", "g1", "2026-09-05")],
          games: [game("g1", "2026-09-05")],
        },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Worst game ever");
    expect(html).toContain("Player B");
    expect(html).toContain("178");
    expect(html).toContain("final score");
    // Criterion 233: a date, never a game count — the exact weekday/month
    // abbreviation is locale-rendering detail (not asserted here, same as
    // every other date-formatting component in this codebase); what matters
    // is "on {date}" replaces "from {n} games" entirely.
    expect(html).toMatch(/on [A-Za-z]+,? 5 Sept?\.? 2026/);
    expect(html).not.toContain("from 1 game");
    expect(html).not.toContain("games</p>");
  });

  it("⚠️ a tie renders the instance-list variant — two rows, each with its own date", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
      ],
      singleEventRecords: [
        {
          key: "bestGameEver",
          value: 28,
          holders: [
            singleEventHolder("Player A", "g1", "2026-08-28"),
            singleEventHolder("Player D", "g2", "2026-07-12"),
          ],
          games: [game("g1", "2026-08-28"), game("g2", "2026-07-12")],
        },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Best game ever");
    expect(html).toContain("28");
    expect(html).toContain("Player A");
    expect(html).toMatch(/28 Aug/);
    expect(html).toContain("Player D");
    expect(html).toMatch(/12 Jul/);
    // Alphabetical by player, not by date (component inventory, `RecordCard` — instance list).
    expect(html.indexOf("Player A")).toBeLessThan(html.indexOf("Player D"));
  });

  it("the catastrophe names the hand even with one holder", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
      ],
      singleEventRecords: [
        {
          key: "catastrophe",
          value: 41,
          holders: [singleEventHolder("Player E", "g1", "2026-09-05", "Kings")],
          games: [game("g1", "2026-09-05")],
        },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("The catastrophe");
    expect(html).toContain("41");
    expect(html).toContain("points in one hand");
    expect(html).toMatch(/Kings · [A-Za-z]+,? 5 Sept?\.? 2026/);
  });

  it("the board reaches /stats in one tap", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      singleEventRecords: [],
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("/stats");
    expect(html).toContain("See all the stats");
  });
});

describe("/ — every card links to its own drill-through", () => {
  it("each record's href is /records/{key}", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 12,
      singleEventRecords: [],
      earlyDays: false,
      records: [
        { key: "mostWins", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "mostWinsInARow", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "lowestAverageScore", value: 40, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "mostRoundsWon", value: 5, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "stalwart", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    for (const key of ["mostWins", "mostWinsInARow", "lowestAverageScore", "mostRoundsWon", "stalwart"]) {
      expect(html).toContain(`/records/${key}`);
    }
  });
});
