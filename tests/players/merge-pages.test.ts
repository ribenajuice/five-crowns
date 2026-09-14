/**
 * `/players/{id}/merge` and `/players/{id}/merge/{otherId}` — PRD criterion
 * 155. Same shallow "call the async server component, inspect the returned
 * element" style as `tests/players/page.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

afterEach(() => {
  vi.clearAllMocks();
});

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
  listPlayers: vi.fn(),
}));

type FragmentElement = { type: unknown; props: { children: unknown[] } };

describe("/players/{id}/merge — which player?", () => {
  it("404s a made-up player id", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(null);

    const { default: Page } = await import("@/app/players/[id]/merge/page");
    await expect(
      Page({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("lists every other player with their own games-played count, excluding self", async () => {
    const { getPlayerPage, listPlayers } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Samuel",
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    });
    vi.mocked(listPlayers).mockResolvedValueOnce([
      { id: "p1", displayName: "Samuel", gamesPlayed: 0 },
      { id: "p2", displayName: "Sam", gamesPlayed: 9 },
      { id: "p3", displayName: "Player A", gamesPlayed: 7 },
    ]);

    const { default: Page } = await import("@/app/players/[id]/merge/page");
    const element = await Page({ params: Promise.resolve({ id: "p1" }) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Merge Samuel with which player?");
    expect(html).toContain("Sam");
    expect(html).toContain("/players/p1/merge/p2");
    expect(html).toContain("Player A");
    // Self is excluded from the target list.
    expect(html).not.toContain("/players/p1/merge/p1");
  });

  it("⚠️ renders the empty state rather than an empty list when nobody else exists", async () => {
    const { getPlayerPage, listPlayers } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Samuel",
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    });
    vi.mocked(listPlayers).mockResolvedValueOnce([{ id: "p1", displayName: "Samuel", gamesPlayed: 0 }]);

    const { default: Page } = await import("@/app/players/[id]/merge/page");
    const element = await Page({ params: Promise.resolve({ id: "p1" }) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Nobody else to merge with");
  });
});

describe("/players/{id}/merge/{otherId} — MergeConfirmScreen", () => {
  it("404s when the two ids are the same", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    const { default: Page } = await import("@/app/players/[id]/merge/[otherId]/page");
    await expect(
      Page({ params: Promise.resolve({ id: "p1", otherId: "p1" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
    expect(getPlayerPage).not.toHaveBeenCalled();
  });

  it("404s when either id doesn't name a real player", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(null);
    vi.mocked(getPlayerPage).mockResolvedValueOnce(null);

    const { default: Page } = await import("@/app/players/[id]/merge/[otherId]/page");
    await expect(
      Page({ params: Promise.resolve({ id: "p1", otherId: "p2" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("titles the AppBar 'Merge two players?' and names the back destination", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockImplementation(async (id: string) =>
      id === "p1"
        ? { id: "p1", displayName: "Samuel", gamesPlayed: 0, wins: 0, winRate: null, games: [] }
        : { id: "p2", displayName: "Sam", gamesPlayed: 9, wins: 4, winRate: 4 / 9, games: [] },
    );

    const { default: Page } = await import("@/app/players/[id]/merge/[otherId]/page");
    const element = (await Page({
      params: Promise.resolve({ id: "p1", otherId: "p2" }),
    })) as FragmentElement;
    const appBar = element.props.children[0] as { props: { title: string; back: { href: string } } };
    expect(appBar.props.title).toBe("Merge two players?");
    expect(appBar.props.back.href).toBe("/players/p1");
  });
});
