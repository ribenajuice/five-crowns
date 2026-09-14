/**
 * `lib/players/rivalry.ts` — PRD criteria 197–212, 219–221.
 *
 * Covers: head-to-head over shared games only, "finishing above" vs. wins
 * (criteria 197–198), symmetry between two players' own pages (205), a
 * shared win surviving in both columns (criterion 66's constructed tie,
 * reused here), nemesis with a clear holder / a tie / nobody qualifying / no
 * shared games at all, per-roster stats summing to the overall games played
 * (210) and matching the roster page (209), streak-in-context and the
 * drought, nothing cached across a delete and a merge (220), and a bounded
 * query-count proof (221).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";
import { createGameSeeder } from "../helpers/board";

// ---------------------------------------------------------------------------
// Query-count instrumentation (criterion 221) — same proxy pattern as
// `tests/board/queries.test.ts`'s own proof for `getBoard()`.
// ---------------------------------------------------------------------------
let selectCallCount = 0;

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getDb: () => {
      const real = actual.getDb();
      return new Proxy(real, {
        get(target, prop, _receiver) {
          if (prop === "select") selectCallCount++;
          const value = Reflect.get(target as object, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
});

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "rivalry-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

describe("getPlayerHeadToHead — criteria 197–198, 203–205", () => {
  it("a game either of them played without the other is not in the sample", async () => {
    const players = await createPlayers(["Amy", "Bo", "Stranger"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    // Amy plays a game Bo isn't in at all.
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Stranger"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Amy"]!);
    const bo = rows.find((r) => r.opponentId === players["Bo"]);
    expect(bo?.gamesTogether).toBe(1);
  });

  it("⚠️ a game a third player won counts in gamesTogether and in neither win column", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Cy"]!, finalScore: 10 }, // Cy wins outright.
        { playerId: players["Amy"]!, finalScore: 60 }, // Amy finishes above Bo.
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Amy"]!);
    const bo = rows.find((r) => r.opponentId === players["Bo"])!;
    expect(bo.gamesTogether).toBe(1);
    expect(bo.wins).toBe(0);
    expect(bo.opponentWins).toBe(0);
    // But "finishing above" still resolves — this is what nemesis is built on.
    expect(bo.aboveRate).toBe(1);
    expect(bo.opponentAboveRate).toBe(0);
  });

  it("⚠️ criterion 66's constructed tie: a shared win between A and B shows as a win in both columns", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 50 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const amyRows = await getPlayerHeadToHead(players["Amy"]!);
    const row = amyRows.find((r) => r.opponentId === players["Bo"])!;
    expect(row.wins).toBe(1);
    expect(row.opponentWins).toBe(1);
    // The two win rates sum past 100% and nothing here treats that as an error.
    expect(row.winRate + row.opponentWinRate).toBeGreaterThan(1);
    // A level final score is neither above nor below.
    expect(row.aboveRate).toBe(0);
    expect(row.opponentAboveRate).toBe(0);
  });

  it("⚠️ the same pair reads the same from either side (criterion 205)", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 70 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const amyRows = await getPlayerHeadToHead(players["Amy"]!);
    const boRows = await getPlayerHeadToHead(players["Bo"]!);

    const amyOnBo = amyRows.find((r) => r.opponentId === players["Bo"])!;
    const boOnAmy = boRows.find((r) => r.opponentId === players["Amy"])!;

    expect(amyOnBo.gamesTogether).toBe(boOnAmy.gamesTogether);
    expect(amyOnBo.wins).toBe(boOnAmy.opponentWins);
    expect(amyOnBo.opponentWins).toBe(boOnAmy.wins);
    expect(amyOnBo.aboveRate).toBe(boOnAmy.opponentAboveRate);
    expect(amyOnBo.opponentAboveRate).toBe(boOnAmy.aboveRate);
  });

  it("orders rows by games together descending, then alphabetically", async () => {
    const players = await createPlayers(["Amy", "Zoe", "Bo"]);
    const seedGame = createGameSeeder();
    // Amy & Zoe share 1 game; Amy & Bo share 2.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Zoe"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Amy"]!);
    expect(rows.map((r) => r.displayName)).toEqual(["Bo", "Zoe"]);
  });

  it("⚠️ tapping a row lands on exactly the games both players played (criterion 204)", async () => {
    const players = await createPlayers(["Amy", "Bo", "Stranger"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Stranger"]!, finalScore: 90 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Amy"]!, finalScore: 60 },
        { playerId: players["Bo"]!, finalScore: 30 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Amy"]!);
    const bo = rows.find((r) => r.opponentId === players["Bo"])!;
    expect(bo.games).toHaveLength(2);
    // Newest first.
    expect(bo.games.map((g) => g.playedOn)).toEqual(["2026-01-15", "2026-01-01"]);
  });

  it("a player with no shared games at all sees the section's own empty state", async () => {
    const players = await createPlayers(["Solo"]);
    const seedGame = createGameSeeder();
    // Solo needs at least one other player to form a playable roster, so seed
    // a companion who then never plays with Solo again — Solo's own row set
    // for this test is simply never queried against a shared opponent here;
    // a player with literally zero games returns [] regardless.
    void seedGame;
    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    expect(await getPlayerHeadToHead(players["Solo"]!)).toEqual([]);
  });

  it("criterion 200: a pair with exactly one shared game shows a plain 100.0%-equivalent rate", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 40 },
        { playerId: players["Bo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Amy"]!);
    const bo = rows.find((r) => r.opponentId === players["Bo"])!;
    expect(bo.gamesTogether).toBe(1);
    expect(bo.aboveRate).toBe(1);
  });
});

describe("nemesis — criteria 199–201, 206", () => {
  it("a clear holder", async () => {
    const players = await createPlayers(["Me", "Sam", "Jo"]);
    const seedGame = createGameSeeder();
    // Sam finishes above Me in 2 of 2; Jo finishes above Me in 1 of 2.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Me"]!, finalScore: 90 },
        { playerId: players["Sam"]!, finalScore: 40 },
        { playerId: players["Jo"]!, finalScore: 40 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Me"]!, finalScore: 50 },
        { playerId: players["Sam"]!, finalScore: 30 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Me"]!);
    const result = nemesisFromHeadToHead(rows);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Sam"]);
    expect(result.aboveRatePercent).toBe(100);
  });

  it("a tie: joint holders, alphabetical", async () => {
    const players = await createPlayers(["Me", "Sam", "Jo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Me"]!, finalScore: 90 },
        { playerId: players["Sam"]!, finalScore: 40 },
        { playerId: players["Jo"]!, finalScore: 40 },
      ],
    });

    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Me"]!);
    const result = nemesisFromHeadToHead(rows);
    expect(result.holders.map((h) => h.displayName)).toEqual(["Jo", "Sam"]);
    expect(result.aboveRatePercent).toBe(100);
  });

  it("⚠️ nobody qualifies: every shared-game opponent has a 0% rate against this player", async () => {
    const players = await createPlayers(["Me", "Sam", "Jo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Me"]!, finalScore: 10 },
        { playerId: players["Sam"]!, finalScore: 80 },
        { playerId: players["Jo"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead, nemesisFromHeadToHead } = await import("@/lib/players/rivalry");
    const rows = await getPlayerHeadToHead(players["Me"]!);
    const result = nemesisFromHeadToHead(rows);
    expect(result).toEqual({ holders: [], aboveRatePercent: null });
  });

  it("⚠️ a player with no shared games at all also has no nemesis", async () => {
    const players = await createPlayers(["Solo"]);
    const { getPlayerNemesis } = await import("@/lib/players/rivalry");
    expect(await getPlayerNemesis(players["Solo"]!)).toEqual({ holders: [], aboveRatePercent: null });
  });

  it("⚠️ nemesis is asymmetric: P's nemesis may not be Q's nemesis", async () => {
    const players = await createPlayers(["P", "Q"]);
    const seedGame = createGameSeeder();
    // Q always finishes above P, but P and Q's roles differ round to round.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["P"]!, finalScore: 90 },
        { playerId: players["Q"]!, finalScore: 40 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["P"]!, finalScore: 80 },
        { playerId: players["Q"]!, finalScore: 30 },
      ],
    });

    const { getPlayerNemesis } = await import("@/lib/players/rivalry");
    const pNemesis = await getPlayerNemesis(players["P"]!);
    const qNemesis = await getPlayerNemesis(players["Q"]!);
    expect(pNemesis.holders.map((h) => h.displayName)).toEqual(["Q"]);
    // Q has never finished above P — nobody qualifies as Q's nemesis.
    expect(qNemesis.holders).toEqual([]);
  });
});

describe("getPlayerRosterStats — criteria 207–210", () => {
  it("⚠️ the by-roster rows' games sum exactly to the player's overall games played", async () => {
    const players = await createPlayers(["Amy", "Bo", "Cy", "Dee"]);
    const seedGame = createGameSeeder();
    // Roster 1: Amy + Bo, two games.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 40 },
      ],
    });
    // Roster 2: Amy + Bo + Cy + Dee (a different, larger exact set), one game.
    await seedGame({
      playedOn: "2026-01-15",
      players: [
        { playerId: players["Amy"]!, finalScore: 30 },
        { playerId: players["Bo"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 50 },
        { playerId: players["Dee"]!, finalScore: 60 },
      ],
    });

    const { getPlayerRosterStats } = await import("@/lib/players/rivalry");
    const { getPlayerPage } = await import("@/lib/players/queries");

    const stats = await getPlayerRosterStats(players["Amy"]!);
    const page = await getPlayerPage(players["Amy"]!);

    expect(stats).toHaveLength(2);
    const sum = stats.reduce((total, s) => total + s.gamesPlayed, 0);
    expect(sum).toBe(page!.gamesPlayed);
    expect(sum).toBe(3);

    const twoHander = stats.find((s) => s.gamesPlayed === 2)!;
    expect(twoHander.wins).toBe(1); // Amy won the 50-vs-80 game only.
    expect(twoHander.winRate).toBe(0.5);
  });

  it("⚠️ the two sides cannot disagree: matches the roster page's own member figure", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // A shared win (criterion 66's tie), plus a solo loss.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 50 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy"]!, finalScore: 90 },
        { playerId: players["Bo"]!, finalScore: 40 },
      ],
    });

    const { getPlayerRosterStats } = await import("@/lib/players/rivalry");
    const { listRosters, getRosterPage } = await import("@/lib/rosters/queries");

    const rosters = await listRosters();
    const rosterId = rosters[0]!.id;
    const rosterPage = await getRosterPage(rosterId);
    const amyOnRosterPage = rosterPage!.members.find((m) => m.playerId === players["Amy"])!;

    const stats = await getPlayerRosterStats(players["Amy"]!);
    const amyOnPlayerSide = stats.find((s) => s.rosterId === rosterId)!;

    expect(amyOnPlayerSide.wins).toBe(amyOnRosterPage.wins);
    expect(amyOnPlayerSide.winRate).toBe(amyOnRosterPage.winRate);
    expect(amyOnPlayerSide.gamesPlayed).toBe(rosterPage!.gamesPlayed);
  });

  it("a player with no games has no roster rows", async () => {
    const players = await createPlayers(["Solo"]);
    const { getPlayerRosterStats } = await import("@/lib/players/rivalry");
    expect(await getPlayerRosterStats(players["Solo"]!)).toEqual([]);
  });
});

describe("getPlayerStreaks — criteria 211–212", () => {
  it("exposes criterion 177's own streak, unchanged, and its negation", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    // Amy: win, win, loss, win, win → longest streak 2, longest drought 1.
    const outcomes: [string, number, number][] = [
      ["2026-01-01", 50, 80],
      ["2026-01-08", 50, 80],
      ["2026-01-15", 80, 50],
      ["2026-01-22", 50, 80],
      ["2026-01-29", 50, 80],
    ];
    for (const [playedOn, amyScore, boScore] of outcomes) {
      await seedGame({
        playedOn,
        players: [
          { playerId: players["Amy"]!, finalScore: amyScore },
          { playerId: players["Bo"]!, finalScore: boScore },
        ],
      });
    }

    const { getPlayerStreaks } = await import("@/lib/players/rivalry");
    const streaks = await getPlayerStreaks(players["Amy"]!);
    expect(streaks.longestWinningStreak.length).toBe(2);
    expect(streaks.drought.length).toBe(1);
    expect(streaks.drought.games).toHaveLength(1);
    expect(streaks.drought.games[0]!.playedOn).toBe("2026-01-15");
  });

  it("a player with no games has no streak and no drought", async () => {
    const players = await createPlayers(["Solo"]);
    const { getPlayerStreaks } = await import("@/lib/players/rivalry");
    const streaks = await getPlayerStreaks(players["Solo"]!);
    expect(streaks.longestWinningStreak).toEqual({ length: 0, games: [] });
    expect(streaks.drought).toEqual({ length: 0, games: [] });
  });
});

describe("nothing is cached (criterion 220)", () => {
  it("reflects a deleted game on the very next call", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    const gameId = await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const before = await getPlayerHeadToHead(players["Amy"]!);
    expect(before).toHaveLength(1);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const after = await getPlayerHeadToHead(players["Amy"]!);
    expect(after).toHaveLength(0);
  });

  it("⚠️ on a merge: the survivor's rows are the union of both players' opponents, and none names the merged-away player", async () => {
    const players = await createPlayers(["Amy", "Amy Alt", "Bo", "Cy"]);
    const seedGame = createGameSeeder();
    // Amy has played Bo; her duplicate "Amy Alt" has separately played Cy.
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      players: [
        { playerId: players["Amy Alt"]!, finalScore: 40 },
        { playerId: players["Cy"]!, finalScore: 90 },
      ],
    });

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    const before = await getPlayerHeadToHead(players["Amy"]!);
    expect(before.map((r) => r.opponentId).sort()).toEqual([players["Bo"]].sort());

    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(players["Amy"]!, players["Amy Alt"]!);

    const after = await getPlayerHeadToHead(players["Amy"]!);
    expect(after.map((r) => r.displayName).sort()).toEqual(["Bo", "Cy"]);
    // No row can ever name "Amy Alt" — the merged-away player id no longer exists.
    expect(after.some((r) => r.opponentId === players["Amy Alt"])).toBe(false);
  });
});

describe("the query count does not grow with the archive or the group (criterion 221)", () => {
  /** Every game seeded includes all `playerCount` players, so Amy ends up with `playerCount - 1` distinct opponents. */
  async function countHeadToHeadQueriesAt(gameCount: number, playerCount: number): Promise<number> {
    const names = ["Amy", ...Array.from({ length: playerCount - 1 }, (_, i) => `Opponent ${i}`)];
    const players = await createPlayers(names);
    const seedGame = createGameSeeder();
    for (let i = 0; i < gameCount; i++) {
      const day = String((i % 27) + 1).padStart(2, "0");
      const month = String(Math.floor(i / 27) + 1).padStart(2, "0");
      await seedGame({
        playedOn: `2026-${month}-${day}`,
        players: names.map((name, idx) => ({ playerId: players[name]!, finalScore: 40 + i + idx })),
      });
    }

    const { getPlayerHeadToHead } = await import("@/lib/players/rivalry");
    selectCallCount = 0;
    await getPlayerHeadToHead(players["Amy"]!);
    return selectCallCount;
  }

  it("issues the same number of queries at 10 games and at 60", async () => {
    const queriesAt10 = await countHeadToHeadQueriesAt(10, 4);
    await teardownTestDb();
    await setupTestDb();
    const queriesAt60 = await countHeadToHeadQueriesAt(60, 4);

    expect(queriesAt10).toBeGreaterThan(0);
    expect(queriesAt60).toBe(queriesAt10);
  });

  it("issues the same number of queries at 4 players and at 8 in the group", async () => {
    const queriesAt4 = await countHeadToHeadQueriesAt(5, 4);
    await teardownTestDb();
    await setupTestDb();
    const queriesAt8 = await countHeadToHeadQueriesAt(5, 8);

    expect(queriesAt4).toBeGreaterThan(0);
    expect(queriesAt8).toBe(queriesAt4);
  });
});

