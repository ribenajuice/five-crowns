/**
 * Save-latency fix (`docs/PRD.md` "Bug 1 — Save looks frozen", criterion
 * 320): the number of database round trips a save makes must not grow with
 * the number of players on the sheet.
 *
 * Same proxy-based instrumentation pattern as `tests/board/queries.test.ts`
 * and `tests/games/queries.test.ts` (wrap `getDb()`, count every
 * `.select`/`.insert`/`.update`/`.delete` call — the one entry point every
 * drizzle statement starts with, so one counted call is one round trip),
 * extended to also wrap the `tx` handle `db.transaction()` hands its
 * callback, since almost every statement `saveGame`/`saveEditedGame` make
 * runs inside that transaction.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { createDraft, createSheetPhoto, draftStateFromSheet } from "../helpers/draft";
import type { FixtureSheet } from "../fixtures/sheets";

let dbCallCount = 0;

const COUNTED_VERBS = new Set(["select", "insert", "update", "delete"]);

function wrapWithCounter<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop, _receiver) {
      if (typeof prop === "string" && COUNTED_VERBS.has(prop)) dbCallCount++;
      const value = Reflect.get(t as object, prop);
      return typeof value === "function" ? value.bind(t) : value;
    },
  });
}

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getDb: () => {
      const real = actual.getDb();
      return new Proxy(real, {
        get(target, prop, _receiver) {
          if (typeof prop === "string" && COUNTED_VERBS.has(prop)) dbCallCount++;
          if (prop === "transaction") {
            const original = Reflect.get(target as object, "transaction") as (
              callback: (tx: unknown) => unknown,
            ) => unknown;
            return (callback: (tx: unknown) => unknown) =>
              original.call(target, (tx: unknown) => callback(wrapWithCounter(tx as object)));
          }
          const value = Reflect.get(target as object, prop);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
});

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "save-query-count-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

beforeEach(async () => {
  dbCallCount = 0;
  await teardownTestDb();
  await setupTestDb();
});

/** A synthetic, monotonic sheet with `playerCount` brand-new players. */
function syntheticSheet(playerCount: number, prefix: string): FixtureSheet {
  const columns = Array.from({ length: playerCount }, (_, i) => ({
    player: `${prefix} P${i + 1}`,
    // Strictly increasing across all 11 hands — always monotonic, and well
    // under `MAX_RUNNING_TOTAL` (999) even at 7 players.
    runningTotals: Array.from({ length: 11 }, (_, h) => i * 5 + h * 5 + 5),
    handScores: Array<number>(11).fill(0), // unused by draftStateFromSheet
  }));
  return {
    file: "synthetic.jpg",
    columns,
    winners: [columns[0]!.player],
    winningScore: columns[0]!.runningTotals[10]!,
  };
}

async function saveSyntheticGame(playerCount: number, prefix: string) {
  const { saveGame } = await import("@/lib/games/save");
  const sheet = syntheticSheet(playerCount, prefix);
  const state = draftStateFromSheet(sheet);
  await createSheetPhoto(state.photoId);
  const draftId = await createDraft(state);

  dbCallCount = 0;
  const result = await saveGame(draftId, state);
  expect(result.alreadySaved).toBe(false);
  return { dbCallCount, gameId: result.gameId };
}

describe("saveGame — the number of database calls does not grow with player count (criterion 320)", () => {
  it("issues the same number of calls for a 2-player save as for a 7-player save", async () => {
    const twoPlayer = await saveSyntheticGame(2, "QCount New 2p");
    const sevenPlayer = await saveSyntheticGame(7, "QCount New 7p");

    expect(twoPlayer.dbCallCount).toBeGreaterThan(0);
    expect(sevenPlayer.dbCallCount).toBe(twoPlayer.dbCallCount);
    // Comfortably under the pre-fix shape (roughly 3 calls per column, on top
    // of a handful of fixed setup calls — 30+ for a full table per the PRD).
    expect(sevenPlayer.dbCallCount).toBeLessThan(24);
  });
});

describe("saveEditedGame — the number of database calls does not grow with player count (criterion 320)", () => {
  it("issues the same number of calls editing a 2-player game as a 7-player game", async () => {
    const { startEditDraft } = await import("@/lib/games/start-edit");
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { draft: draftTable } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    async function editSyntheticGame(playerCount: number, prefix: string) {
      const { gameId } = await saveSyntheticGame(playerCount, prefix);

      const { draftId } = await startEditDraft(gameId);
      const row = (
        await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
      )[0]!;
      const state = JSON.parse(row.stateJson);
      state.playedOn = "2024-06-01"; // a genuine, harmless edit

      dbCallCount = 0;
      const result = await saveGame(draftId, state);
      expect(result.alreadySaved).toBe(false);
      expect(result.wasEdit).toBe(true);
      return dbCallCount;
    }

    const twoPlayer = await editSyntheticGame(2, "QCount Edit 2p");
    const sevenPlayer = await editSyntheticGame(7, "QCount Edit 7p");

    expect(twoPlayer).toBeGreaterThan(0);
    expect(sevenPlayer).toBe(twoPlayer);
    expect(sevenPlayer).toBeLessThan(20);
  });
});
