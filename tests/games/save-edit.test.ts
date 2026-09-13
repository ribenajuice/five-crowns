/**
 * `saveEditedGame`, reached through `saveGame`'s dispatch (an edit draft is
 * still saved via `POST /api/games` — see `lib/games/save.ts`). Covers PRD
 * criteria 117–123: same game id, roster re-match, every round row replaced,
 * the deleted-game race, and the close-up re-parenting limitation the ADR
 * documents.
 *
 * Each test gets a fresh in-memory database, like `tests/games/save.test.ts`.
 */

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "save-edit-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

/** Saves sheet 1 as an ordinary new game and returns its id. */
async function saveOriginalGame(): Promise<string> {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(SHEET_01);
  const result = await saveGame(draftId, state);
  return result.gameId;
}

/** Starts (or resumes) an edit and returns its draft id and stored state. */
async function startEdit(gameId: string) {
  const { startEditDraft } = await import("@/lib/games/start-edit");
  const { getDb } = await import("@/lib/db");
  const { draft: draftTable } = await import("@/lib/db/schema");

  const { draftId } = await startEditDraft(gameId);
  const row = (
    await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
  )[0]!;
  return { draftId, state: JSON.parse(row.stateJson) };
}

describe("criterion 117 — saving an edit updates the same game, no new game created", () => {
  it("a changed date and a new location land on the same game id", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);

    state.playedOn = "2024-01-01";
    state.newLocationName = "The new place";

    const { saveGame } = await import("@/lib/games/save");
    const result = await saveGame(draftId, state);
    expect(result.gameId).toBe(gameId);
    expect(result.wasEdit).toBe(true);
    expect(result.alreadySaved).toBe(false);

    const { getDb } = await import("@/lib/db");
    const { game, location } = await import("@/lib/db/schema");
    const games = await getDb().select().from(game);
    expect(games).toHaveLength(1);
    expect(games[0]!.id).toBe(gameId);
    expect(games[0]!.playedOn).toBe("2024-01-01");

    const loc = (
      await getDb().select().from(location).where(eq(location.id, games[0]!.locationId!))
    )[0]!;
    expect(loc.name).toBe("The new place");
  });
});

describe("criterion 118 — the roster re-matches when the player set changes", () => {
  it("swapping Player D for a new player creates a new roster and leaves the old one alone", async () => {
    const gameId = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { player, roster, game } = await import("@/lib/db/schema");
    const { rosterSignature } = await import("@/lib/scoring");

    const originalGame = (await getDb().select().from(game).where(eq(game.id, gameId)))[0]!;
    const originalRosterId = originalGame.rosterId;

    const playersByName: Record<string, string> = {};
    for (const row of await getDb().select().from(player)) {
      playersByName[row.displayName] = row.id;
    }
    const originalSignature = rosterSignature([
      playersByName["Player A"]!,
      playersByName["Player B"]!,
      playersByName["Player C"]!,
      playersByName["Player D"]!,
    ]);

    const { draftId, state } = await startEdit(gameId);
    const columnD = state.columns.find((c: { sheetName: string }) => c.sheetName === "Player D");
    columnD.playerId = null;
    columnD.newPlayerName = "Player E";

    const { saveGame } = await import("@/lib/games/save");
    const result = await saveGame(draftId, state);
    expect(result.gameId).toBe(gameId);

    const updatedGame = (await getDb().select().from(game).where(eq(game.id, gameId)))[0]!;
    expect(updatedGame.rosterId).not.toBe(originalRosterId);

    // ⚠️ The old roster is left completely alone — not deleted, even with
    // zero games now pointing at it.
    const oldRoster = (
      await getDb().select().from(roster).where(eq(roster.signature, originalSignature))
    )[0];
    expect(oldRoster).toBeDefined();
    expect(oldRoster!.id).toBe(originalRosterId);

    const rosters = await getDb().select().from(roster);
    expect(rosters).toHaveLength(2);
  });
});

