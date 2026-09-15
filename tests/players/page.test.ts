/**
 * `/players/{id}` — PRD criteria 130, 133–136, 155, extended by M3 Stage 2
 * (criteria 203–212, 199–202). Same shallow "call the async server
 * component, inspect the returned element" style as
 * `tests/auth/admin-page.test.ts` — nothing here renders a full DOM, since
 * this project has no React Testing Library / jsdom set up for component
 * tests. Once resolved, the tree has nothing further async in it, so
 * `renderToStaticMarkup` is used for the handful of assertions that need to
 * see rendered text/attributes rather than dig through element props.
 *
 * `@/lib/players/rivalry` is mocked here the same way `@/lib/players/queries`
 * already is — this file never touches a real database, and the four
 * populated-branch tests inherited from before Stage 2 default every new
 * function to an empty/no-holder result so they keep asserting only what
 * they always asserted.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
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

vi.mock("@/lib/players/rivalry", () => ({
  getPlayerGameFacts: vi.fn(),
  getPlayerHeadToHead: vi.fn(),
  nemesisFromHeadToHead: vi.fn(),
  getPlayerRosterStats: vi.fn(),
  getPlayerStreaks: vi.fn(),
  getPlayerVenueStats: vi.fn(),
}));

vi.mock("@/lib/players/distributions", () => ({
  getPlayerDistributions: vi.fn(),
}));

type FragmentElement = { type: unknown; props: { children: unknown[] } };

const noSearchParams = Promise.resolve({});

const NO_NEMESIS = { holders: [] as { playerId: string; displayName: string; gamesTogether: number }[], aboveRatePercent: null as number | null };
const NO_STREAKS = {
  longestWinningStreak: { length: 0, games: [] },
  drought: { length: 0, games: [] },
};
/** `getPlayerVenueStats`'s real contract (criterion 258): always at least the
 *  "No location" row, even at zero games — never truly `[]`. */
const NO_LOCATION_ONLY_VENUE_STATS = [
  { locationId: null, locationName: null, gamesPlayed: 0, wins: 0, winRate: 0, average: null },
];

/** Sets every Stage 2 rivalry function to its empty/no-holder default —
 *  called before every test so the pre-Stage-2 tests below need no changes
 *  to keep passing, and new tests only override what they care about.
 *  `getPlayerGameFacts` is mocked to `[]` here too: the populated body now
 *  fetches it once and threads it through to the other three (a query-count
 *  fix, not a behavior change) — its return value is otherwise irrelevant to
 *  these tests since the other three are mocked directly regardless of what
 *  they're passed. */
const NO_DISTRIBUTIONS = {
  average: null as { average: number; gamesPlayed: number } | null,
  handProfile: [] as { hand: number; label: string; mean: number }[],
  worstHands: [] as string[],
  bestGame: null as { score: number; games: unknown[] } | null,
  worstGame: null as { score: number; games: unknown[] } | null,
};

async function mockEmptyRivalry() {
  const {
    getPlayerGameFacts,
    getPlayerHeadToHead,
    nemesisFromHeadToHead,
    getPlayerRosterStats,
    getPlayerStreaks,
    getPlayerVenueStats,
  } = await import("@/lib/players/rivalry");
  vi.mocked(getPlayerGameFacts).mockResolvedValue([]);
  vi.mocked(getPlayerHeadToHead).mockResolvedValue([]);
  vi.mocked(nemesisFromHeadToHead).mockReturnValue(NO_NEMESIS);
  vi.mocked(getPlayerRosterStats).mockResolvedValue([]);
  vi.mocked(getPlayerStreaks).mockResolvedValue(NO_STREAKS);
  vi.mocked(getPlayerVenueStats).mockResolvedValue(NO_LOCATION_ONLY_VENUE_STATS);

  const { getPlayerDistributions } = await import("@/lib/players/distributions");
  vi.mocked(getPlayerDistributions).mockResolvedValue(
    NO_DISTRIBUTIONS as unknown as Awaited<ReturnType<typeof getPlayerDistributions>>,
  );
}

beforeEach(async () => {
  await mockEmptyRivalry();
});

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

  it("⚠️ criterion 136: a zero-game player never calls the rivalry functions at all", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p2",
      displayName: "Player F",
      gamesPlayed: 0,
      wins: 0,
      winRate: null,
      games: [],
    });
    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    await PlayerPage({ params: Promise.resolve({ id: "p2" }), searchParams: noSearchParams });
    expect(getPlayerHeadToHead).not.toHaveBeenCalled();
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

