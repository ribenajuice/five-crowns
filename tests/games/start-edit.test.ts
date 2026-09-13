/**
 * `startEditDraft` — `POST /api/games/{id}/edit`'s executable half. Covers
 * PRD criteria 115 and 121: an edit draft is seeded from the game's own rows,
 * carries the game's existing sheet photo, and a second "Edit this game"
 * before the first is saved resumes the same draft rather than forking one.
 */

import { unlink } from "node:fs/promises";
import path from "node:path";

import { and, eq, isNull } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01 } from "../fixtures/sheets";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "start-edit-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

async function saveOriginalGame(): Promise<{ gameId: string; photoId: string }> {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(SHEET_01);
  const result = await saveGame(draftId, state);
  return { gameId: result.gameId, photoId: state.photoId };
}

describe("building a fresh edit draft", () => {
  it("seeds columns from the game's own rows, in column order, with the eleven running totals as manual edits", async () => {
    const { gameId, photoId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");

    const result = await startEditDraft(gameId);
    expect(result.created).toBe(true);

    const row = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, result.draftId))
    )[0]!;
    expect(row.editingGameId).toBe(gameId);
    expect(row.savedGameId).toBeNull();

    const state = JSON.parse(row.stateJson);
    expect(state.photoId).toBe(photoId);
    expect(state.columns).toHaveLength(4);
    expect(state.columns.map((c: { sheetName: string }) => c.sheetName)).toEqual([
      "Player A",
      "Player B",
      "Player C",
      "Player D",
    ]);
    // Every column carries a real player id, no pending names.
    for (const column of state.columns) {
      expect(typeof column.playerId).toBe("string");
      expect(column.newPlayerName).toBeNull();
      expect(Object.keys(column.manualEdits)).toHaveLength(11);
    }
    // Player A's known running totals from the fixture.
    expect(SHEET_01.columns[0]!.runningTotals[0]).toBe(state.columns[0].manualEdits["0"]);
  });

  it("⚠️ photo.draft_id is not re-pointed — the sheet photo stays linked to its original import draft", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");

    const before = (
      await getDb()
        .select()
        .from(photo)
        .where(and(eq(photo.gameId, gameId), eq(photo.kind, "sheet")))
    )[0]!;

    await startEditDraft(gameId);

    const after = (
      await getDb()
        .select()
        .from(photo)
        .where(and(eq(photo.gameId, gameId), eq(photo.kind, "sheet")))
    )[0]!;
    expect(after.draftId).toBe(before.draftId);
  });

  it("404s (GameNotFoundError) for a game that doesn't exist", async () => {
    const { startEditDraft, GameNotFoundError } = await import("@/lib/games/start-edit");
    await expect(startEditDraft("no-such-game")).rejects.toBeInstanceOf(GameNotFoundError);
  });

  it("refuses (MissingPhotoError) a game with no sheet photo row", async () => {
    const { gameId } = await saveOriginalGame();
    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");
    await getDb().delete(photo).where(and(eq(photo.gameId, gameId), eq(photo.kind, "sheet")));

    const { startEditDraft, MissingPhotoError } = await import("@/lib/games/start-edit");
    await import("@/lib/games/resolve"); // ensure MissingPhotoError is the same class re-exported
    await expect(startEditDraft(gameId)).rejects.toBeInstanceOf(MissingPhotoError);
  });

  it("⚠️ regression: refuses (MissingPhotoError) a fresh edit draft when the sheet photo row survives but its S3 objects are gone", async () => {
    const { gameId, photoId } = await saveOriginalGame();
    // Simulate the object having vanished from storage (manual cleanup, a
    // lifecycle rule) while the `photo` row itself is untouched.
    await unlink(path.join(process.cwd(), ".data", "photos", photoId, "model.jpg"));

    const { startEditDraft, MissingPhotoError } = await import("@/lib/games/start-edit");
    await expect(startEditDraft(gameId)).rejects.toBeInstanceOf(MissingPhotoError);
  });
});

describe("⚠️ criterion 121 — resuming an open edit draft", () => {
  it("a second call for the same game returns the first draft's id, created:false", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");

    const first = await startEditDraft(gameId);
    expect(first.created).toBe(true);

    const second = await startEditDraft(gameId);
    expect(second.created).toBe(false);
    expect(second.draftId).toBe(first.draftId);

    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const openDrafts = await getDb()
      .select()
      .from(draftTable)
      .where(and(eq(draftTable.editingGameId, gameId), isNull(draftTable.savedGameId)));
    expect(openDrafts).toHaveLength(1); // no fork
  });

  it("once the first edit is saved, opening a new edit creates a second, independent draft", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");

    const first = await startEditDraft(gameId);
    const firstRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, first.draftId))
    )[0]!;
    await saveGame(first.draftId, JSON.parse(firstRow.stateJson));

    const second = await startEditDraft(gameId);
    expect(second.created).toBe(true);
    expect(second.draftId).not.toBe(first.draftId);

    // Two finished drafts now name this game: the original import draft and
    // the edit just saved. Both are legitimate history; only the *second*
    // (still-open) edit draft below is new and unsaved.
    const finishedDrafts = await getDb()
      .select()
      .from(draftTable)
      .where(eq(draftTable.savedGameId, gameId));
    expect(finishedDrafts).toHaveLength(2);
  });

  it("⚠️ two concurrent starts for the same game resolve to exactly one open draft", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft } = await import("@/lib/games/start-edit");

    const [a, b] = await Promise.all([startEditDraft(gameId), startEditDraft(gameId)]);
    expect(a.draftId).toBe(b.draftId);

    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const drafts = await getDb()
      .select()
      .from(draftTable)
      .where(eq(draftTable.editingGameId, gameId));
    expect(drafts).toHaveLength(1);
  });

  it("⚠️ regression: a stale open edit draft for a game deleted meanwhile is never silently resumed", async () => {
    const { gameId } = await saveOriginalGame();
    const { startEditDraft, GameNotFoundError } = await import("@/lib/games/start-edit");

    // Opens (and leaves open) the edit draft `deleteGame` is documented to
    // leave untouched.
    const first = await startEditDraft(gameId);
    expect(first.created).toBe(true);

    const { deleteGame } = await import("@/lib/games/delete");
    expect(await deleteGame(gameId)).toBe(true);

    // A stale tab or a retried POST for this now-deleted game must 404, not
    // silently hand back the orphaned open draft.
    await expect(startEditDraft(gameId)).rejects.toBeInstanceOf(GameNotFoundError);

    // The orphaned draft itself is untouched (as `deleteGame` documents) —
    // this is about refusing to *resume* it, not deleting it out from under
    // anyone.
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const orphan = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, first.draftId))
    )[0];
    expect(orphan).toBeDefined();
  });
});
