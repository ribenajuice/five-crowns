/**
 * `renameRoster` — PRD criteria 141–144.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "rosters-rename-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

async function saveRoster(sheet = SHEET_01, playedOn = "2020-01-01"): Promise<string> {
  const { saveGame } = await import("@/lib/games/save");
  const { draftId, state } = await setUpDraft(sheet, { playedOn });
  const saved = await saveGame(draftId, state);
  const { getGame } = await import("@/lib/games/queries");
  const detail = await getGame(saved.gameId);
  return detail!.rosterId;
}

describe("renameRoster", () => {
  it("throws RosterNotFoundError for an unknown roster", async () => {
    const { renameRoster, RosterNotFoundError } = await import("@/lib/rosters/rename");
    await expect(renameRoster("00000000-0000-0000-0000-000000000000", "Thursday crew")).rejects.toBeInstanceOf(
      RosterNotFoundError,
    );
  });

  it("sets a custom name, trimmed", async () => {
    const rosterId = await saveRoster();
    const { renameRoster } = await import("@/lib/rosters/rename");
    const result = await renameRoster(rosterId, "  Thursday crew  ");
    expect(result.name).toBe("Thursday crew");
    expect(result.displayName).toBe("Thursday crew");

    const { getRosterPage } = await import("@/lib/rosters/queries");
    expect((await getRosterPage(rosterId))!.name).toBe("Thursday crew");
  });

  it("⚠️ criterion 141: caps at 40 characters", async () => {
    const rosterId = await saveRoster();
    const { renameRoster, MAX_ROSTER_NAME_LENGTH } = await import("@/lib/rosters/rename");
    const long = "x".repeat(60);
    const result = await renameRoster(rosterId, long);
    expect(result.name).toHaveLength(MAX_ROSTER_NAME_LENGTH);
  });

  it("⚠️ criterion 142: clearing the name restores the auto-name, never an empty string", async () => {
    const rosterId = await saveRoster();
    const { renameRoster } = await import("@/lib/rosters/rename");
    await renameRoster(rosterId, "Thursday crew");

    const cleared = await renameRoster(rosterId, "   ");
    expect(cleared.name).toBeNull();
    expect(cleared.displayName).toBe("Player A, Player B, Player C & Player D");

    const { getRosterPage } = await import("@/lib/rosters/queries");
    const page = await getRosterPage(rosterId);
    expect(page!.name).toBeNull();
    expect(page!.displayName.length).toBeGreaterThan(0);
  });

  it("⚠️ criterion 143: a case-insensitive duplicate is reported, never blocked", async () => {
    await teardownTestDb();
    await setupTestDb();

    const firstRosterId = await saveRoster(SHEET_01, "2020-01-01");
    const secondRosterId = await saveRoster(SHEET_02, "2021-01-01");

    const { renameRoster } = await import("@/lib/rosters/rename");
    await renameRoster(firstRosterId, "Thursday Crew");

    // Case-insensitive match against the first roster's now-custom name.
    const result = await renameRoster(secondRosterId, "thursday crew");
    expect(result.duplicate).not.toBeNull();
    expect(result.duplicate!.rosterId).toBe(firstRosterId);
    expect(result.duplicate!.memberNames.sort()).toEqual(["Player A", "Player B", "Player C", "Player D"]);

    // It never blocks: the name is saved regardless.
    const { getRosterPage } = await import("@/lib/rosters/queries");
    expect((await getRosterPage(secondRosterId))!.name).toBe("thursday crew");
  });

  it("dryRun reports the outcome (including any duplicate) without writing", async () => {
    await teardownTestDb();
    await setupTestDb();

    const firstRosterId = await saveRoster(SHEET_01, "2020-01-01");
    const secondRosterId = await saveRoster(SHEET_02, "2021-01-01");

    const { renameRoster } = await import("@/lib/rosters/rename");
    await renameRoster(firstRosterId, "Thursday Crew");

    const preview = await renameRoster(secondRosterId, "thursday crew", { dryRun: true });
    expect(preview.duplicate).not.toBeNull();

    const { getRosterPage } = await import("@/lib/rosters/queries");
    // Nothing was written — the second roster is still on its auto-name.
    expect((await getRosterPage(secondRosterId))!.name).toBeNull();
  });

  it("⚠️ criterion 144: a rename never changes identity — the same exact set still matches", async () => {
    const rosterId = await saveRoster(SHEET_01, "2022-01-01");
    const { renameRoster } = await import("@/lib/rosters/rename");
    await renameRoster(rosterId, "Renamed crew");

    // Re-entering the exact same set of players (a second SHEET_01-shaped
    // game, same players) must resolve to the very same roster row.
    const { getDb } = await import("@/lib/db");
    const { player: playerTable } = await import("@/lib/db/schema");

    const { saveGame } = await import("@/lib/games/save");
    const playerRows = await getDb().select().from(playerTable);
    const playerIds: Record<string, string> = {};
    for (const p of playerRows) playerIds[p.displayName] = p.id;

    const again = await setUpDraft(SHEET_01, { playedOn: "2023-01-01", playerIds });
    const saved = await saveGame(again.draftId, again.state);

    const { getGame } = await import("@/lib/games/queries");
    const detail = await getGame(saved.gameId);
    expect(detail!.rosterId).toBe(rosterId);
    expect(detail!.rosterName).toBe("Renamed crew");
  });
});