/** A minimal populated player, reused by the Stage 2 section tests below. */
function populatedPlayer() {
  return {
    id: "p1",
    displayName: "Sam",
    gamesPlayed: 9,
    wins: 5,
    winRate: 5 / 9,
    games: [],
  };
}

describe("/players/{id} — fetches game facts once, not once per rivalry section (code review fix)", () => {
  it("calls getPlayerGameFacts exactly once and passes its result into each of the three rivalry functions", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerGameFacts, getPlayerHeadToHead, getPlayerRosterStats, getPlayerStreaks, getPlayerVenueStats } =
      await import("@/lib/players/rivalry");
    const facts = [{ gameId: "g1" }] as unknown as Awaited<ReturnType<typeof getPlayerGameFacts>>;
    vi.mocked(getPlayerGameFacts).mockResolvedValueOnce(facts);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    await PlayerPage({ params: Promise.resolve({ id: "p1" }), searchParams: noSearchParams });

    expect(getPlayerGameFacts).toHaveBeenCalledTimes(1);
    expect(getPlayerHeadToHead).toHaveBeenCalledWith("p1", facts);
    expect(getPlayerRosterStats).toHaveBeenCalledWith("p1", facts);
    expect(getPlayerStreaks).toHaveBeenCalledWith("p1", facts);
    expect(getPlayerVenueStats).toHaveBeenCalledWith("p1", facts);
  });
});

describe("/players/{id} — Head-to-head section (M3 Stage 2, criteria 203–204)", () => {
  it("renders one row per opponent, in the order the backend already sorted", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerHeadToHead).mockResolvedValueOnce([
      {
        opponentId: "p2",
        displayName: "Player B",
        gamesTogether: 9,
        wins: 5,
        opponentWins: 4,
        winRate: 5 / 9,
        opponentWinRate: 4 / 9,
        aboveRate: 5 / 9,
        opponentAboveRate: 4 / 9,
        games: [],
      },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Head-to-head");
    expect(html).toContain("Player B");
    expect(html).toContain("9 games together");
    expect(html).toContain("/players/p1?opponent=p2");
  });

  it("a player with no shared games at all sees the section's own empty state, not a missing section", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Head-to-head");
    expect(html).toContain("No shared games yet.");
  });
});

