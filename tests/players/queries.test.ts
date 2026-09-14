/**
 * `listPlayers` and `getPlayerPage` — PRD criteria 132–136.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers, setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "players-queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("listPlayers — criterion 132", () => {
  it("says nothing on a fresh database", async () => {
    const { listPlayers } = await import("@/lib/players/queries");
    expect(await listPlayers()).toEqual([]);
  });

  it("lists a player on zero games (criterion 132's own zero-game row)", async () => {
    const players = await createPlayers(["Player Zero"]);
    const { listPlayers } = await import("@/lib/players/queries");
    const list = await listPlayers();
    const row = list.find((p) => p.id === players["Player Zero"]);
    expect(row).toBeDefined();
    expect(row!.gamesPlayed).toBe(0);
  });

  it("⚠️ sorts case-insensitively — a lowercase name still lands alphabetically, not after every uppercase one", async () => {
    await createPlayers(["Zoe", "abby"]);
    const { listPlayers } = await import("@/lib/players/queries");
    const names = (await listPlayers()).map((p) => p.displayName);
    expect(names.indexOf("abby")).toBeLessThan(names.indexOf("Zoe"));
  });

  it("counts games played after a save", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01);
    await saveGame(draftId, state);

    const { listPlayers } = await import("@/lib/players/queries");
    const list = await listPlayers();
    // SHEET_01 has four fresh players, each in exactly one game so far.
    const sheetPlayers = list.filter((p) => SHEET_01.columns.some((c) => c.player === p.displayName));
    expect(sheetPlayers).toHaveLength(4);
    for (const p of sheetPlayers) expect(p.gamesPlayed).toBe(1);
  });
});

describe("getPlayerPage", () => {
  it("returns null for an unknown player (criterion: a 404, not an empty state)", async () => {
    const { getPlayerPage } = await import("@/lib/players/queries");
    expect(await getPlayerPage("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("⚠️ criterion 136: a player created then edited out of their only game renders a zero-game page", async () => {
    const players = await createPlayers(["Player Nowhere"]);
    const { getPlayerPage } = await import("@/lib/players/queries");
    const page = await getPlayerPage(players["Player Nowhere"]!);
    expect(page).not.toBeNull();
    expect(page!.gamesPlayed).toBe(0);
    expect(page!.wins).toBe(0);
    expect(page!.winRate).toBeNull();
    expect(page!.games).toEqual([]);
  });

  it("criterion 135: one game shows 1 game and a 0% or 100% rate, no withholding", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01, { newLocationName: "The venue" });
    await saveGame(draftId, state);

    const { listPlayers } = await import("@/lib/players/queries");
    const { getPlayerPage } = await import("@/lib/players/queries");

    const winnerRow = (await listPlayers()).find((p) => p.displayName === "Player C")!;
    const winnerPage = await getPlayerPage(winnerRow.id);
    expect(winnerPage!.gamesPlayed).toBe(1);
    expect(winnerPage!.wins).toBe(1);
    expect(winnerPage!.winRate).toBe(1);
    expect(winnerPage!.games).toHaveLength(1);
    expect(winnerPage!.games[0]!.isWinner).toBe(true);
    expect(winnerPage!.games[0]!.locationName).toBe("The venue");
    expect(winnerPage!.games[0]!.finalScore).toBe(78);

    const loserRow = (await listPlayers()).find((p) => p.displayName === "Player D")!;
    const loserPage = await getPlayerPage(loserRow.id);
    expect(loserPage!.gamesPlayed).toBe(1);
    expect(loserPage!.wins).toBe(0);
    expect(loserPage!.winRate).toBe(0);
    expect(loserPage!.games[0]!.isWinner).toBe(false);
  });

  it("⚠️ criterion 134: a shared win counts in full for each tied player, newest game first", async () => {
    await teardownTestDb();
    await setupTestDb();

    // Distinct from every fixture-sheet label ("Player A".."Player E"), so
    // this test's own tied game can't accidentally get merged by name with
    // the unrelated SHEET_02 game saved below.
    const players = await createPlayers(["Test Winner One", "Test Winner Two"]);
    const { saveGame } = await import("@/lib/games/save");

    // A two-player game tied on the lowest total: both are winners. Each
    // column is its own non-decreasing run of eleven values ending at 50.
    const tiedTotals = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 50];
    const tiedSheet = {
      file: "synthetic-tied.json",
      columns: [
        { player: "Test Winner One", runningTotals: tiedTotals, handScores: [] },
        { player: "Test Winner Two", runningTotals: tiedTotals, handScores: [] },
      ],
      winners: ["Test Winner One", "Test Winner Two"],
      winningScore: 50,
    };
    const tied = await setUpDraft(tiedSheet, { playedOn: "2021-01-01", playerIds: players });
    const savedTied = await saveGame(tied.draftId, tied.state);
    expect(savedTied.gameId).toBeTruthy();

    const later = await setUpDraft(SHEET_02, { playedOn: "2022-01-01" });
    await saveGame(later.draftId, later.state);

    const { getPlayerPage } = await import("@/lib/players/queries");
    const pageA = await getPlayerPage(players["Test Winner One"]!);
    const pageB = await getPlayerPage(players["Test Winner Two"]!);
    expect(pageA!.wins).toBe(1);
    expect(pageB!.wins).toBe(1);
    expect(pageA!.gamesPlayed).toBe(1);
    expect(pageA!.games[0]!.playedOn).toBe("2021-01-01");
  });
});
