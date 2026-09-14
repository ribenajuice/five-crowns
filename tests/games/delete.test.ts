/**
 * `deleteGame` — `DELETE /api/games/{id}`'s executable half. Covers PRD
 * criteria 124–129: the rows that must go, the rows that must survive, and
 * the draft-row interaction the ADR flagged (an open edit draft must not be
 * swept up with the game's finished ones).
 */

import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createColumnPhoto, setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "delete-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

async function saveOriginalGame() {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(SHEET_01);
  const playerBColumn = state.columns.find((c) => c.sheetName === "Player B")!;
  await createColumnPhoto("closeup-1", draftId, playerBColumn.id);
  const result = await saveGame(draftId, state);
  return { gameId: result.gameId, importDraftId: draftId, sheetPhotoId: state.photoId };
}

describe("criterion 126 — what a delete removes, and what it leaves alone", () => {
  it("removes round_score, game_player and photo rows for the game", async () => {
    const { gameId } = await saveOriginalGame();
    const { deleteGame } = await import("@/lib/games/delete");
    const { getDb } = await import("@/lib/db");
    const { roundScore, gamePlayer, photo, game } = await import("@/lib/db/schema");

    const deleted = await deleteGame(gameId);
    expect(deleted).toBe(true);

    expect(await getDb().select().from(game).where(eq(game.id, gameId))).toHaveLength(0);
    expect(
      await getDb().select().from(roundScore).where(eq(roundScore.gameId, gameId)),
    ).toHaveLength(0);
    expect(
      await getDb().select().from(gamePlayer).where(eq(gamePlayer.gameId, gameId)),
    ).toHaveLength(0);
    expect(await getDb().select().from(photo).where(eq(photo.gameId, gameId))).toHaveLength(0);
  });

  it("removes the transcription rows for the game's photos", async () => {
    const { gameId, sheetPhotoId } = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { transcription } = await import("@/lib/db/schema");
    await getDb()
      .insert(transcription)
      .values({
        id: "transcription-1",
        photoId: sheetPhotoId,
        kind: "sheet",
        model: "test-model",
        status: "ok",
      });

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    expect(
      await getDb().select().from(transcription).where(eq(transcription.photoId, sheetPhotoId)),
    ).toHaveLength(0);
  });

  it("⚠️ never touches players or locations", async () => {
    const { setUpDraft: setUpDraftAgain } = await import("../helpers/draft");
    const { saveGame } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraftAgain(SHEET_01, {
      newLocationName: "Player C's place",
    });
    const result = await saveGame(draftId, state);

    const { getDb } = await import("@/lib/db");
    const { player, location } = await import("@/lib/db/schema");
    const playersBefore = await getDb().select().from(player);
    const locationsBefore = await getDb().select().from(location);

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(result.gameId);

    expect(await getDb().select().from(player)).toHaveLength(playersBefore.length);
    expect(await getDb().select().from(location)).toHaveLength(locationsBefore.length);
  });

  it("a roster left with no games survives the delete", async () => {
    const { gameId } = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { roster, game } = await import("@/lib/db/schema");
    const rosterId = (await getDb().select().from(game).where(eq(game.id, gameId)))[0]!.rosterId;

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const rosterRow = (await getDb().select().from(roster).where(eq(roster.id, rosterId)))[0];
    expect(rosterRow).toBeDefined();
  });

  it("returns false for a game id that never existed, and touches nothing", async () => {
    const { deleteGame } = await import("@/lib/games/delete");
    const deleted = await deleteGame("no-such-game");
    expect(deleted).toBe(false);
  });
});

describe("⚠️ the draft-row interaction the ADR flagged", () => {
  it("deletes finished drafts (savedGameId = this game), new-game and edit alike", async () => {
    const { gameId, importDraftId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");

    const edit = await startEditDraft(gameId);
    const editRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, edit.draftId))
    )[0]!;
    await saveGame(edit.draftId, JSON.parse(editRow.stateJson));

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    expect(
      await getDb().select().from(draftTable).where(eq(draftTable.id, importDraftId)),
    ).toHaveLength(0);
    expect(
      await getDb().select().from(draftTable).where(eq(draftTable.id, edit.draftId)),
    ).toHaveLength(0);
  });

  it("⚠️ leaves an OPEN edit draft alone — a save arriving after gets the clean 409, not 'draft not found'", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");

    const edit = await startEditDraft(gameId); // never saved — still "open"

    const { deleteGame } = await import("@/lib/games/delete");
    await deleteGame(gameId);

    const openDraftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, edit.draftId))
    )[0];
    expect(openDraftRow).toBeDefined(); // untouched by the delete
    expect(openDraftRow!.savedGameId).toBeNull();

    const editState = JSON.parse(openDraftRow!.stateJson);
    const { saveGame } = await import("@/lib/games/save");
    const { GameDeletedError } = await import("@/lib/games/save-edit");
    await expect(saveGame(edit.draftId, editState)).rejects.toBeInstanceOf(GameDeletedError);
  });
});
