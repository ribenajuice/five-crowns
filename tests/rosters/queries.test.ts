/**
 * `listRosters` and `getRosterPage` — PRD criteria 137–139.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers, setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "rosters-queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("listRosters — criterion 137", () => {
  it("says nothing on a fresh database", async () => {
    const { listRosters } = await import("@/lib/rosters/queries");
    expect(await listRosters()).toEqual([]);
  });

  it("never lists a roster with zero games", async () => {
    // Creating players alone (no game) must not manufacture a roster row.
    await createPlayers(["Player Solo"]);
    const { listRosters } = await import("@/lib/rosters/queries");
    expect(await listRosters()).toEqual([]);
  });

  it("lists a roster with its auto-name, members and games played after a save", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01);
    await saveGame(draftId, state);

    const { listRosters } = await import("@/lib/rosters/queries");
    const rosters = await listRosters();
    expect(rosters).toHaveLength(1);
    expect(rosters[0]!.name).toBeNull();
    expect(rosters[0]!.displayName).toBe("Player A, Player B, Player C & Player D");
    expect(rosters[0]!.members.sort()).toEqual(["Player A", "Player B", "Player C", "Player D"]);
    expect(rosters[0]!.gamesPlayed).toBe(1);
  });
});

describe("getRosterPage", () => {
  it("returns null for an unknown roster", async () => {
    const { getRosterPage } = await import("@/lib/rosters/queries");
    expect(await getRosterPage("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("⚠️ criterion 139: the same four plus a fifth is a different roster, and neither page moves the other's numbers", async () => {
    await teardownTestDb();
    await setupTestDb();

    const players = await createPlayers(["Player A", "Player B", "Player C", "Player D", "Player E"]);
    const { saveGame } = await import("@/lib/games/save");

    // SHEET_01: {A, B, C, D}. SHEET_02: {A, B, E, D, C} — the same four plus E.
    const four = await setUpDraft(SHEET_01, {
      playedOn: "2020-01-01",
      playerIds: {
        "Player A": players["Player A"]!,
        "Player B": players["Player B"]!,
        "Player C": players["Player C"]!,
        "Player D": players["Player D"]!,
      },
    });
    await saveGame(four.draftId, four.state);

    const five = await setUpDraft(SHEET_02, {
      playedOn: "2021-01-01",
      playerIds: {
        "Player A": players["Player A"]!,
        "Player B": players["Player B"]!,
        "Player E": players["Player E"]!,
        "Player D": players["Player D"]!,
        "Player C": players["Player C"]!,
      },
    });
    await saveGame(five.draftId, five.state);

    const { listRosters } = await import("@/lib/rosters/queries");
    const rosters = await listRosters();
    expect(rosters).toHaveLength(2);

    const fourRoster = rosters.find((r) => r.members.length === 4)!;
    const fiveRoster = rosters.find((r) => r.members.length === 5)!;
    expect(fourRoster.gamesPlayed).toBe(1);
    expect(fiveRoster.gamesPlayed).toBe(1);

    const { getRosterPage } = await import("@/lib/rosters/queries");
    const fourPage = await getRosterPage(fourRoster.id);
    const fivePage = await getRosterPage(fiveRoster.id);
    expect(fourPage!.gamesPlayed).toBe(1);
    expect(fivePage!.gamesPlayed).toBe(1);

    // Player C won SHEET_01 (the four-roster's only game) and Player B won
    // SHEET_02 (the five-roster's only game) — each roster's member stats
    // only ever reflect its own game.
    const cInFour = fourPage!.members.find((m) => m.displayName === "Player C")!;
    expect(cInFour.wins).toBe(1);
    expect(cInFour.winRate).toBe(1);

    const cInFive = fivePage!.members.find((m) => m.displayName === "Player C")!;
    expect(cInFive.wins).toBe(0);
    expect(cInFive.winRate).toBe(0);
  });

  it("⚠️ criterion 224: the table average is the mean of every final score in the roster's games, stated with both the games and the scores behind it", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const players = await createPlayers(["Player A", "Player B", "Player C", "Player D"]);
    const only = await setUpDraft(SHEET_01, {
      playedOn: "2026-01-01",
      playerIds: {
        "Player A": players["Player A"]!,
        "Player B": players["Player B"]!,
        "Player C": players["Player C"]!,
        "Player D": players["Player D"]!,
      },
    });
    await saveGame(only.draftId, only.state);

    const { listRosters, getRosterPage } = await import("@/lib/rosters/queries");
    const rosterId = (await listRosters())[0]!.id;
    const page = await getRosterPage(rosterId);

    // SHEET_01 finals: A=137, B=109, C=78, D=111 → mean 108.75 → 108.8.
    expect(page!.tableAverage).toEqual({ average: 108.8, gamesPlayed: 1, scoresCount: 4 });
  });

  it("⚠️ criterion 244: each member's own average is restricted to this roster's games only, and neither roster's numbers move the other's (criterion 139's own invariant, restated for this new number)", async () => {
    await teardownTestDb();
    await setupTestDb();

    const players = await createPlayers(["Player A", "Player B", "Player C", "Player D", "Player E"]);
    const { saveGame } = await import("@/lib/games/save");

    const four = await setUpDraft(SHEET_01, {
      playedOn: "2020-01-01",
      playerIds: {
        "Player A": players["Player A"]!,
        "Player B": players["Player B"]!,
        "Player C": players["Player C"]!,
        "Player D": players["Player D"]!,
      },
    });
    await saveGame(four.draftId, four.state);

    const five = await setUpDraft(SHEET_02, {
      playedOn: "2021-01-01",
      playerIds: {
        "Player A": players["Player A"]!,
        "Player B": players["Player B"]!,
        "Player E": players["Player E"]!,
        "Player D": players["Player D"]!,
        "Player C": players["Player C"]!,
      },
    });
    await saveGame(five.draftId, five.state);

    const { listRosters, getRosterPage } = await import("@/lib/rosters/queries");
    const rosters = await listRosters();
    const fourRoster = rosters.find((r) => r.members.length === 4)!;
    const fiveRoster = rosters.find((r) => r.members.length === 5)!;

    const fourPage = await getRosterPage(fourRoster.id);
    const fivePage = await getRosterPage(fiveRoster.id);

    // Player C's SHEET_01 score (78) and SHEET_02 score (144) belong to two
    // different rosters — neither page's average for "Player C" reflects the
    // other roster's game.
    const cInFour = fourPage!.members.find((m) => m.displayName === "Player C")!;
    expect(cInFour.average).toEqual({ average: 78, gamesPlayed: 1 });

    const cInFive = fivePage!.members.find((m) => m.displayName === "Player C")!;
    expect(cInFive.average).toEqual({ average: 144, gamesPlayed: 1 });

    // Every member's own `gamesPlayed` within a roster equals that roster's
    // own `gamesPlayed` — an exact-set roster's members always share it.
    for (const member of fourPage!.members) expect(member.average!.gamesPlayed).toBe(fourPage!.gamesPlayed);
    for (const member of fivePage!.members) expect(member.average!.gamesPlayed).toBe(fivePage!.gamesPlayed);
  });

  it("a roster with no games (a made-up id's own case is `null`, not covered here) still returns a table average once it has one game", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const older = await setUpDraft(SHEET_01, { playedOn: "2020-01-01" });
    await saveGame(older.draftId, older.state);

    const { listRosters, getRosterPage } = await import("@/lib/rosters/queries");
    const rosterId = (await listRosters())[0]!.id;
    const page = await getRosterPage(rosterId);
    expect(page!.tableAverage).not.toBeNull();
    expect(page!.tableAverage!.gamesPlayed).toBe(1);
  });

  it("games are newest first, with winner names and 'No location' handling left to the caller", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const older = await setUpDraft(SHEET_01, { playedOn: "2020-01-01", newLocationName: "The venue" });
    await saveGame(older.draftId, older.state);

    const { listRosters } = await import("@/lib/rosters/queries");
    const rosterId = (await listRosters())[0]!.id;

    const { getRosterPage } = await import("@/lib/rosters/queries");
    const page = await getRosterPage(rosterId);
    expect(page!.games).toHaveLength(1);
    expect(page!.games[0]!.locationName).toBe("The venue");
    expect(page!.games[0]!.winners).toEqual(["Player C"]);
  });
});