describe("criterion 119 — every round row is replaced, with no orphans left behind", () => {
  it("a shrunk-then-regrown player set leaves exactly the resolved columns' rows, nothing more", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);

    const { getDb } = await import("@/lib/db");
    const { player, gamePlayer, roundScore } = await import("@/lib/db/schema");
    const playerRowsBefore = await getDb().select().from(player);
    const playerDId = playerRowsBefore.find((p) => p.displayName === "Player D")!.id;

    const columnD = state.columns.find((c: { sheetName: string }) => c.sheetName === "Player D");
    columnD.playerId = null;
    columnD.newPlayerName = "Player E";

    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const gamePlayers = await getDb()
      .select()
      .from(gamePlayer)
      .where(eq(gamePlayer.gameId, gameId));
    expect(gamePlayers).toHaveLength(4);
    expect(gamePlayers.some((gp) => gp.playerId === playerDId)).toBe(false);

    const rounds = await getDb().select().from(roundScore).where(eq(roundScore.gameId, gameId));
    expect(rounds).toHaveLength(44); // 4 players * 11 hands
    expect(rounds.some((r) => r.playerId === playerDId)).toBe(false);

    // Player D still exists as a person — only removed from this game.
    const playerRowsAfter = await getDb().select().from(player);
    expect(playerRowsAfter.some((p) => p.id === playerDId)).toBe(true);
  });

  it("an unchanged player set still fully replaces the rows (no accidental duplication)", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);

    // No structural change at all — just re-save the same columns.
    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const { getDb } = await import("@/lib/db");
    const { gamePlayer, roundScore } = await import("@/lib/db/schema");
    const gamePlayers = await getDb()
      .select()
      .from(gamePlayer)
      .where(eq(gamePlayer.gameId, gameId));
    expect(gamePlayers).toHaveLength(4);

    const rounds = await getDb().select().from(roundScore).where(eq(roundScore.gameId, gameId));
    expect(rounds).toHaveLength(44);
  });
});

describe("criterion 122 — a meanwhile-deleted game refuses cleanly, never resurrected", () => {
  it("saving an edit over a deleted game throws GameDeletedError and inserts nothing", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);

    const { deleteGame } = await import("@/lib/games/delete");
    const deleted = await deleteGame(gameId);
    expect(deleted).toBe(true);

    const { saveGame } = await import("@/lib/games/save");
    const { GameDeletedError } = await import("@/lib/games/save-edit");
    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(GameDeletedError);

    const { getDb } = await import("@/lib/db");
    const { game, draft: draftTable } = await import("@/lib/db/schema");
    expect(await getDb().select().from(game).where(eq(game.id, gameId))).toHaveLength(0);

    const draftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
    )[0]!;
    expect(draftRow.savedGameId).toBeNull();
  });
});

describe("idempotency — an edit draft saved twice never double-writes", () => {
  it("the second save returns the same gameId, unchanged, with wasEdit true", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);
    state.playedOn = "2022-02-02";

    const { saveGame } = await import("@/lib/games/save");
    const first = await saveGame(draftId, state);
    expect(first.alreadySaved).toBe(false);
    expect(first.wasEdit).toBe(true);

    const second = await saveGame(draftId, state);
    expect(second.alreadySaved).toBe(true);
    expect(second.wasEdit).toBe(true);
    expect(second.gameId).toBe(gameId);

    const { getDb } = await import("@/lib/db");
    const { gamePlayer } = await import("@/lib/db/schema");
    const gamePlayers = await getDb()
      .select()
      .from(gamePlayer)
      .where(eq(gamePlayer.gameId, gameId));
    expect(gamePlayers).toHaveLength(4); // not doubled
  });
});

