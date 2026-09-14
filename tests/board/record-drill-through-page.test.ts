/**
 * `/records/{key}` — the records board's drill-through, PRD criterion 186.
 * Same shallow "call the async server component, inspect the rendered
 * markup" style as `tests/players/page.test.ts`.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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
          locationName: null,
          rosterId: "r1",
          rosterName: "Thursday crew",
          winners: ["Player A"],
          winningScore: 50,
        },
        {
          id: "g1",
          playedOn: "2026-01-01",
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
      earlyDays: true,
      records: (Object.keys(RECORD_TITLES) as (keyof typeof RECORD_TITLES)[]).map((key) => ({
        key,
        value: 3,
        holders: [holder("Player A", 5)],
        games: [
          {
            id: "g1",
            playedOn: "2026-01-01",
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
