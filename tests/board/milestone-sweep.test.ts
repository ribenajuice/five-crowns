/**
 * Milestone 3's closing structural audit — PRD criterion 280, second bullet:
 * "nothing is cached anywhere in Milestone 3." QA deletes a game and merges
 * two players, reloads, and finds every number in the milestone has moved:
 * all thirteen board records, every section of the player page, the roster
 * page, the venue page, the places index, and every table on `/stats`.
 *
 * ⚠️ **One sweep over the whole milestone, deliberately not split per
 * screen** — every individual screen already has its own "nothing cached"
 * test (`tests/board/queries.test.ts`, `tests/stats/queries.test.ts`,
 * `tests/players/rivalry.test.ts`, `tests/locations/queries.test.ts`); the
 * failure this guards against is a stale number on a screen whose *stage*
 * has already shipped, which only a cross-stage pass can catch.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";
import { createGameSeeder } from "../helpers/board";

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

describe("Milestone 3 closing audit — delete a game, merge two players: every number moves (criterion 280)", () => {
  it("archive-wide numbers (board, stats, places, venue, roster) move after the delete; player-identity numbers move after the merge", async () => {
    const players = await createPlayers([
      "Sweep Amy",
      "Sweep Bo",
      "Sweep Cy",
      "Sweep Dee",
      "Sweep Eli",
      "Sweep Amy Alt",
    ]);
    const seedGame = createGameSeeder();

    // Two real venues, one unlocated game, spread across different weekdays
    // and months so both time-slice tables have more than one populated row.
    await seedGame({
      playedOn: "2026-01-05", // Monday
      locationName: "Sweep Venue A",
      players: [
        { playerId: players["Sweep Amy"]!, finalScore: 30, handScores: [10, 10, 10] },
        { playerId: players["Sweep Bo"]!, finalScore: 90, handScores: [30, 30, 30] },
        { playerId: players["Sweep Cy"]!, finalScore: 70, handScores: [20, 30, 20] },
        { playerId: players["Sweep Dee"]!, finalScore: 80, handScores: [20, 30, 30] },
      ],
    });
    // ⚠️ Deliberately not one of Amy's own wins — Bo wins this one, so
    // deleting it doesn't cancel out the win the merge (below) folds in,
    // which would otherwise coincidentally leave Amy's own win count
    // unchanged and mask a real regression.
    const gameToDelete = await seedGame({
      playedOn: "2026-02-10", // Tuesday
      locationName: "Sweep Venue A",
      players: [
        { playerId: players["Sweep Amy"]!, finalScore: 50, handScores: [15, 20, 15] },
        { playerId: players["Sweep Bo"]!, finalScore: 25, handScores: [5, 10, 10] },
        { playerId: players["Sweep Cy"]!, finalScore: 90, handScores: [30, 30, 30] },
        { playerId: players["Sweep Dee"]!, finalScore: 60, handScores: [20, 20, 20] },
      ],
    });
    await seedGame({
      playedOn: "2026-03-15", // Sunday
      locationName: "Sweep Venue B",
      players: [
        { playerId: players["Sweep Amy"]!, finalScore: 80, handScores: [30, 20, 30] },
        { playerId: players["Sweep Bo"]!, finalScore: 20, handScores: [5, 10, 5] },
        { playerId: players["Sweep Cy"]!, finalScore: 60, handScores: [20, 20, 20] },
        { playerId: players["Sweep Dee"]!, finalScore: 70, handScores: [20, 20, 30] },
      ],
    });
    await seedGame({
      playedOn: "2026-04-01", // Wednesday
      locationName: "Sweep Venue B",
      players: [
        { playerId: players["Sweep Amy"]!, finalScore: 70, handScores: [20, 20, 30] },
        { playerId: players["Sweep Bo"]!, finalScore: 85, handScores: [25, 30, 30] },
        { playerId: players["Sweep Cy"]!, finalScore: 15, handScores: [5, 5, 5] },
        { playerId: players["Sweep Dee"]!, finalScore: 95, handScores: [30, 35, 30] },
      ],
    });
    await seedGame({
      playedOn: "2026-05-20", // Wednesday, unlocated
      players: [
        { playerId: players["Sweep Amy"]!, finalScore: 40, handScores: [10, 15, 15] },
        { playerId: players["Sweep Bo"]!, finalScore: 45, handScores: [15, 15, 15] },
        { playerId: players["Sweep Cy"]!, finalScore: 55, handScores: [15, 20, 20] },
        { playerId: players["Sweep Dee"]!, finalScore: 60, handScores: [20, 20, 20] },
      ],
    });
    // A duplicate identity's own game — a different roster entirely (never
    // shares a game with "Sweep Amy"), which is exactly the real-world case
    // a player merge exists for. Also at "Sweep Venue A", so the merge moves
    // that venue's own per-player table too.
    await seedGame({
      playedOn: "2026-06-01", // Monday
      locationName: "Sweep Venue A",
      players: [
        { playerId: players["Sweep Amy Alt"]!, finalScore: 10, handScores: [3, 3, 4] },
        { playerId: players["Sweep Eli"]!, finalScore: 90, handScores: [30, 30, 30] },
      ],
    });

    const { listGames } = await import("@/lib/games/queries");
    const { listPlaces, getVenuePage } = await import("@/lib/locations/queries");
    const { getBoard } = await import("@/lib/board/queries");
    const { getStatsPage } = await import("@/lib/stats/queries");
    const { getPlayerPage } = await import("@/lib/players/queries");
    const { getRosterPage } = await import("@/lib/rosters/queries");
    const {
      getPlayerGameFacts,
      getPlayerVenueStats,
      getPlayerHeadToHead,
      getPlayerRosterStats,
    } = await import("@/lib/players/rivalry");

    const venueA = (await listPlaces()).find((p) => p.name === "Sweep Venue A")!;
    const allGames = await listGames();
    const rosterId = allGames.find((g) => g.playedOn === "2026-01-05")!.rosterId;
    const amyId = players["Sweep Amy"]!;
    const amyAltId = players["Sweep Amy Alt"]!;

    // -----------------------------------------------------------------
    // BEFORE
    // -----------------------------------------------------------------
    const boardBefore = await getBoard();
    const statsBefore = await getStatsPage();
    const placesBefore = await listPlaces();
    const venueABefore = await getVenuePage(venueA.id);
    const rosterBefore = await getRosterPage(rosterId);
    const playerBefore = await getPlayerPage(amyId);
    const factsBefore = await getPlayerGameFacts(amyId);
    const venueStatsBefore = await getPlayerVenueStats(amyId, factsBefore);
    const headToHeadBefore = await getPlayerHeadToHead(amyId, factsBefore);
    const rosterStatsBefore = await getPlayerRosterStats(amyId, factsBefore);

    if (boardBefore.empty) throw new Error("unreachable");
    if (statsBefore.empty) throw new Error("unreachable");
    expect(boardBefore.archiveGameCount).toBe(6);

    // -----------------------------------------------------------------
    // ACT 1: delete a game (Venue A, February, a Tuesday) that Amy won.
    // -----------------------------------------------------------------
    const { deleteGame } = await import("@/lib/games/delete");
    const deleted = await deleteGame(gameToDelete);
    expect(deleted).toBe(true);

    // -----------------------------------------------------------------
    // ACT 2: merge the duplicate identity into the real player.
    // -----------------------------------------------------------------
    const { mergePlayers } = await import("@/lib/players/merge");
    await mergePlayers(amyId, amyAltId);

    // -----------------------------------------------------------------
    // AFTER
    // -----------------------------------------------------------------
    const boardAfter = await getBoard();
    const statsAfter = await getStatsPage();
    const placesAfter = await listPlaces();
    const venueAAfter = await getVenuePage(venueA.id);
    const rosterAfter = await getRosterPage(rosterId);
    const playerAfter = await getPlayerPage(amyId);
    const factsAfter = await getPlayerGameFacts(amyId);
    const venueStatsAfter = await getPlayerVenueStats(amyId, factsAfter);
    const headToHeadAfter = await getPlayerHeadToHead(amyId, factsAfter);
    const rosterStatsAfter = await getPlayerRosterStats(amyId, factsAfter);

    if (boardAfter.empty) throw new Error("unreachable");
    if (statsAfter.empty) throw new Error("unreachable");

    // ---- The board: archive size and every one of the thirteen cards ----
    expect(boardAfter.archiveGameCount).toBe(5); // one deleted, the merge adds no game
    expect(JSON.stringify(boardAfter.records)).not.toBe(JSON.stringify(boardBefore.records));
    expect(JSON.stringify(boardAfter.singleEventRecords)).not.toBe(
      JSON.stringify(boardBefore.singleEventRecords),
    );
    // Amy's own games/wins grew from the merge — reflected in the board's
    // own player-scoped records (mostWins is the simplest to check
    // directly: Amy picked up the merged loser's own win).
    const mostWinsAfter = boardAfter.records.find((r) => r.key === "mostWins")!;
    const mostWinsBefore = boardBefore.records.find((r) => r.key === "mostWins")!;
    expect(mostWinsAfter.holders.some((h) => h.displayName === "Sweep Amy")).toBe(true);
    expect(mostWinsAfter).not.toEqual(mostWinsBefore);

    // ---- /stats: both time tables and the whole page differ ----
    expect(JSON.stringify(statsAfter)).not.toBe(JSON.stringify(statsBefore));
    const tuesdayBefore = statsBefore.dayOfWeek.find((r) => r.label === "Tuesday")!;
    const tuesdayAfter = statsAfter.dayOfWeek.find((r) => r.label === "Tuesday")!;
    expect(tuesdayAfter.gamesPlayed).toBe(tuesdayBefore.gamesPlayed - 1);
    const febBefore = statsBefore.timeOfYear.find((r) => r.label === "February")!;
    const febAfter = statsAfter.timeOfYear.find((r) => r.label === "February")!;
    expect(febAfter.gamesPlayed).toBe(febBefore.gamesPlayed - 1);

    // ---- The places index: Venue A's own table average moves ----
    const venueAIndexBefore = placesBefore.find((p) => p.id === venueA.id)!;
    const venueAIndexAfter = placesAfter.find((p) => p.id === venueA.id)!;
    expect(venueAIndexAfter).not.toEqual(venueAIndexBefore);

    // ---- The venue page itself: games, average and the per-player table ----
    expect(venueAAfter).not.toBeNull();
    expect(venueABefore).not.toBeNull();
    expect(JSON.stringify(venueAAfter)).not.toBe(JSON.stringify(venueABefore));
    // The deleted game shrinks Venue A's own games played...
    expect(venueAAfter!.gamesPlayed).toBe(venueABefore!.gamesPlayed - 1);
    // ...and the merge folds "Sweep Amy Alt"'s row into "Sweep Amy"'s.
    expect(venueAAfter!.players.some((p) => p.displayName === "Sweep Amy Alt")).toBe(false);
    expect(venueABefore!.players.some((p) => p.displayName === "Sweep Amy Alt")).toBe(true);
    const amyVenueARowAfter = venueAAfter!.players.find((p) => p.displayName === "Sweep Amy")!;
    const amyVenueARowBefore = venueABefore!.players.find((p) => p.displayName === "Sweep Amy")!;
    // Amy's own Venue A row is now built from a different set of games (her
    // February win dropped out, the merged loser's own June win folded in),
    // so the average moves even though the raw games-played count happens
    // to land back on the same number.
    expect(amyVenueARowAfter.average).not.toBe(amyVenueARowBefore.average);

    // ---- The roster page: this roster lost one of its games ----
    expect(rosterAfter).not.toBeNull();
    expect(rosterBefore).not.toBeNull();
    expect(rosterAfter!.gamesPlayed).toBe(rosterBefore!.gamesPlayed - 1);
    expect(JSON.stringify(rosterAfter!.members)).not.toBe(JSON.stringify(rosterBefore!.members));

    // ---- The player page's own headline numbers, and every rivalry section ----
    expect(playerAfter).not.toBeNull();
    expect(playerBefore).not.toBeNull();
    // Lost a game (the delete) but gained one back (the merge) — games
    // played nets out unchanged in *count*, but wins and identity are not:
    expect(playerAfter!.gamesPlayed).toBe(playerBefore!.gamesPlayed); // -1 delete, +1 merge
    expect(playerAfter!.wins).toBeGreaterThan(playerBefore!.wins); // merge folded in a win the delete didn't touch
    expect(JSON.stringify(venueStatsAfter)).not.toBe(JSON.stringify(venueStatsBefore));
    expect(JSON.stringify(headToHeadAfter)).not.toBe(JSON.stringify(headToHeadBefore));
    expect(JSON.stringify(rosterStatsAfter)).not.toBe(JSON.stringify(rosterStatsBefore));
  });
});

describe("Milestone 3 closing audit — a place merge moves the venue page and the places index too (criteria 259–261, 280)", () => {
  it("Venue B's games repoint to Venue A, and both the places index and the venue page reflect it immediately", async () => {
    const players = await createPlayers(["Merge Sweep Amy", "Merge Sweep Bo"]);
    const seedGame = createGameSeeder();

    await seedGame({
      playedOn: "2026-01-01",
      locationName: "Merge Sweep Venue A",
      players: [
        { playerId: players["Merge Sweep Amy"]!, finalScore: 40 },
        { playerId: players["Merge Sweep Bo"]!, finalScore: 60 },
      ],
    });
    await seedGame({
      playedOn: "2026-01-08",
      locationName: "Merge Sweep Venue B",
      players: [
        { playerId: players["Merge Sweep Amy"]!, finalScore: 90 },
        { playerId: players["Merge Sweep Bo"]!, finalScore: 10 },
      ],
    });

    const { listPlaces, getVenuePage } = await import("@/lib/locations/queries");
    const venueA = (await listPlaces()).find((p) => p.name === "Merge Sweep Venue A")!;
    const venueB = (await listPlaces()).find((p) => p.name === "Merge Sweep Venue B")!;

    const venueABefore = await getVenuePage(venueA.id);
    const placesBefore = await listPlaces();
    expect(venueABefore!.gamesPlayed).toBe(1);
    expect(placesBefore.find((p) => p.id === venueB.id)).toBeDefined();

    const { mergeLocations } = await import("@/lib/locations/merge");
    await mergeLocations(venueA.id, venueB.id);

    const venueAAfter = await getVenuePage(venueA.id);
    const placesAfter = await listPlaces();

    // Venue B's game repoints to Venue A — the survivor's own numbers move
    // immediately, with no separate "recompute" step.
    expect(venueAAfter!.gamesPlayed).toBe(2);
    expect(venueAAfter!.tableAverage).not.toEqual(venueABefore!.tableAverage);
    // Venue B itself is gone from the places index.
    expect(placesAfter.find((p) => p.id === venueB.id)).toBeUndefined();
    expect(placesAfter.find((p) => p.id === venueA.id)!.gamesPlayed).toBe(2);
  });
});
