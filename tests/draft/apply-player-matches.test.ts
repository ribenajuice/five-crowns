/**
 * `applySuggestedPlayerMatches` — the DB-touching wiring between
 * `lib/players/match.ts`'s pure matcher and a real draft. Covers PRD
 * criteria 172–173: a confident match pre-selects `playerId`; a near match
 * surfaces `nameCandidates` without assigning; an already-assigned column
 * (an edit, or hand-picked) is passed through untouched.
 */

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createPlayers } from "../helpers/draft";

import { emptyDraftState } from "@/lib/draft/state";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "apply-matches-test-secret";
});

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

function stateWithColumns(
  columns: Array<{
    id: string;
    sheetName: string | null;
    playerId?: string | null;
    newPlayerName?: string | null;
  }>,
) {
  const state = emptyDraftState({
    photoId: "ph_1",
    playedOn: "2026-09-11",
    columnIds: columns.map((c) => c.id),
  });
  state.columns.forEach((column, i) => {
    column.sheetName = columns[i]!.sheetName;
    column.playerId = columns[i]!.playerId ?? null;
    column.newPlayerName = columns[i]!.newPlayerName ?? null;
  });
  return state;
}

describe("applySuggestedPlayerMatches", () => {
  it("pre-selects a confident, unambiguous match (criterion 172)", async () => {
    const ids = await createPlayers(["Cody"]);
    const state = stateWithColumns([{ id: "c1", sheetName: "Cody" }]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    expect(result.columns[0]!.playerId).toBe(ids["Cody"]);
    expect(result.columns[0]!.nameCandidates).toBeUndefined();
  });

  it("leaves a near match unassigned with candidates surfaced (criterion 173)", async () => {
    const ids = await createPlayers(["Cate"]);
    const state = stateWithColumns([{ id: "c1", sheetName: "Kate" }]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    expect(result.columns[0]!.playerId).toBeNull();
    expect(result.columns[0]!.nameCandidates).toEqual([ids["Cate"]]);
  });

  it("leaves a column with no plausible match unassigned, no candidates (< 0.55)", async () => {
    await createPlayers(["Zzyzx"]);
    const state = stateWithColumns([{ id: "c1", sheetName: "Cody" }]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    expect(result.columns[0]!.playerId).toBeNull();
    expect(result.columns[0]!.nameCandidates ?? []).toEqual([]);
  });

  it("behaves exactly like Milestone 1 on an empty player list (criterion 151)", async () => {
    const state = stateWithColumns([{ id: "c1", sheetName: "Cody" }]);
    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);
    expect(result.columns[0]!.playerId).toBeNull();
    expect(result.columns[0]!.nameCandidates ?? []).toEqual([]);
  });

  it("⚠️ never re-matches or re-suggests a column that already has a playerId (criterion 172)", async () => {
    const ids = await createPlayers(["Cody", "Somebody Else"]);
    // This column's sheetName is a perfect match for "Cody", but it is
    // already assigned to a different player — an edit draft's shape, or a
    // hand-picked column earlier in the same session.
    const state = stateWithColumns([
      { id: "c1", sheetName: "Cody", playerId: ids["Somebody Else"] },
    ]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    expect(result.columns[0]!.playerId).toBe(ids["Somebody Else"]);
  });

  it("⚠️ a player already assigned to one column is never suggested to another (criterion 150)", async () => {
    const ids = await createPlayers(["Cody"]);
    const state = stateWithColumns([
      { id: "assigned", sheetName: null, playerId: ids["Cody"] },
      { id: "unassigned", sheetName: "Cody" },
    ]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    const unassigned = result.columns.find((c) => c.id === "unassigned")!;
    expect(unassigned.playerId).toBeNull();
    expect(unassigned.nameCandidates ?? []).toEqual([]);
  });

  it("⚠️ a pending newPlayerName that resolves (by nameKey) to an existing player is never suggested to another column (criterion 150)", async () => {
    // Column A is a "someone new" pending name that will fold onto the
    // existing player "Steve" via nameKey resolution at save time
    // (lib/games/resolve.ts's resolvePlayers) — playerId is still null here.
    // Its own sheetName is left null (e.g. typed by hand, or a re-shoot
    // cleared it) precisely so this test can't pass by the pending column
    // coincidentally self-matching "Steve" and consuming it from the pool
    // that way — the exclusion has to come from `newPlayerName` resolution,
    // which is the thing under test.
    await createPlayers(["Steve"]);
    const state = stateWithColumns([
      { id: "pending", sheetName: null, newPlayerName: "Steve" },
      { id: "unassigned", sheetName: "Steve" },
    ]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    const unassigned = result.columns.find((c) => c.id === "unassigned")!;
    expect(unassigned.playerId).toBeNull();
    expect(unassigned.nameCandidates ?? []).toEqual([]);

    // The pending column itself is untouched — it already has an owner.
    const pending = result.columns.find((c) => c.id === "pending")!;
    expect(pending.playerId).toBeNull();
    expect(pending.newPlayerName).toBe("Steve");
  });

  it("a newPlayerName that doesn't resolve to any existing player excludes nothing (a genuinely new person)", async () => {
    const ids = await createPlayers(["Cody"]);
    const state = stateWithColumns([
      { id: "pending", sheetName: "Brand New Person", newPlayerName: "Brand New Person" },
      { id: "unassigned", sheetName: "Cody" },
    ]);

    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);

    const unassigned = result.columns.find((c) => c.id === "unassigned")!;
    expect(unassigned.playerId).toBe(ids["Cody"]);
  });

  it("the handwritten sheetName is untouched regardless of what gets matched (criterion 153)", async () => {
    await createPlayers(["Cody"]);
    const state = stateWithColumns([{ id: "c1", sheetName: "Cody" }]);
    const { applySuggestedPlayerMatches } = await import("@/lib/draft/apply-player-matches");
    const result = await applySuggestedPlayerMatches(state);
    expect(result.columns[0]!.sheetName).toBe("Cody");
  });
});
