/**
 * `/places/{id}` — the venue page, PRD criteria 260–261, M2 criterion 130 (a
 * made-up id 404s). Same shallow "call the async server component, inspect
 * the rendered markup" style as `tests/rosters/page.test.ts`.
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

vi.mock("@/lib/locations/queries", () => ({
  getVenuePage: vi.fn(),
}));

describe("/places/{id}", () => {
  it("⚠️ criterion 260: a made-up or deleted venue id renders the app's own 404", async () => {
    const { getVenuePage } = await import("@/lib/locations/queries");
    vi.mocked(getVenuePage).mockResolvedValueOnce(null);

    const { default: VenuePage } = await import("@/app/places/[id]/page");
    await expect(
      VenuePage({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("renders games played, table average, players here, and this venue's games", async () => {
    const { getVenuePage } = await import("@/lib/locations/queries");
    vi.mocked(getVenuePage).mockResolvedValueOnce({
      id: "loc1",
      name: "Player E's",
      gamesPlayed: 6,
      tableAverage: { average: 52.3, gamesPlayed: 6, scoresCount: 24 },
      players: [
        { playerId: "p1", displayName: "Sam", gamesPlayed: 6, wins: 4, winRate: 2 / 3, average: 48.5 },
        { playerId: "p2", displayName: "Player A", gamesPlayed: 4, wins: 1, winRate: 0.25, average: 57.1 },
      ],
      games: [
        {
          id: "g1",
          playedOn: "2026-09-05",
          rosterId: "r1",
          rosterName: "Player A, Sam, Player D & Player E",
          winners: ["Sam"],
        },
      ],
    });

    const { default: VenuePage } = await import("@/app/places/[id]/page");
    const element = await VenuePage({ params: Promise.resolve({ id: "loc1" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Player E&#x27;s");
    expect(html).toContain("Games played");
    expect(html).toContain("6");
    expect(html).toContain("Table average");
    expect(html).toContain("52.3");
    expect(html).toContain("6 games · 24 scores");

    expect(html).toContain("Players here");
    expect(html).toContain("/players/p1");
    expect(html).toContain("Sam");
    expect(html).toContain("66.7%");
    expect(html).toContain("48.5");

    // `venueGamesHeading` mechanically applies the same "{Entity}'s games"
    // template `playerGamesHeading`/`rosterGamesHeading` already use, with no
    // special-casing for a venue name that already ends in "'s" — consistent
    // with how every other entity page's heading is built.
    expect(html).toContain("Player E&#x27;s&#x27;s games");
    expect(html).toContain("/games/g1");
  });

  it("⚠️ criterion 260: a venue with zero games renders an empty state, not a page of zeros", async () => {
    const { getVenuePage } = await import("@/lib/locations/queries");
    vi.mocked(getVenuePage).mockResolvedValueOnce({
      id: "loc2",
      name: "The Rec Hall",
      gamesPlayed: 0,
      tableAverage: null,
      players: [],
      games: [],
    });

    const { default: VenuePage } = await import("@/app/places/[id]/page");
    const element = await VenuePage({ params: Promise.resolve({ id: "loc2" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No games here yet.");
    expect(html).toContain("Nothing saved so far happened at The Rec Hall.");
    expect(html).not.toContain("Table average");
    expect(html).not.toContain("Players here");
  });
});
