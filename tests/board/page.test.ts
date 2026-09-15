/**
 * `/` — the records board, PRD criteria 179–196. Same shallow
 * "call the async server component, inspect the rendered markup" style as
 * `tests/players/page.test.ts` / `tests/places/page.test.ts` — no React
 * Testing Library / jsdom in this project.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HandLabel } from "@/lib/scoring";

import type { Board, BoardData } from "@/lib/board/queries";

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

// `getBoardData` is stubbed alongside `getBoard`, not left real: it's now
// `app/page.tsx`'s own shared fetch (code review fix — `getBoard()` and
// `getFunFacts()` both read from it), and this file's whole point is a real
// `db.select(...)` never runs here (see the `getFunFacts` comment below,
// which predates this and makes the same point about that call).
const STUB_BOARD_DATA = {} as BoardData;

vi.mock("@/lib/board/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/board/queries")>();
  return { ...actual, getBoard: vi.fn(), getBoardData: vi.fn(async () => STUB_BOARD_DATA) };
});

// Milestone 4, first slice: every existing test in this file predates fun
// facts and asserts nothing about them, so the pool defaults to empty here —
// `getFunFacts` is a real `db.select(...)` call otherwise, which this
// shallow-render style never wants any of its tests reaching for. The
// dedicated "fun facts" describe block below overrides this per test.
vi.mock("@/lib/board/facts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/board/facts")>();
  return { ...actual, getFunFacts: vi.fn(async () => []) };
});

function holder(displayName: string, gamesPlayed: number) {
  return { playerId: displayName, displayName, gamesPlayed };
}

function game(id: string, playedOn: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    playedOn,
    createdAt: `${playedOn}T00:00:00.000Z`,
    locationName: "The Deck",
    rosterId: "r1",
    rosterName: "Thursday crew",
    winners: ["Player A"],
    winningScore: 50,
    ...overrides,
  };
}

/** A minimal non-empty board — the fun facts tests below don't care about
 *  the five records themselves, only that the board isn't in its empty state. */
