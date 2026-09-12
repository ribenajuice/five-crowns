/**
 * `listGames` and `getGame` — criteria 69 and 70, plus the presigned sheet
 * photo (criterion 12's shape, reused here).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createColumnPhoto, setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

// See tests/games/save.test.ts for why `.data/photos` is never cleaned up here.
beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "queries-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("listGames — criterion 69", () => {
  it("is newest first by playedOn, and shows date, venue, roster and winner(s)", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { listGames } = await import("@/lib/games/queries");

    const older = await setUpDraft(SHEET_01, {
      playedOn: "2020-01-01",
      newLocationName: "Player C's place",
    });
    await saveGame(older.draftId, older.state);

    const newer = await setUpDraft(SHEET_02, { playedOn: "2024-06-15" });
    await saveGame(newer.draftId, newer.state);

    const games = await listGames();
    expect(games).toHaveLength(2);
    expect(games[0]!.playedOn).toBe("2024-06-15");
    expect(games[1]!.playedOn).toBe("2020-01-01");

    expect(games[1]!.locationName).toBe("Player C's place");
    expect(games[1]!.winners).toEqual(["Player C"]);
    expect(games[1]!.winningScore).toBe(78);

    expect(games[0]!.locationName).toBeNull();
    expect(games[0]!.winners).toEqual(["Player B"]);
    expect(games[0]!.winningScore).toBe(71);
  });

  it("says nothing when there are no games", async () => {
    await teardownTestDb();
    await setupTestDb();
    const { listGames } = await import("@/lib/games/queries");
    expect(await listGames()).toEqual([]);
  });
});

describe("getGame — criterion 70", () => {
  it("returns columns in the paper's order, the final row, winner(s) and a presigned photo", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const { gameId } = await saveGame(draftId, state);

    const detail = await getGame(gameId);
    expect(detail).not.toBeNull();
    expect(detail!.columns.map((c) => c.displayName)).toEqual([
      "Player A",
      "Player B",
      "Player C",
      "Player D",
    ]);
    expect(detail!.columns.map((c) => c.columnOrder)).toEqual([0, 1, 2, 3]);
    expect(detail!.columns[2]!.runningTotals).toEqual(SHEET_01.columns[2]!.runningTotals);
    expect(detail!.columns[2]!.handScores).toEqual(SHEET_01.columns[2]!.handScores);
    expect(detail!.columns[2]!.isWinner).toBe(true);
    expect(detail!.winners).toEqual(["Player C"]);
    expect(detail!.winningScore).toBe(78);

    expect(detail!.sheetPhoto).not.toBeNull();
    expect(detail!.sheetPhoto!.url).toContain("original.jpg");
    expect(new Date(detail!.sheetPhoto!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null for an unknown id", async () => {
    const { getGame } = await import("@/lib/games/queries");
    expect(await getGame("no-such-game")).toBeNull();
  });

  it("⚠️ criterion 71: a close-up attaches to the game and the player its column belongs to", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const playerDColumn = state.columns.find((c) => c.sheetName === "Player D")!;
    await createColumnPhoto("closeup-query-1", draftId, playerDColumn.id);

    const { gameId } = await saveGame(draftId, state);
    const detail = await getGame(gameId);

    expect(detail!.closeUps).toHaveLength(1);
    const playerD = detail!.columns.find((c) => c.sheetName === "Player D")!;
    expect(detail!.closeUps[0]!.playerId).toBe(playerD.playerId);
    expect(detail!.closeUps[0]!.url).toContain("original.jpg");
  });

  it("a game with no close-ups returns an empty array, not null or an error", async () => {
    await teardownTestDb();
    await setupTestDb();

    const { saveGame } = await import("@/lib/games/save");
    const { getGame } = await import("@/lib/games/queries");

    const { draftId, state } = await setUpDraft(SHEET_02);
    const { gameId } = await saveGame(draftId, state);

    const detail = await getGame(gameId);
    expect(detail!.closeUps).toEqual([]);
  });
});
