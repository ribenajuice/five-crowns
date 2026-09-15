/**
 * `/records/{key}` — the records board's drill-through, PRD criterion 186.
 * Same shallow "call the async server component, inspect the rendered
 * markup" style as `tests/players/page.test.ts`.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HandLabel } from "@/lib/scoring";

const hoisted = vi.hoisted(() => {
  class NotFoundSignal extends Error {}
  return { NotFoundSignal };
});

vi.mock("@/lib/auth/session", () => ({
  requireGroupSession: vi.fn(async () => ({ s: "group", v: 1 })),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new hoisted.NotFoundSignal("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/board/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/board/queries")>();
  return { ...actual, getBoard: vi.fn() };
});

function holder(displayName: string, gamesPlayed: number) {
  return { playerId: displayName, displayName, gamesPlayed };
}

const BOARD_WITH_MOST_WINS = {
  empty: false as const,
  archiveGameCount: 5,
  homeAdvantage: { gapPercentagePoints: null, holders: [] },
  looksLikeCheating: { gapPercentagePoints: null, holders: [] },
  metronome: { range: null, holders: [] },
  singleEventRecords: [],
  earlyDays: true,
  records: [
    {
      key: "mostWins" as const,
      value: 2,
      holders: [holder("Player A", 5)],
      games: [
        {
          id: "g2",
          playedOn: "2026-01-08",
          createdAt: "2026-01-08T00:00:00.000Z",
          locationName: null,
          rosterId: "r1",
          rosterName: "Thursday crew",
          winners: ["Player A"],
          winningScore: 50,
        },
        {
          id: "g1",
          playedOn: "2026-01-01",
          createdAt: "2026-01-01T00:00:00.000Z",
          locationName: "The Deck",
          rosterId: "r1",
          rosterName: "Thursday crew",
          winners: ["Player A"],
          winningScore: 40,
        },
      ],
    },
    { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
    { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
    { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
    { key: "stalwart" as const, value: null, holders: [], games: [] },
  ],
};

describe("/records/{key} — a made-up key", () => {
  it("renders the app's own 404, not a blank page, without even reading the board", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockClear();

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "nemesis" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(getBoard).not.toHaveBeenCalled();
  });
});

describe("/records/{key} — an empty archive", () => {
  it("404s rather than rendering a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "mostWins" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});

describe("/records/{key} — a record with no holder", () => {
  it("404s — there is nothing to drill into", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce(BOARD_WITH_MOST_WINS);

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "mostWinsInARow" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});

describe("/records/{key} — a real record", () => {
  it("⚠️ criterion 186: heading states the claim, games render newest-first exactly as the backend ordered them", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce(BOARD_WITH_MOST_WINS);

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "mostWins" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Most wins — Player A");
    expect(html).toContain("2 wins, from 5 games");

    // The backend already ordered these newest-first (g2 before g1) — the
    // page must not re-sort. `GameRow` renders the game's own link as
    // `/games/{id}`, so the two games' hrefs stand in for their order.
    const g2Index = html.indexOf("/games/g2");
    const g1Index = html.indexOf("/games/g1");
    expect(g2Index).toBeGreaterThan(-1);
    expect(g1Index).toBeGreaterThan(g2Index);
  });

  it("the stalwart's context line has no redundant sample sentence", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 12,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [],
      earlyDays: false,
      records: [
        { key: "mostWins" as const, value: null, holders: [], games: [] },
        { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
        { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
        { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
        {
          key: "stalwart" as const,
          value: 12,
          holders: [holder("Player A", 12)],
          games: [
            {
              id: "g1",
              playedOn: "2026-01-01",
              createdAt: "2026-01-01T00:00:00.000Z",
              locationName: "The Deck",
              rosterId: "r1",
              rosterName: "Thursday crew",
              winners: ["Player A"],
              winningScore: 40,
            },
          ],
        },
      ],
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "stalwart" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("The stalwart — Player A");
    expect(html).toContain("12 games played");
    expect(html).not.toContain("from 12 games");
  });

  it("annotates each row on the most-rounds-won drill-through", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 6,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [],
      earlyDays: true,
      records: [
        { key: "mostWins" as const, value: null, holders: [], games: [] },
        { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
        { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
        {
          key: "mostRoundsWon" as const,
          value: 9,
          holders: [holder("Player C", 3)],
          games: [
            {
              id: "g1",
              playedOn: "2026-01-01",
              createdAt: "2026-01-01T00:00:00.000Z",
              locationName: "The Deck",
              rosterId: "r1",
              rosterName: "Thursday crew",
              winners: ["Player A"],
              winningScore: 40,
              roundsWonByHolder: [{ displayName: "Player C", rounds: 4 }],
            },
          ],
        },
        { key: "stalwart" as const, value: null, holders: [], games: [] },
      ],
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "mostRoundsWon" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Player C took 4 of 11 rounds");
  });

  it("annotates each row with whose streak it is on a joint streak drill-through", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 4,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [],
      earlyDays: true,
      records: [
        { key: "mostWins" as const, value: null, holders: [], games: [] },
        {
          key: "mostWinsInARow" as const,
          value: 2,
          holders: [holder("Player A", 2), holder("Player B", 2)],
          games: [
            {
              id: "g1",
              playedOn: "2026-01-01",
              createdAt: "2026-01-01T00:00:00.000Z",
              locationName: "The Deck",
              rosterId: "r1",
              rosterName: "Thursday crew",
              winners: ["Player A"],
              winningScore: 40,
              streakOwner: "Player A",
            },
            {
              id: "g2",
              playedOn: "2026-01-08",
              createdAt: "2026-01-08T00:00:00.000Z",
              locationName: "The Deck",
              rosterId: "r1",
              rosterName: "Thursday crew",
              winners: ["Player B"],
              winningScore: 50,
              streakOwner: "Player B",
            },
          ],
        },
        { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
        { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
        { key: "stalwart" as const, value: null, holders: [], games: [] },
      ],
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "mostWinsInARow" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Player A&#x27;s streak game");
    expect(html).toContain("Player B&#x27;s streak game");

    // Oldest → newest, the one deliberate exception to "newest first" — the
    // page renders the backend's own order rather than re-sorting.
    const g1Index = html.indexOf("/games/g1");
    const g2Index = html.indexOf("/games/g2");
    expect(g1Index).toBeGreaterThan(-1);
    expect(g2Index).toBeGreaterThan(g1Index);
  });
});

describe("/records/{key} — RECORD_KEYS can never drift from RECORD_TITLES (code review, M3 Stage 1)", () => {
  it("routes every key RECORD_TITLES knows about, rather than 404ing a real, addable record", async () => {
    const { RECORD_TITLES } = await import("@/lib/ui/copy");
    const { getBoard } = await import("@/lib/board/queries");

    const boardWithEveryRecordHeld = {
      empty: false as const,
      archiveGameCount: 5,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [],
      earlyDays: true,
      records: (Object.keys(RECORD_TITLES) as (keyof typeof RECORD_TITLES)[]).map((key) => ({
        key,
        value: 3,
        holders: [holder("Player A", 5)],
        games: [
          {
            id: "g1",
            playedOn: "2026-01-01",
            createdAt: "2026-01-01T00:00:00.000Z",
            locationName: "The Deck",
            rosterId: "r1",
            rosterName: "Thursday crew",
            winners: ["Player A"],
            winningScore: 40,
          },
        ],
      })),
    };

    const { default: RecordPage } = await import("@/app/records/[key]/page");

    for (const key of Object.keys(RECORD_TITLES)) {
      vi.mocked(getBoard).mockResolvedValueOnce(boardWithEveryRecordHeld);
      await expect(
        RecordPage({ params: Promise.resolve({ key }) }),
      ).resolves.toBeDefined();
    }
  });
});

function singleEventHolder(displayName: string, gameId: string, playedOn: string, hand?: HandLabel) {
  return { playerId: displayName, displayName, gameId, playedOn, ...(hand ? { hand } : {}) };
}

const BOARD_WITH_WORST_GAME_EVER = {
  empty: false as const,
  archiveGameCount: 20,
  earlyDays: false,
  records: [
    { key: "mostWins" as const, value: null, holders: [], games: [] },
    { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
    { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
    { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
    { key: "stalwart" as const, value: null, holders: [], games: [] },
  ],
  homeAdvantage: { gapPercentagePoints: null, holders: [] },
  looksLikeCheating: { gapPercentagePoints: null, holders: [] },
  metronome: { range: null, holders: [] },
  singleEventRecords: [
    {
      key: "worstGameEver" as const,
      value: 178,
      holders: [singleEventHolder("Player B", "g1", "2026-09-05")],
      games: [
        {
          id: "g1",
          playedOn: "2026-09-05",
          createdAt: "2026-09-05T00:00:00.000Z",
          locationName: "The Deck",
          rosterId: "r1",
          rosterName: "Thursday crew",
          winners: ["Player C"],
          winningScore: 40,
          singleEventValue: 178,
        },
      ],
    },
  ],
};

describe("/records/{key} — a single-event record (M3 Stage 3, criteria 233–234)", () => {
  it("⚠️ criterion 233: the heading and context state a date, never a game count", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce(BOARD_WITH_WORST_GAME_EVER);

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "worstGameEver" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Worst game ever — Player B");
    expect(html).toContain("178 final score");
    expect(html).toMatch(/on [A-Za-z]+,? 5 Sept?\.? 2026/);
    expect(html).not.toContain("from 1 game");
    expect(html).not.toContain("games</p>");
  });

  it("annotates the row with the instance's own number, in the games list's own row format (criterion 234)", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce(BOARD_WITH_WORST_GAME_EVER);

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "worstGameEver" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("178 final score");
    expect(html).toContain("/games/g1");
  });

  it("a made-up single-event key 404s without even reading the board", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockClear();

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "cleanestSweep" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(getBoard).not.toHaveBeenCalled();
  });

  it("an empty archive 404s rather than rendering a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "worstGameEver" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("a single-event record with no holder 404s — there is nothing to drill into", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      ...BOARD_WITH_WORST_GAME_EVER,
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [{ key: "worstGameEver" as const, value: null, holders: [], games: [] }],
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "worstGameEver" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("the catastrophe's heading and annotation both name the hand", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: [
        { key: "mostWins" as const, value: null, holders: [], games: [] },
        { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
        { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
        { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
        { key: "stalwart" as const, value: null, holders: [], games: [] },
      ],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      singleEventRecords: [
        {
          key: "catastrophe" as const,
          value: 41,
          holders: [singleEventHolder("Player E", "g1", "2026-09-05", "Kings")],
          games: [
            {
              id: "g1",
              playedOn: "2026-09-05",
              createdAt: "2026-09-05T00:00:00.000Z",
              locationName: "The Deck",
              rosterId: "r1",
              rosterName: "Thursday crew",
              winners: ["Player C"],
              winningScore: 40,
              singleEventValue: 41,
              singleEventHand: "Kings",
            },
          ],
        },
      ],
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "catastrophe" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("The catastrophe — Player E");
    expect(html).toContain("41 points in one hand · Kings");
  });
});

describe("/records/homeAdvantage — the board's thirteenth record's own drill-through (criteria 268–269)", () => {
  function minimalRecords() {
    return [
      { key: "mostWins" as const, value: null, holders: [], games: [] },
      { key: "mostWinsInARow" as const, value: null, holders: [], games: [] },
      { key: "lowestAverageScore" as const, value: null, holders: [], games: [] },
      { key: "mostRoundsWon" as const, value: null, holders: [], games: [] },
      { key: "stalwart" as const, value: null, holders: [], games: [] },
    ];
  }

  it("states the whole claim including the elsewhere figure, and lists the holder's own games at that venue", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
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
            games: [
              {
                id: "g1",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T00:00:00.000Z",
                locationName: "Player E's",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Sam"],
                winningScore: 48,
              },
            ],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "homeAdvantage" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Home advantage — Sam, Player E&#x27;s");
    expect(html).toContain("+41.7 points, won 4 of 6 there, 2 of 14 elsewhere");
    expect(html).toContain("/games/g1");
  });

  it("⚠️ criterion 269: a joint holder's pairs each drill through to their own venue's games, merged newest first", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
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
            games: [
              {
                id: "g2",
                playedOn: "2026-08-01",
                createdAt: "2026-08-01T00:00:00.000Z",
                locationName: "The Lake House",
                rosterId: "r2",
                rosterName: "Sunday crew",
                winners: ["Player A"],
                winningScore: 30,
              },
            ],
          },
          {
            playerId: "p1",
            displayName: "Sam",
            locationId: "loc1",
            locationName: "Player E's",
            here: { wins: 4, games: 6, ratePercent: 66.7 },
            elsewhere: { wins: 2, games: 14, ratePercent: 14.3 },
            gapPercentagePoints: 41.7,
            games: [
              {
                id: "g1",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T00:00:00.000Z",
                locationName: "Player E's",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Sam"],
                winningScore: 48,
              },
            ],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "homeAdvantage" }) });
    const html = renderToStaticMarkup(element);

    // Both pairs' own games are present — one row, not padded, per pair.
    expect(html).toContain("/games/g1");
    expect(html).toContain("/games/g2");
    // Newest first: g1 (2026-09-05) precedes g2 (2026-08-01).
    expect(html.indexOf("/games/g1")).toBeLessThan(html.indexOf("/games/g2"));
  });

  it("⚠️ code review regression: two merged pairs' games sharing a `playedOn` date fall back to `createdAt`, not insertion order", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
      homeAdvantage: {
        gapPercentagePoints: 41.7,
        holders: [
          // Alphabetically first holder ("Player A") carries the game
          // actually created *later* — an ad-hoc `playedOn`-only comparator
          // would still place it second, by insertion/array order, which is
          // exactly the bug this test guards against.
          {
            playerId: "p2",
            displayName: "Player A",
            locationId: "loc2",
            locationName: "The Lake House",
            here: { wins: 3, games: 5, ratePercent: 60 },
            elsewhere: { wins: 1, games: 17, ratePercent: 5.9 },
            gapPercentagePoints: 41.7,
            games: [
              {
                id: "g-later",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T18:00:00.000Z",
                locationName: "The Lake House",
                rosterId: "r2",
                rosterName: "Sunday crew",
                winners: ["Player A"],
                winningScore: 30,
              },
            ],
          },
          {
            playerId: "p1",
            displayName: "Sam",
            locationId: "loc1",
            locationName: "Player E's",
            here: { wins: 4, games: 6, ratePercent: 66.7 },
            elsewhere: { wins: 2, games: 14, ratePercent: 14.3 },
            gapPercentagePoints: 41.7,
            games: [
              {
                id: "g-earlier",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T09:00:00.000Z",
                locationName: "Player E's",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Sam"],
                winningScore: 48,
              },
            ],
          },
        ],
      },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "homeAdvantage" }) });
    const html = renderToStaticMarkup(element);

    // Same `playedOn` date, different `createdAt` — the later-created game
    // sorts first, exactly `compareNewestFirst`'s own tie-break.
    expect(html.indexOf("/games/g-later")).toBeLessThan(html.indexOf("/games/g-earlier"));
  });

  it("a made-up key still checks the ordinary record keys, and 404s the same as before", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockClear();

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "notARealRecord" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(getBoard).not.toHaveBeenCalled();
  });

  it("an empty archive 404s rather than rendering a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "homeAdvantage" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("⚠️ criterion 254: nobody with a positive gap 404s — there is nothing to drill into", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "homeAdvantage" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});

describe("/records/looksLikeCheating — the fourth-animal drill-through (M4 second slice, criteria 297–299)", () => {
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

  it("states the whole claim including the table's own rate, and lists exactly the holder's own games", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [{ key: "clutchComeback" as const, value: null, holders: [], games: [] }],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      looksLikeCheating: {
        gapPercentagePoints: 47.4,
        holders: [
          {
            playerId: "p1",
            displayName: "Player B",
            gamesPlayed: 12,
            own: { wins: 9, games: 12, ratePercent: 75 },
            others: { wins: 10, games: 36, ratePercent: 27.6 },
            gapPercentagePoints: 47.4,
            games: [
              {
                id: "g1",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T00:00:00.000Z",
                locationName: "The Deck",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Player B"],
                winningScore: 90,
              },
            ],
          },
        ],
      },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "looksLikeCheating" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Looks like cheating — Player B");
    expect(html).toContain(
      "+47.4 points, Wins 75.0% of their games (9 of 12) — the table wins 27.6% in those same games (10 of 36).",
    );
    expect(html).toContain("/games/g1");
  });

  it("⚠️ joint holders: each one's own games are merged, deduplicated and sorted newest first", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
      looksLikeCheating: {
        gapPercentagePoints: 47.4,
        holders: [
          {
            playerId: "p2",
            displayName: "Player A",
            gamesPlayed: 5,
            own: { wins: 4, games: 5, ratePercent: 80 },
            others: { wins: 2, games: 10, ratePercent: 20 },
            gapPercentagePoints: 47.4,
            games: [
              {
                id: "g2",
                playedOn: "2026-08-01",
                createdAt: "2026-08-01T00:00:00.000Z",
                locationName: null,
                rosterId: "r2",
                rosterName: "Sunday crew",
                winners: ["Player A"],
                winningScore: 60,
              },
            ],
          },
          {
            playerId: "p1",
            displayName: "Player B",
            gamesPlayed: 12,
            own: { wins: 9, games: 12, ratePercent: 75 },
            others: { wins: 10, games: 36, ratePercent: 27.6 },
            gapPercentagePoints: 47.4,
            games: [
              {
                id: "g1",
                playedOn: "2026-09-05",
                createdAt: "2026-09-05T00:00:00.000Z",
                locationName: null,
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Player B"],
                winningScore: 90,
              },
            ],
          },
        ],
      },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "looksLikeCheating" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("/games/g1");
    expect(html).toContain("/games/g2");
    expect(html.indexOf("/games/g1")).toBeLessThan(html.indexOf("/games/g2"));
  });

  it("nobody holds it yet — 404s, there is nothing to drill into", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "looksLikeCheating" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("an empty archive 404s rather than rendering a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "looksLikeCheating" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});

describe("/records/metronome — the other fourth-animal drill-through (M4 second slice, criteria 307–309)", () => {
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

  it("⚠️ criterion 309: lands on the holder's whole game history, not just the two games at either end of the range", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [{ key: "clutchComeback" as const, value: null, holders: [], games: [] }],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: {
        range: 34,
        holders: [
          {
            playerId: "p1",
            displayName: "Player E",
            gamesPlayed: 3,
            range: 34,
            highest: 92,
            lowest: 58,
            games: [
              {
                id: "g2",
                playedOn: "2026-02-01",
                createdAt: "2026-02-01T00:00:00.000Z",
                locationName: "The Deck",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Player E"],
                winningScore: 92,
              },
              {
                id: "g1",
                playedOn: "2026-01-01",
                createdAt: "2026-01-01T00:00:00.000Z",
                locationName: "The Deck",
                rosterId: "r1",
                rosterName: "Thursday crew",
                winners: ["Player A"],
                winningScore: 100,
              },
            ],
          },
        ],
      },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    const element = await RecordPage({ params: Promise.resolve({ key: "metronome" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("The metronome — Player E");
    expect(html).toContain("34 point range, Best 92, worst 58, from 3 games.");
    // Both of the holder's games render — not only the two at the range's own ends.
    expect(html).toContain("/games/g1");
    expect(html).toContain("/games/g2");
    expect(html.indexOf("/games/g2")).toBeLessThan(html.indexOf("/games/g1"));
  });

  it("nobody has a range yet — 404s, there is nothing to drill into", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({
      empty: false,
      archiveGameCount: 20,
      earlyDays: false,
      records: minimalRecords(),
      singleEventRecords: [],
      homeAdvantage: { gapPercentagePoints: null, holders: [] },
      looksLikeCheating: { gapPercentagePoints: null, holders: [] },
      metronome: { range: null, holders: [] },
    });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "metronome" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("an empty archive 404s rather than rendering a board of zeros", async () => {
    const { getBoard } = await import("@/lib/board/queries");
    vi.mocked(getBoard).mockResolvedValueOnce({ empty: true });

    const { default: RecordPage } = await import("@/app/records/[key]/page");
    await expect(
      RecordPage({ params: Promise.resolve({ key: "metronome" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});