describe("fetching game facts once and threading them through (code review fix)", () => {
  it("⚠️ calling all three of head-to-head, roster stats and streaks separately triples the query count that passing pre-fetched facts avoids", async () => {
    const players = await createPlayers(["Amy", "Bo"]);
    const seedGame = createGameSeeder();
    await seedGame({
      playedOn: "2026-01-01",
      players: [
        { playerId: players["Amy"]!, finalScore: 50 },
        { playerId: players["Bo"]!, finalScore: 80 },
      ],
    });

    const { getPlayerGameFacts, getPlayerHeadToHead, getPlayerRosterStats, getPlayerStreaks } =
      await import("@/lib/players/rivalry");

    // Each function fetching its own facts: three independent trips.
    selectCallCount = 0;
    await getPlayerHeadToHead(players["Amy"]!);
    await getPlayerRosterStats(players["Amy"]!);
    await getPlayerStreaks(players["Amy"]!);
    const standaloneQueries = selectCallCount;

    // Fetched once and threaded through: exactly one of those three trips.
    selectCallCount = 0;
    const facts = await getPlayerGameFacts(players["Amy"]!);
    const oneFetchQueries = selectCallCount;
    selectCallCount = 0;
    await getPlayerHeadToHead(players["Amy"]!, facts);
    await getPlayerRosterStats(players["Amy"]!, facts);
    await getPlayerStreaks(players["Amy"]!, facts);
    const threadedQueries = oneFetchQueries + selectCallCount;

    // Passing the already-fetched facts through issues no further queries at all.
    expect(selectCallCount).toBe(0);
    expect(threadedQueries).toBe(oneFetchQueries);
    expect(threadedQueries * 3).toBe(standaloneQueries);
  });
});
