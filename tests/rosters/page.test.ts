/**
 * `/rosters/{id}` — PRD criterion 130 (a made-up roster id 404s), same
 * shallow style as `tests/players/page.test.ts` / `tests/auth/admin-page.test.ts`.
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

vi.mock("@/lib/rosters/queries", () => ({
  getRosterPage: vi.fn(),
}));

type FragmentElement = { type: unknown; props: { children: unknown[] } };

describe("/rosters/{id}", () => {
  it("⚠️ criterion 130: a made-up roster id renders the app's own 404", async () => {
    const { getRosterPage } = await import("@/lib/rosters/queries");
    vi.mocked(getRosterPage).mockResolvedValueOnce(null);

    const { default: RosterPage } = await import("@/app/rosters/[id]/page");
    await expect(
      RosterPage({ params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("titles the AppBar with the roster's display name for a real roster", async () => {
    const { getRosterPage } = await import("@/lib/rosters/queries");
    vi.mocked(getRosterPage).mockResolvedValueOnce({
      id: "r1",
      name: "Thursday crew",
      displayName: "Thursday crew",
      members: [
        { playerId: "p1", displayName: "Player A", wins: 1, winRate: 0.25 },
        { playerId: "p2", displayName: "Player B", wins: 1, winRate: 0.25 },
      ],
      gamesPlayed: 4,
      games: [
        { gameId: "g1", playedOn: "2026-09-12", locationName: "Player C's House", winners: ["Player A"] },
      ],
    });

    const { default: RosterPage } = await import("@/app/rosters/[id]/page");
    const element = (await RosterPage({ params: Promise.resolve({ id: "r1" }) })) as FragmentElement;
    const appBar = element.props.children[0] as { props: { title: string } };
    expect(appBar.props.title).toBe("Thursday crew");
  });

  it("⚠️ criterion 134: a roster whose win rates sum past 100% renders it as fact, not an error", async () => {
    const { getRosterPage } = await import("@/lib/rosters/queries");
    vi.mocked(getRosterPage).mockResolvedValueOnce({
      id: "r2",
      name: null,
      displayName: "Player B, Player D & Player E",
      members: [
        { playerId: "p1", displayName: "Player B", wins: 1, winRate: 0.25 },
        { playerId: "p2", displayName: "Player D", wins: 1, winRate: 0.25 },
        { playerId: "p3", displayName: "Player E", wins: 2, winRate: 0.5 },
        { playerId: "p4", displayName: "Player C", wins: 1, winRate: 0.25 },
      ],
      gamesPlayed: 4,
      games: [
        {
          gameId: "g1",
          playedOn: "2026-08-29",
          locationName: "Player C's House",
          winners: ["Player B", "Player D"],
        },
      ],
    });

    const { default: RosterPage } = await import("@/app/rosters/[id]/page");
    // Doesn't throw despite the rates summing to 125% — that's the whole point.
    const element = await RosterPage({ params: Promise.resolve({ id: "r2" }) });
    expect(element).toBeTruthy();
  });
});