describe("/players/{id} — Nemesis card (M3 Stage 2, criteria 199–202, founder's pick: the flat 'Nemesis' candidate)", () => {
  it("renders the flat title and the founder-approved detail sentence verbatim", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = [
      {
        opponentId: "p2",
        displayName: "Player E",
        gamesTogether: 9,
        wins: 3,
        opponentWins: 7,
        winRate: 3 / 9,
        opponentWinRate: 7 / 9,
        aboveRate: 3 / 9,
        opponentAboveRate: 6 / 9,
        games: [],
      },
    ];
    vi.mocked(getPlayerHeadToHead).mockResolvedValueOnce(rows);
    vi.mocked(nemesisFromHeadToHead).mockReturnValueOnce({
      holders: [{ playerId: "p2", displayName: "Player E", gamesTogether: 9 }],
      aboveRatePercent: 66.7,
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Nemesis");
    expect(html).toContain("Player E");
    // Verbatim, `docs/mockups/m3-stage-2-rivalry.html` § "Nemesis: five
    // candidates, side by side", candidate 1 — the founder's pick.
    expect(html).toContain("Finishes above you in 6 of your 9 games together (66.7%).");
    expect(html).toContain("/players/p1?opponent=p2");
  });

  it("⚠️ criterion 201: no nemesis reuses the board's own no-holder sentence verbatim", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Nobody&#x27;s done this yet.");
  });

  it("a joint nemesis names both opponents, joined with '&', and states each one's own numbers", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = [
      {
        opponentId: "p2",
        displayName: "Jo",
        gamesTogether: 9,
        wins: 3,
        opponentWins: 6,
        winRate: 3 / 9,
        opponentWinRate: 6 / 9,
        aboveRate: 3 / 9,
        opponentAboveRate: 6 / 9,
        games: [],
      },
      {
        opponentId: "p3",
        displayName: "Sam",
        gamesTogether: 6,
        wins: 2,
        opponentWins: 4,
        winRate: 2 / 6,
        opponentWinRate: 4 / 6,
        aboveRate: 2 / 6,
        opponentAboveRate: 4 / 6,
        games: [],
      },
    ];
    vi.mocked(getPlayerHeadToHead).mockResolvedValueOnce(rows);
    vi.mocked(nemesisFromHeadToHead).mockReturnValueOnce({
      holders: [
        { playerId: "p2", displayName: "Jo", gamesTogether: 9 },
        { playerId: "p3", displayName: "Sam", gamesTogether: 6 },
      ],
      aboveRatePercent: 66.7,
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Jo &amp; Sam");
    expect(html).toContain("4 of your 6 games together");
    expect(html).toContain("6 of your 9 games together");
  });

  it("a 3-way tied nemesis uses the app's joint-list grammar ('A, B & C'), not a bare '&' chain", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    // All three tie at the same above-rate, 2/3, which `nemesis()` rounds
    // to the same 66.7% (`Math.round(aboveRate * 1000) / 10`) despite
    // different raw counts — a genuine three-way tie, not a coincidence
    // of the mock.
    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = [
      {
        opponentId: "p2",
        displayName: "Zoe",
        gamesTogether: 3,
        wins: 1,
        opponentWins: 2,
        winRate: 1 / 3,
        opponentWinRate: 2 / 3,
        aboveRate: 1 / 3,
        opponentAboveRate: 2 / 3,
        games: [],
      },
      {
        opponentId: "p3",
        displayName: "Amy",
        gamesTogether: 6,
        wins: 2,
        opponentWins: 4,
        winRate: 2 / 6,
        opponentWinRate: 4 / 6,
        aboveRate: 2 / 6,
        opponentAboveRate: 4 / 6,
        games: [],
      },
      {
        opponentId: "p4",
        displayName: "Mia",
        gamesTogether: 9,
        wins: 3,
        opponentWins: 6,
        winRate: 3 / 9,
        opponentWinRate: 6 / 9,
        aboveRate: 3 / 9,
        opponentAboveRate: 6 / 9,
        games: [],
      },
    ];
    vi.mocked(getPlayerHeadToHead).mockResolvedValueOnce(rows);
    // `nemesis()` returns holders alphabetical (criterion 181's grammar),
    // regardless of input order — mocked here matching that contract.
    vi.mocked(nemesisFromHeadToHead).mockReturnValueOnce({
      holders: [
        { playerId: "p3", displayName: "Amy", gamesTogether: 6 },
        { playerId: "p4", displayName: "Mia", gamesTogether: 9 },
        { playerId: "p2", displayName: "Zoe", gamesTogether: 3 },
      ],
      aboveRatePercent: 66.7,
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Amy, Mia &amp; Zoe");
    expect(html).not.toContain("Amy &amp; Mia &amp; Zoe");
    expect(html).toContain("2 of your 3 games together");
    expect(html).toContain("4 of your 6 games together");
    expect(html).toContain("6 of your 9 games together");
  });
});

describe("/players/{id} — By roster section (M3 Stage 2, criteria 207–210)", () => {
  it("renders one row per exact roster, and the roster page's own href", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerRosterStats } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerRosterStats).mockResolvedValueOnce([
      { rosterId: "r1", rosterName: "Player A, B, C & E", gamesPlayed: 5, wins: 4, winRate: 0.8 },
      { rosterId: "r2", rosterName: "Player A, B, C & D", gamesPlayed: 4, wins: 1, winRate: 0.25 },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("By roster");
    expect(html).toContain("/rosters/r1");
    expect(html).toContain("80.0%");
    expect(html).toContain("4 of 5");

    // Stage 4 follow-up: each roster row also links straight into that
    // roster's own filtered games list, not just its roster page.
    expect(html).toContain("See only these games");
    expect(html).toContain("/games?roster=r1");
    expect(html).toContain("/games?roster=r2");
  });

  it("no by-roster section renders for a player with no roster rows (defensive — never reachable with real games)", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);
    expect(html).not.toContain("By roster");
  });
});