describe("criterion 120 — the sheet photo can never be replaced, even bypassing the route", () => {
  it("refuses a save whose state names a different photoId than the game's own sheet photo", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);
    state.photoId = "a-completely-different-photo-id";

    const { saveGame } = await import("@/lib/games/save");
    const { MissingPhotoError } = await import("@/lib/games/save");
    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(MissingPhotoError);
  });

  // ⚠️ Regression test: `saveEditedGame` used to persist `state` to
  // `draft.state_json` *before* checking `photoId`, so a single refused save
  // like the one above still corrupted the draft's stored photoId — every
  // later save (even with the correct `photoId` restored) hit the same
  // `MissingPhotoError` forever, because step 0 ran unconditionally and step
  // 1's check compared the (now corrupted) submission to itself. This checks
  // the draft actually stays recoverable: the bad attempt changes nothing on
  // disk, and a follow-up save with the real photoId still succeeds.
  it("a refused save with the wrong photoId leaves the draft's stored state untouched and still recoverable", async () => {
    const gameId = await saveOriginalGame();
    const { draftId, state } = await startEdit(gameId);
    const realPhotoId = state.photoId;

    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const beforeRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
    )[0]!;

    const badState = { ...state, photoId: "a-completely-different-photo-id", playedOn: "1999-09-09" };

    const { saveGame } = await import("@/lib/games/save");
    const { MissingPhotoError } = await import("@/lib/games/save");
    await expect(saveGame(draftId, badState)).rejects.toBeInstanceOf(MissingPhotoError);

    const afterRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
    )[0]!;
    expect(afterRow.stateJson).toBe(beforeRow.stateJson);
    expect(JSON.parse(afterRow.stateJson).photoId).toBe(realPhotoId);
    expect(afterRow.savedGameId).toBeNull();

    // The draft is still perfectly usable: a legitimate save with the real
    // photoId (and an unrelated correction) still goes through.
    state.playedOn = "2021-05-05";
    const result = await saveGame(draftId, state);
    expect(result.gameId).toBe(gameId);
    expect(result.alreadySaved).toBe(false);

    const { game } = await import("@/lib/db/schema");
    const savedGame = (await getDb().select().from(game).where(eq(game.id, gameId)))[0]!;
    expect(savedGame.playedOn).toBe("2021-05-05");
  });
});

describe("⚠️ the ADR's documented limitation — a close-up whose player left the game", () => {
  it("has its player_id nulled, but stays attached to the game as evidence", async () => {
    const gameId = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { player, photo } = await import("@/lib/db/schema");
    const playerDId = (await getDb().select().from(player)).find(
      (p) => p.displayName === "Player D",
    )!.id;

    // A close-up shot for Player D during the original import.
    await getDb()
      .insert(photo)
      .values({
        id: "closeup-from-import",
        kind: "column",
        gameId,
        playerId: playerDId,
        s3KeyOriginal: "photos/closeup-from-import/original.jpg",
        s3KeyModel: "photos/closeup-from-import/model.jpg",
      });

    const { draftId, state } = await startEdit(gameId);
    const columnD = state.columns.find((c: { sheetName: string }) => c.sheetName === "Player D");
    columnD.playerId = null;
    columnD.newPlayerName = "Player E";

    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const closeUp = (
      await getDb().select().from(photo).where(eq(photo.id, "closeup-from-import"))
    )[0]!;
    expect(closeUp.gameId).toBe(gameId); // still attached, still evidence
    expect(closeUp.playerId).toBeNull(); // but no longer attributed to anyone
  });

  it("a close-up for a player who stays in the game keeps its attribution", async () => {
    const gameId = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { player, photo } = await import("@/lib/db/schema");
    const playerAId = (await getDb().select().from(player)).find(
      (p) => p.displayName === "Player A",
    )!.id;

    await getDb()
      .insert(photo)
      .values({
        id: "closeup-player-a",
        kind: "column",
        gameId,
        playerId: playerAId,
        s3KeyOriginal: "photos/closeup-player-a/original.jpg",
        s3KeyModel: "photos/closeup-player-a/model.jpg",
      });

    const { draftId, state } = await startEdit(gameId);
    state.playedOn = "2023-03-03"; // an unrelated edit

    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const closeUp = (
      await getDb().select().from(photo).where(eq(photo.id, "closeup-player-a"))
    )[0]!;
    expect(closeUp.playerId).toBe(playerAId);
  });
});
