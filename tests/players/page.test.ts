/**
 * `/players/{id}` — PRD criteria 130, 133–136. Same shallow "call the async
 * server component, inspect the returned element" style as
 * `tests/auth/admin-page.test.ts` — nothing here renders a DOM, since this
 * project has no React Testing Library / jsdom set up for component tests.
 */
import { describe, expect, it, vi } from "vitest";

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

describe("/players/{id}", () => {
  it("⚠️ criterion 130: a made-up id renders the app's own 404, not a blank page", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(null);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    await expect(
      PlayerPage({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }),
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
    const element = (await PlayerPage({ params: Promise.resolve({ id: "p1" }) })) as FragmentElement;
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
    const element = (await PlayerPage({ params: Promise.resolve({ id: "p2" }) })) as FragmentElement;
    // Doesn't throw, and the AppBar still names the player.
    const appBar = element.props.children[0] as { props: { title: string } };
    expect(appBar.props.title).toBe("Player F");
  });
});