describe("/players/{id} — By venue section (M3 Stage 4, criteria 256–258)", () => {
  it("renders one row per venue, the venue page's own href, this player's average there, and a final plain 'No location' row", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerVenueStats } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerVenueStats).mockResolvedValueOnce([
      {
        locationId: "loc1",
        locationName: "Player E's",
        gamesPlayed: 6,
        wins: 4,
        winRate: 2 / 3,
        average: 48.5,
      },
      {
        locationId: "loc2",
        locationName: "The Lake House",
        gamesPlayed: 2,
        wins: 0,
        winRate: 0,
        average: 61.5,
      },
      { locationId: null, locationName: null, gamesPlayed: 1, wins: 1, winRate: 1, average: 39 },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("By venue");
    expect(html).toContain("/places/loc1");
    expect(html).toContain("66.7%");
    expect(html).toContain("4 of 6");
    expect(html).toContain("48.5");

    // The final "No location" row: plain text, never a link (criterion 251).
    expect(html).toContain("No location");
    expect(html).toContain("100.0%");
    expect(html).toContain("39.0");
  });

  it("⚠️ criterion 251: 'No location' never renders as an `EntityLink` — no `/places/` href beside it", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerVenueStats } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerVenueStats).mockResolvedValueOnce([
      { locationId: null, locationName: null, gamesPlayed: 9, wins: 5, winRate: 5 / 9, average: 50 },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No location");
    expect(html).not.toContain("/places/null");
  });

  it("⚠️ criterion 258: a player whose only games have no location still gets the section, never a vanished heading", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerVenueStats } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerVenueStats).mockResolvedValueOnce([
      { locationId: null, locationName: null, gamesPlayed: 9, wins: 5, winRate: 5 / 9, average: 50 },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("By venue");
  });
});

describe("/players/{id} — Streak, in context (M3 Stage 2, criteria 211–212)", () => {
  it("renders both personal record cards with their own tap-through links", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerStreaks } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerStreaks).mockResolvedValueOnce({
      longestWinningStreak: { length: 4, games: [{ id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] }] },
      drought: { length: 3, games: [{ id: "g2", playedOn: "2026-02-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Player B"] }] },
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Streak, in context");
    expect(html).toContain("Longest winning streak");
    expect(html).toContain("The drought");
    expect(html).toContain("/players/p1?streak=winning");
    expect(html).toContain("/players/p1?streak=drought");
  });

  it("a card with no qualifying games (a real 0-length streak) renders inert, with no tap-through", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain("/players/p1?streak=winning");
    expect(html).not.toContain("/players/p1?streak=drought");
  });
});

describe("/players/{id}?opponent= — the head-to-head drill-through (criterion 204)", () => {
  it("names both players and states the sample, over exactly that pair's shared games, newest first", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 2,
      wins: 1,
      winRate: 0.5,
      games: [],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerHeadToHead).mockResolvedValueOnce([
      {
        opponentId: "p2",
        displayName: "Player B",
        gamesTogether: 2,
        wins: 1,
        opponentWins: 1,
        winRate: 0.5,
        opponentWinRate: 0.5,
        aboveRate: 0.5,
        opponentAboveRate: 0.5,
        games: [
          { id: "g2", playedOn: "2026-01-08", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] },
          { id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Player B"] },
        ],
      },
    ]);

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: Promise.resolve({ opponent: "p2" }),
    });
    const appBar = (element as FragmentElement).props.children[0] as {
      props: { title: string; context: string };
    };
    expect(appBar.props.title).toBe("Sam & Player B");
    expect(appBar.props.context).toBe("2 games together");

    const html = renderToStaticMarkup(element);
    const g2Index = html.indexOf("/games/g2");
    const g1Index = html.indexOf("/games/g1");
    expect(g2Index).toBeGreaterThan(-1);
    expect(g1Index).toBeGreaterThan(g2Index);
  });

  it("a made-up opponent id 404s — there is nothing to drill into", async () => {
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
    await expect(
      PlayerPage({
        params: Promise.resolve({ id: "p1" }),
        searchParams: Promise.resolve({ opponent: "made-up" }),
      }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });
});

