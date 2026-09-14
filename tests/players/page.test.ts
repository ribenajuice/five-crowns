/**
 * `/players/{id}` — PRD criteria 130, 133–136, 155. Same shallow "call the
 * async server component, inspect the returned element" style as
 * `tests/auth/admin-page.test.ts` — nothing here renders a full DOM, since
 * this project has no React Testing Library / jsdom set up for component
 * tests. Once resolved, the tree has nothing further async in it, so
 * `renderToStaticMarkup` is used for the handful of assertions that need to
 * see rendered text/attributes rather than dig through element props.
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

vi.mock("@/lib/players/queries", () => ({
  getPlayerPage: vi.fn(),
}));

type FragmentElement = { type: unknown; props: { children: unknown[] } };

const noSearchParams = Promise.resolve({});

describe("/players/{id}", () => {
  it("⚠️ criterion 130: a made-up id renders the app's own 404, not a blank page", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(null);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    await expect(
      PlayerPage({
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
        searchParams: noSearchParams,
      }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("titles the AppBar with the player's name for a real player", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Player C",
      gamesPlayed: 1,
      wins: 1,
      winRate: 1,
      games: [
        {
          gameId: "g1",
          playedOn: "2026-09-12",
          locationName: null,
          rosterId: "r1",
          rosterName: "Thursday crew",
          finalScore: 78,
          isWinner: true,
        },
      ],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = (await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    })) as FragmentElement;
    const appBar = element.props.children[0] as { props: { title: string } };
    expect(appBar.props.title).toBe("Player C");
  });

  it("⚠️ criterion 136: a zero-game player renders the empty state, not an error", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p2",
      displayName: "Player F",
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = (await PlayerPage({
      params: Promise.resolve({ id: "p2" }),
      searchParams: noSearchParams,
    })) as FragmentElement;
    // Doesn't throw, and the AppBar still names the player.
    const appBar = element.props.children[0] as { props: { title: string } };
    expect(appBar.props.title).toBe("Player F");
  });

  it("⚠️ criterion 155: the merge entry point appears on the zero-game layout too, not only the populated one", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p2",
      displayName: "Player F",
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p2" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("This is the same person as");
    expect(html).toContain("/players/p2/merge");
  });

  it("the merge entry point also appears on the populated layout, above the games list", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Player C",
      gamesPlayed: 1,
      wins: 1,
      winRate: 1,
      games: [
        {
          gameId: "g1",
          playedOn: "2026-09-12",
          locationName: null,
          rosterId: "r1",
          rosterName: "Thursday crew",
          finalScore: 78,
          isWinner: true,
        },
      ],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("This is the same person as");
    expect(html).toContain("/players/p1/merge");
  });

  it("⚠️ a successful merge's one-time banner names the loser and this player, and the roster-fold note when present", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 9,
      wins: 4,
      winRate: 4 / 9,
      games: [],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: Promise.resolve({ merged: "Samuel", foldedRoster: "Thursday crew" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Merged.");
    expect(html).toContain("Samuel is now part of Sam&#x27;s record.");
    expect(html).toContain("Thursday crew");
  });

  it("no banner renders without a `merged` query param", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 1,
      wins: 0,
      winRate: 0,
      games: [],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);
    expect(html).not.toContain("Merged.");
  });
});