function minimalBoard(): Board {
  return {
    empty: false,
    archiveGameCount: 12,
    earlyDays: false,
    records: [
      { key: "mostWins", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      { key: "mostWinsInARow", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      { key: "lowestAverageScore", value: 40, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      { key: "mostRoundsWon", value: 5, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      { key: "stalwart", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
      { key: "gettingWrecked", value: null, holders: [], games: [] },
    ],
    homeAdvantage: { gapPercentagePoints: null, holders: [] },
    looksLikeCheating: { gapPercentagePoints: null, holders: [] },
    metronome: { range: null, holders: [] },
    singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
  };
}

describe("/ — empty archive (criterion 191)", () => {
  it(
    "renders the empty state, BoardNav still reachable, and no record card",
    async () => {
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
    },
    // QA fix: this is the first test in the file to `import("@/app/page")` —
    // a cold transform-and-load of the board page's whole module graph
    // (every card component, `lib/board/queries`, `lib/ui/copy`'s 1700+
    // lines) under `fileParallelism`'s full worker concurrency. Observed
    // flaking past the 5s default under load with no code defect behind
    // it — the assertions themselves run in milliseconds once the import
    // resolves. A flaky test is a bug (this project's own QA rule); the fix
    // here is a longer allowance for the one-time cold import, not a retry.
    20_000,
  );
});

describe("/ — early days (criteria 182, 183)", () => {
  it("renders the exact early-days line with the archive count, and every record's holder and number", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 3,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
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
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
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
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
      earlyDays: true,
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
        { key: "gettingWrecked", value: null, holders: [], games: [] },
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
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [
        {
          key: "worstGameEver",
          value: 178,
          holders: [singleEventHolder("Player B", "g1", "2026-09-05")],
          games: [game("g1", "2026-09-05")],
        },
        { key: "clutchComeback", value: null, holders: [], games: [] },
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
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
        { key: "clutchComeback", value: null, holders: [], games: [] },
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
        { key: "gettingWrecked", value: null, holders: [], games: [] },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [
        {
          key: "catastrophe",
          value: 41,
          holders: [singleEventHolder("Player E", "g1", "2026-09-05", "Kings")],
          games: [game("g1", "2026-09-05")],
        },
        { key: "clutchComeback", value: null, holders: [], games: [] },
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
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
      records: [
        { key: "mostWins", value: null, holders: [], games: [] },
        { key: "mostWinsInARow", value: null, holders: [], games: [] },
        { key: "lowestAverageScore", value: null, holders: [], games: [] },
        { key: "mostRoundsWon", value: null, holders: [], games: [] },
        { key: "stalwart", value: null, holders: [], games: [] },
        { key: "gettingWrecked", value: null, holders: [], games: [] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("/stats");
    expect(html).toContain("See all the stats");
  });
});

describe("/ — the thirteenth card, home advantage (M3 Stage 4, criteria 253–254, 268–270)", () => {
  function minimalRecords() {
    return [
      { key: "mostWins" as const, value: null, holders: [], games: [] },
      { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
      { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
      { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
      { key: "stalwart" as const, value: null, holders: [], games: [] },
      { key: "gettingWrecked" as const, value: null, holders: [], games: [] },
    ];
  }

  const minimalSingleEventRecords = () => [
    { key: "clutchComeback" as const, value: null, holders: [], games: [] },
  ];

  it("renders the ordinary card: the player, the venue named, the gap in points, both sides of the sample", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: minimalSingleEventRecords(),
      homeAdvantage: {
        gapPercentagePoints: 41.7,
        holders: [
          {
            playerId: "p1",
            displayName: "Sam",
            locationId: "loc1",
            locationName: "Player E's",
            here: { wins: 4, games: 6, ratePercent: 66.7 },
            elsewhere: { wins: 2, games: 14, ratePercent: 14.3 },
            gapPercentagePoints: 41.7,
            games: [game("g1", "2026-09-05")],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Home advantage");
    expect(html).toContain("Sam, Player E&#x27;s");
    expect(html).toContain("+41.7");
    expect(html).toContain("points");
    expect(html).toContain("won 4 of 6 there, 2 of 14 elsewhere");
    expect(html).not.toContain("+41.7%");
    expect(html).toContain("/records/homeAdvantage");
  });

  it("⚠️ criterion 254: joint holders list every (player, venue) pair, each with its own two-sided sample", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: minimalSingleEventRecords(),
      homeAdvantage: {
        gapPercentagePoints: 41.7,
        holders: [
          {
            playerId: "p2",
            displayName: "Player A",
            locationId: "loc2",
            locationName: "The Lake House",
            here: { wins: 3, games: 5, ratePercent: 60 },
            elsewhere: { wins: 1, games: 17, ratePercent: 5.9 },
            gapPercentagePoints: 41.7,
            games: [game("g2", "2026-08-01")],
          },
          {
            playerId: "p1",
            displayName: "Sam",
            locationId: "loc1",
            locationName: "Player E's",
            here: { wins: 4, games: 6, ratePercent: 66.7 },
            elsewhere: { wins: 2, games: 14, ratePercent: 14.3 },
            gapPercentagePoints: 41.7,
            games: [game("g1", "2026-09-05")],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Player A, The Lake House &amp; Sam, Player E&#x27;s");
    expect(html).toContain("Player A — won 3 of 5 there, 1 of 17 elsewhere");
    expect(html).toContain("Sam — won 4 of 6 there, 2 of 14 elsewhere");
  });

  it("⚠️ criterion 254: nobody with a positive gap renders the ordinary no-holder sentence, crowning nobody", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: minimalSingleEventRecords(),
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Home advantage");
    expect(html).toContain("Nobody&#x27;s done this yet.");
  });

  it("⚠️ criterion 254: a one-game venue is shown holding it plainly, with no hedge", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: minimalSingleEventRecords(),
      homeAdvantage: {
        gapPercentagePoints: 100,
        holders: [
          {
            playerId: "p3",
            displayName: "Player D",
            locationId: "loc3",
            locationName: "The Rec Hall",
            here: { wins: 1, games: 1, ratePercent: 100 },
            elsewhere: { wins: 0, games: 3, ratePercent: 0 },
            gapPercentagePoints: 100,
            games: [game("g3", "2026-07-01")],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Player D, The Rec Hall");
    expect(html).toContain("won 1 of 1 there, 0 of 3 elsewhere");
  });
});

describe("/ — the four personality stats, appended after home advantage (M4 second slice, criteria 294–319)", () => {
  function minimalRecords(extra: import("@/lib/board/queries").BoardRecord) {
    return [
      { key: "mostWins" as const, value: null, holders: [], games: [] },
      { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
      { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
      { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
      { key: "stalwart" as const, value: null, holders: [], games: [] },
      extra,
    ];
  }

  it("renders all four with no holder, and no crash, when nobody holds any of them yet (criterion 185)", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords({ key: "gettingWrecked", value: null, holders: [], games: [] }),
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Looks like cheating");
    expect(html).toContain("Getting absolutely wrecked");
    expect(html).toContain("Most clutch comeback");
    expect(html).toContain("The metronome");
    // QA bug fix, M4 second slice: criterion 312 fixes each of these four
    // its own no-holder sentence — they are NOT the shared generic
    // "Nobody's done this yet." every other record's no-holder card uses.
    expect(html).toContain("Nobody&#x27;s numbers look suspicious yet.");
    expect(html).toContain("Nobody&#x27;s currently getting wrecked.");
    expect(html).toContain("Nobody&#x27;s clawed one back yet.");
    expect(html).toContain("Nobody&#x27;s earned a range yet");
  });

  it("renders every holder, with the founder's own sentence shapes, and links to its own drill-through", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords({
        key: "gettingWrecked",
        value: 6,
        holders: [holder("Player C", 9)],
        games: [game("g1", "2026-08-02")],
      }),
      singleEventRecords: [
        {
          key: "clutchComeback",
          value: 71,
          holders: [{ playerId: "p1", displayName: "Player A", gameId: "g1", playedOn: "2025-11-09" }],
          games: [game("g1", "2025-11-09", { winningScore: 132 })],
        },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: {
        gapPercentagePoints: 47.4,
        holders: [
          {
            playerId: "p2",
            displayName: "Player B",
            gamesPlayed: 12,
            own: { wins: 9, games: 12, ratePercent: 75 },
            others: { wins: 10, games: 36, ratePercent: 27.6 },
            gapPercentagePoints: 47.4,
            games: [game("g2", "2026-01-01")],
          },
        ],
      },
      metronome: {
        range: 34,
        holders: [
          {
            playerId: "p3",
            displayName: "Player E",
            gamesPlayed: 9,
            range: 34,
            highest: 92,
            lowest: 58,
            games: [game("g3", "2026-02-01")],
          },
        ],
      },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Looks like cheating");
    expect(html).toContain("Player B");
    expect(html).toContain("+47.4");
    expect(html).toContain(
      "Wins 75.0% of their games (9 of 12) — the table wins 27.6% in those same games (10 of 36).",
    );
    expect(html).toContain("/records/looksLikeCheating");

    expect(html).toContain("Getting absolutely wrecked");
    expect(html).toContain("Player C");
    expect(html).toContain("Last place in every one of their last 6 games");
    expect(html).toContain("/records/gettingWrecked");

    expect(html).toContain("Most clutch comeback");
    expect(html).toContain("Player A");
    expect(html).toContain("Won it outright, finishing on 132");
    expect(html).toContain("/records/clutchComeback");

    expect(html).toContain("The metronome");
    expect(html).toContain("Player E");
    // Criterion 309: the game count and both ends of the range are plainly on
    // the card. QA bug fix, M4 second slice: "Best" is the lower (better) score.
    expect(html).toContain("Best 58, worst 92, from 9 games.");
    expect(html).toContain("/records/metronome");

    // The board's fixed order: home advantage, then cheating, wrecked, comeback, metronome.
    const order = ["Home advantage", "Looks like cheating", "Getting absolutely wrecked", "Most clutch comeback", "The metronome"];
    const indices = order.map((title) => html.indexOf(`>${title}<`));
    for (const i of indices) expect(i).toBeGreaterThan(-1);
    for (let i = 1; i < indices.length; i++) expect(indices[i]!).toBeGreaterThan(indices[i - 1]!);
  });

  it("⚠️ the board carries exactly seventeen cards, in the same responsive grid as before — no new wrapper, no layout change", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords({ key: "gettingWrecked", value: null, holders: [], games: [] }),
      singleEventRecords: [
        { key: "bestGameEver", value: null, holders: [], games: [] },
        { key: "worstGameEver", value: null, holders: [], games: [] },
        { key: "catastrophe", value: null, holders: [], games: [] },
        { key: "cleanestSheet", value: null, holders: [], games: [] },
        { key: "biggestHammering", value: null, holders: [], games: [] },
        { key: "clutchComeback", value: null, holders: [], games: [] },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    // One grid wrapper, unchanged class list (`sm:grid-cols-2`, `gap-3`).
    expect((html.match(/grid grid-cols-1 gap-3 sm:grid-cols-2/g) ?? []).length).toBe(1);
    // Five founder's + stalwart + drought/nearlyMan aren't in this minimal
    // fixture, but every card that *is* present renders exactly once — the
    // count below is records(6) + singleEventRecords(6) + homeAdvantage(1) +
    // looksLikeCheating(1) + metronome(1) = 15 titles; this fixture omits
    // drought/nearlyMan, so it isn't the real seventeen, only a layout check.
    expect((html.match(/text-xs font-bold uppercase tracking-label text-text-muted/g) ?? []).length).toBe(15);
  });
});

describe("/ — every card links to its own drill-through", () => {
  it("each record's href is /records/{key}", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 12,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "clutchComeback", value: null, holders: [], games: [] }],
      earlyDays: false,
      records: [
        { key: "mostWins", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "mostWinsInARow", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "lowestAverageScore", value: 40, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "mostRoundsWon", value: 5, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "stalwart", value: 1, holders: [holder("Player A", 1)], games: [game("g1", "2026-01-01")] },
        { key: "gettingWrecked", value: null, holders: [], games: [] },
      ],
    });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    for (const key of ["mostWins", "mostWinsInARow", "lowestAverageScore", "mostRoundsWon", "stalwart"]) {
      expect(html).toContain(`/records/${key}`);
    }
  });
});

describe("/ — fun facts (PRD criteria 281–293, Milestone 4 first slice)", () => {
  it("an empty archive never calls the fact pool, and shows no fact slot", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(getFunFacts).not.toHaveBeenCalled();
    expect(html).not.toContain("border-dashed");
  });

  it("an empty pool over a non-empty archive renders no fact slot at all — not an empty one (criterion 292)", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).not.toContain("border-dashed");
    // The rest of the board still renders normally.
    expect(html).toContain("Add a game");
  });

  it("the flatliner: player, run length and the game's own date, links straight to that game", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      {
        key: "flatliner",
        playerId: "p1",
        displayName: "Cody",
        gameId: "g99",
        playedOn: "2026-02-01",
        runLength: 5,
      },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Cody put up exactly nothing for 5 hands straight");
    expect(html).toContain("/games/g99");
  });

  it("current drought: names the player and the count, links to their own page (no gameId on this fact)", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      { key: "currentDrought", playerId: "p2", displayName: "Priya", gamesSinceWin: 7 },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("It&#x27;s been 7 games since Priya last won.");
    expect(html).toContain("/players/p2");
  });

  it("the comeback nobody asked for: the disaster then the very next result, links to the disaster's own game", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      {
        key: "comeback",
        playerId: "p3",
        displayName: "Dev",
        worstGameId: "g10",
        worstPlayedOn: "2026-01-05",
        hand: 11,
        score: 44,
        nextGameId: "g11",
        nextPlayedOn: "2026-01-12",
      },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Dev gave up 44 points on the Kings hand");
    expect(html).toContain("Their very next game was a win.");
    expect(html).toContain("/games/g10");
    expect(html).not.toContain("/games/g11");
  });

  it("the slump: both averages named, links to the player's own page", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      {
        key: "slump",
        playerId: "p4",
        displayName: "Ash",
        allTimeAverage: 41.2,
        recentAverage: 55.8,
        gamesPlayed: 9,
      },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Ash&#x27;s last three games are averaging 55.8");
    expect(html).toContain("9-game average of 41.2");
    expect(html).toContain("/players/p4");
  });

  it("rivalry needle: names both players and the rate, links to the existing head-to-head drill-through", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      {
        key: "rivalryNeedle",
        dominantPlayerId: "p5",
        dominantDisplayName: "Sam",
        opponentPlayerId: "p6",
        opponentDisplayName: "Lee",
        aboveRate: 0.8,
        gamesTogether: 5,
      },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Sam finishes above Lee in 4 of their 5 games together (80.0%)");
    expect(html).toContain("/players/p5?opponent=p6");
  });

  it("overdue: archive-wide, no player, no tap-through (criterion 292's own carve-out)", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([{ key: "overdue", gamesSinceSharedWin: 12 }]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("It&#x27;s been 12 games since anyone shared a win.");
    // Plain text, not a link — the no-`href` branch renders a `<div>`, never an `<a>`.
    expect(html).toMatch(
      /<div class="flex min-h-11 items-center rounded-\[var\(--radius\)\] border border-dashed[^"]*"><p[^>]*>It&#x27;s been 12 games since anyone shared a win\.<\/p><\/div>/,
    );
  });

  it("a random old night: restates date, venue, roster and result, links straight to that game", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      {
        key: "randomOldNight",
        gameId: "g42",
        playedOn: "2026-03-14",
        locationName: null,
        rosterName: "Thursday crew",
        players: [{ displayName: "Cody", finalScore: 40 }],
        winners: ["Cody"],
        winningScore: 40,
      },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("No location, with Thursday crew");
    expect(html).toContain("Cody won on 40.");
    expect(html).toContain("/games/g42");
  });

  it("collective trivia: archive-wide totals, no tap-through", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    const { getFunFacts } = await import("@/lib/board/facts");
    vi.mocked(getBoard).mockResolvedValueOnce(minimalBoard());
    vi.mocked(getFunFacts).mockResolvedValueOnce([
      { key: "collectiveTrivia", totalGames: 12, totalHands: 132 },
    ]);

    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("You&#x27;ve played 12 games and 132 hands together.");
    // Plain text, not a link — the no-`href` branch renders a `<div>`, never an `<a>`.
    expect(html).toMatch(
      /<div class="flex min-h-11 items-center rounded-\[var\(--radius\)\] border border-dashed[^"]*"><p[^>]*>You&#x27;ve played 12 games and 132 hands together\.<\/p><\/div>/,
    );
  });
});
