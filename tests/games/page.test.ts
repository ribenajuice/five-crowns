/**
 * `/games` — PRD criterion 69, extended by M3 Stage 4 (criteria 262–264)
 * with a venue/roster filter. Same shallow "call the async server component,
 * inspect the rendered markup" style as `tests/players/page.test.ts`.
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

vi.mock("@/lib/games/queries", () => ({
  listGames: vi.fn(async () => []),
  resolveGamesFilter: vi.fn(),
}));

function game(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    playedOn: "2026-09-05",
    locationName: "Player E's",
    rosterId: "r1",
    rosterName: "Thursday crew",
    winners: ["Sam"],
    winningScore: 48,
    ...overrides,
  };
}

describe("/games — unfiltered (criterion 69, unchanged)", () => {
  it("renders every game, the plain context line, and no clear-filter button", async () => {
    const { listGames } = await import("@/lib/games/queries");
    vi.mocked(listGames).mockResolvedValueOnce([game("g1")]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Five Crowns Ledger");
    expect(html).not.toContain("Clear filter");
    expect(html).toContain("/games/g1");
  });

  it("the true empty archive renders the ordinary empty state, not the filter's own empty state", async () => {
    const { listGames } = await import("@/lib/games/queries");
    vi.mocked(listGames).mockResolvedValueOnce([]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Nothing in the book yet.");
    expect(html).not.toContain("No games match this filter.");
  });
});

describe("/games?location= — a valid venue filter (criteria 262, 264)", () => {
  it("states the filter and the count in the AppBar context, and offers Clear filter", async () => {
    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    vi.mocked(resolveGamesFilter).mockResolvedValueOnce({
      location: { kind: "venue", id: "loc1", name: "Player E's" },
    });
    vi.mocked(listGames).mockResolvedValueOnce([game("g1"), game("g2")]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({ searchParams: Promise.resolve({ location: "loc1" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("At Player E&#x27;s · 2 games");
    expect(html).toContain("Clear filter");
    expect(html).toContain('href="/games"');
    expect(vi.mocked(listGames)).toHaveBeenCalledWith({
      location: { kind: "venue", id: "loc1", name: "Player E's" },
      rosterId: undefined,
    });
  });
});

describe("/games?location=none — the no-location filter (criterion 251)", () => {
  it("renders the bare 'No location' clause, with no 'At' prefix", async () => {
    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    vi.mocked(resolveGamesFilter).mockResolvedValueOnce({ location: { kind: "none" } });
    vi.mocked(listGames).mockResolvedValueOnce([]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({ searchParams: Promise.resolve({ location: "none" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No location · 0 games");
    expect(html).not.toContain("At No location");
  });
});

describe("/games?location=&roster= — combined filters (criterion 262)", () => {
  it("joins both clauses, roster lower-cased when combined", async () => {
    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    vi.mocked(resolveGamesFilter).mockResolvedValueOnce({
      location: { kind: "venue", id: "loc1", name: "Player E's" },
      roster: { id: "r1", name: "Player A, Sam, Player D & Player E" },
    });
    vi.mocked(listGames).mockResolvedValueOnce([game("g1")]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({
      searchParams: Promise.resolve({ location: "loc1", roster: "r1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(
      "At Player E&#x27;s, with Player A, Sam, Player D &amp; Player E · 1 game",
    );
  });
});

describe("/games — a valid filter matching zero games (criterion 263)", () => {
  it("renders the filter's own empty state, naming the filter, never an error or the ordinary empty state", async () => {
    const { listGames, resolveGamesFilter } = await import("@/lib/games/queries");
    vi.mocked(resolveGamesFilter).mockResolvedValueOnce({
      location: { kind: "venue", id: "loc2", name: "The Rec Hall" },
    });
    vi.mocked(listGames).mockResolvedValueOnce([]);

    const { default: GamesPage } = await import("@/app/games/page");
    const element = await GamesPage({ searchParams: Promise.resolve({ location: "loc2" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No games match this filter.");
    expect(html).toContain("At The Rec Hall.");
    expect(html).not.toContain("Nothing in the book yet.");
  });
});

describe("/games — an unknown, deleted or malformed filter value (criterion 263)", () => {
  it("404s rather than silently falling back to the unfiltered list", async () => {
    const { resolveGamesFilter, listGames } = await import("@/lib/games/queries");
    vi.mocked(resolveGamesFilter).mockResolvedValueOnce(null);

    const { default: GamesPage } = await import("@/app/games/page");
    await expect(
      GamesPage({ searchParams: Promise.resolve({ location: "00000000-0000-0000-0000-000000000000" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(listGames).not.toHaveBeenCalled();
  });
});

describe("/games — a repeated query param (criterion 263, security review nit)", () => {
  it("404s a repeated ?location= or ?roster= rather than reaching the db layer as an array bind", async () => {
    const { resolveGamesFilter, listGames } = await import("@/lib/games/queries");

    const { default: GamesPage } = await import("@/app/games/page");
    await expect(
      GamesPage({ searchParams: Promise.resolve({ location: ["loc1", "loc2"] }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    await expect(
      GamesPage({ searchParams: Promise.resolve({ roster: ["r1", "r2"] }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(resolveGamesFilter).not.toHaveBeenCalled();
    expect(listGames).not.toHaveBeenCalled();
  });
});