describe("/players/{id}?streak= — the personal streak/drought drill-through (criteria 211–212)", () => {
  it("⚠️ renders oldest → newest, the one deliberate exception to newest-first", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 4,
      wins: 3,
      winRate: 0.75,
      games: [],
    });

    const { getPlayerStreaks } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerStreaks).mockResolvedValueOnce({
      longestWinningStreak: {
        length: 2,
        games: [
          { id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] },
          { id: "g2", playedOn: "2026-01-08", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] },
        ],
      },
      drought: { length: 0, games: [] },
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: Promise.resolve({ streak: "winning" }),
    });
    const appBar = (element as FragmentElement).props.children[0] as {
      props: { title: string; context: string };
    };
    expect(appBar.props.title).toBe("Longest winning streak — Sam");
    expect(appBar.props.context).toBe("2 games in a row");

    const html = renderToStaticMarkup(element);
    const g1Index = html.indexOf("/games/g1");
    const g2Index = html.indexOf("/games/g2");
    expect(g1Index).toBeGreaterThan(-1);
    expect(g2Index).toBeGreaterThan(g1Index);
  });

  it("a streak of 0 (no qualifying games) 404s — there is nothing to drill into", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 3,
      wins: 0,
      winRate: 0,
      games: [],
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    await expect(
      PlayerPage({
        params: Promise.resolve({ id: "p1" }),
        searchParams: Promise.resolve({ streak: "winning" }),
      }),
    ).rejects.toBeInstanceOf(hoisted.NotFoundSignal);
  });

  it("the drought drill-through uses its own title and unit", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 3,
      wins: 1,
      winRate: 1 / 3,
      games: [],
    });

    const { getPlayerStreaks } = await import("@/lib/players/rivalry");
    vi.mocked(getPlayerStreaks).mockResolvedValueOnce({
      longestWinningStreak: { length: 1, games: [] },
      drought: {
        length: 2,
        games: [
          { id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Player B"] },
          { id: "g2", playedOn: "2026-01-08", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Player B"] },
        ],
      },
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: Promise.resolve({ streak: "drought" }),
    });
    const appBar = (element as FragmentElement).props.children[0] as {
      props: { title: string; context: string };
    };
    expect(appBar.props.title).toBe("The drought — Sam");
    expect(appBar.props.context).toBe("2 games without a win");
  });
});

describe("/players/{id} — distributions (M3 Stage 3, criterion 243)", () => {
  it("renders average final score, the eleven-hand profile with the worst hand marked, and best/worst game", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    vi.mocked(getPlayerDistributions).mockResolvedValueOnce({
      average: { average: 61.4, gamesPlayed: 9 },
      handProfile: [
        { hand: 1, label: "3s", mean: 3.4 },
        { hand: 11, label: "Kings", mean: 15.5 },
      ],
      worstHands: ["Kings"],
      bestGame: {
        score: 39,
        games: [
          { id: "g10", playedOn: "2026-07-12", locationName: null, rosterId: "r1", rosterName: "Sunday crew", winners: ["Sam"] },
        ],
      },
      worstGame: {
        score: 142,
        games: [
          { id: "g11", playedOn: "2026-09-05", locationName: null, rosterId: "r1", rosterName: "Sunday crew", winners: ["Player B"] },
        ],
      },
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Average final score");
    expect(html).toContain("61.4");
    expect(html).toContain("from 9 games");

    expect(html).toContain("Eleven-hand profile");
    expect(html).toContain("3.4");
    expect(html).toContain("15.5");

    expect(html).toContain("Best and worst game");
    expect(html).toContain("Best game");
    expect(html).toContain("39");
    expect(html).toContain("/games/g10");
    expect(html).toContain("Worst game");
    expect(html).toContain("142");
    expect(html).toContain("/games/g11");
  });

  it("⚠️ criterion 245: a one-game player still shows every one of these three, with no floor", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce({
      id: "p1",
      displayName: "Sam",
      gamesPlayed: 1,
      wins: 1,
      winRate: 1,
      games: [],
    });

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    vi.mocked(getPlayerDistributions).mockResolvedValueOnce({
      average: { average: 40, gamesPlayed: 1 },
      handProfile: [{ hand: 1, label: "3s", mean: 4 }],
      worstHands: ["3s"],
      bestGame: {
        score: 40,
        games: [{ id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] }],
      },
      worstGame: {
        score: 40,
        games: [{ id: "g1", playedOn: "2026-01-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] }],
      },
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("from 1 game<");
    expect(html).toContain("Best game");
    expect(html).toContain("Worst game");
  });

  it("a personal best repeated across two games links to the newest of them", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    vi.mocked(getPlayerPage).mockResolvedValueOnce(populatedPlayer());

    const { getPlayerDistributions } = await import("@/lib/players/distributions");
    vi.mocked(getPlayerDistributions).mockResolvedValueOnce({
      average: { average: 50, gamesPlayed: 2 },
      handProfile: [],
      worstHands: [],
      bestGame: {
        score: 40,
        games: [
          { id: "g-newest", playedOn: "2026-02-08", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] },
          { id: "g-oldest", playedOn: "2026-02-01", locationName: null, rosterId: "r1", rosterName: "Thursday crew", winners: ["Sam"] },
        ],
      },
      worstGame: null,
    });

    const { default: PlayerPage } = await import("@/app/players/[id]/page");
    const element = await PlayerPage({
      params: Promise.resolve({ id: "p1" }),
      searchParams: noSearchParams,
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("/games/g-newest");
    expect(html).not.toContain("/games/g-oldest");
  });
});
