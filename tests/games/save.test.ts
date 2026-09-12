/**
 * `saveGame` end to end, against a temp libSQL file (the native client — see
 * `tests/helpers/db.ts`). Covers PRD criteria 9, 10, 26, 27, 58, 60–68 and the
 * "all or nothing" / idempotency guarantees the build contract calls for.
 *
 * Each test gets a fresh in-memory database (`beforeEach`), so counting
 * exercises like criterion 64 aren't polluted by an earlier test's rows.
 */

import { and, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import {
  createColumnPhoto,
  createDraft,
  createPlayers,
  createSheetPhoto,
  draftStateFromSheet,
  setUpDraft,
} from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

// A controllable queue for `randomUUID`, so the "all or nothing" test can
// predict the game id `saveGame` is about to mint. Falls back to the real
// generator whenever the queue is empty, so every other test in this file
// gets ordinary random ids. `vi.mock`, not `vi.spyOn` — Node's builtin module
// namespace isn't configurable in ESM, so spying on it directly throws
// ("Cannot redefine property"); mocking the module is vitest's documented way
// around that (https://vitest.dev/guide/mocking/modules).
const uuidQueue: string[] = [];
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomUUID: ((...args: Parameters<typeof actual.randomUUID>) =>
      uuidQueue.shift() ?? actual.randomUUID(...args)) as typeof actual.randomUUID,
  };
});

// ⚠️ Deliberately no cleanup of `.data/photos` here: vitest runs test files in
// parallel (`fileParallelism: true` in vitest.config.ts), and another file's
// photo fixtures could be mid-write when this one's afterAll ran. The
// directory is gitignored and the fake JPEGs are a few bytes each — left in
// place on purpose rather than raced over.
beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "save-test-secret";
  process.env.PHOTOS_STORAGE = "local";
  delete process.env.PHOTOS_BUCKET;
});

beforeEach(async () => {
  uuidQueue.length = 0;
  await teardownTestDb();
  await setupTestDb();
});

describe("missing photo — criteria 9, 10", () => {
  it("refuses to save when the draft has no sheet photo row at all", async () => {
    const { saveGame, MissingPhotoError } = await import("@/lib/games/save");
    const state = draftStateFromSheet(SHEET_01);
    const draftId = await createDraft(state); // no photo row inserted

    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(MissingPhotoError);
  });

  it("refuses when the photo row exists but an S3 object is missing", async () => {
    const { saveGame, MissingPhotoError } = await import("@/lib/games/save");
    const state = draftStateFromSheet(SHEET_01);
    await createSheetPhoto(state.photoId, { missingModel: true });
    const draftId = await createDraft(state);

    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(MissingPhotoError);
  });

  it("refuses for an unknown draft id", async () => {
    const { saveGame, DraftNotFoundError } = await import("@/lib/games/save");
    await expect(saveGame("no-such-draft", draftStateFromSheet(SHEET_01))).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
  });
});

describe("invalid grid — criterion 26", () => {
  it("rejects a save whose column decreases, even though the client already validated it", async () => {
    const { saveGame, InvalidGridError } = await import("@/lib/games/save");
    // Sheet 1, Player A's row 6 dropped from 100 to 70 — breaks monotonicity.
    const totals = [...SHEET_01.columns[0]!.runningTotals];
    totals[5] = 70;
    const { draftId, state } = await setUpDraft(SHEET_01, {
      overrides: { 0: totals },
    });

    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(InvalidGridError);
  });
});

describe("criterion 27 — a soft warning never blocks a save", () => {
  it("saves sheet 1 with Player B's genuine 51-point hand (54) unchanged", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { gamePlayer, roundScore } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const result = await saveGame(draftId, state);

    const players = await getDb()
      .select()
      .from(gamePlayer)
      .where(eq(gamePlayer.gameId, result.gameId));
    const playerB = players.find((p) => p.sheetName === "Player B")!;

    const hand4 = (
      await getDb()
        .select()
        .from(roundScore)
        .where(
          and(
            eq(roundScore.gameId, result.gameId),
            eq(roundScore.playerId, playerB.playerId),
            eq(roundScore.hand, 4),
          ),
        )
    )[0]!;
    expect(hand4.runningTotal).toBe(54);
    expect(hand4.score).toBe(51);
  });
});

describe("criterion 71 — close-ups attach to the game and the right player at save", () => {
  it("stamps a column photo's gameId and playerId from the column it was shot for", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { photo, gamePlayer } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const playerBColumn = state.columns.find((c) => c.sheetName === "Player B")!;
    await createColumnPhoto("closeup-1", draftId, playerBColumn.id);

    const result = await saveGame(draftId, state);

    const closeUpRow = (
      await getDb().select().from(photo).where(eq(photo.id, "closeup-1"))
    )[0]!;
    const playerB = (
      await getDb()
        .select()
        .from(gamePlayer)
        .where(and(eq(gamePlayer.gameId, result.gameId), eq(gamePlayer.sheetName, "Player B")))
    )[0]!;

    expect(closeUpRow.gameId).toBe(result.gameId);
    expect(closeUpRow.playerId).toBe(playerB.playerId);
  });

  it("attaches a close-up even when its reading was never made active (still evidence of the paper)", async () => {
    // The photo is attached by draftColumnId alone — this test's point is
    // that saveGame doesn't care whether the column's activeReadingId ever
    // pointed at a reading from this specific photo.
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const playerAColumn = state.columns.find((c) => c.sheetName === "Player A")!;
    await createColumnPhoto("closeup-rejected", draftId, playerAColumn.id);

    const result = await saveGame(draftId, state);

    const closeUpRow = (
      await getDb().select().from(photo).where(eq(photo.id, "closeup-rejected"))
    )[0]!;
    expect(closeUpRow.gameId).toBe(result.gameId);
    expect(closeUpRow.playerId).not.toBeNull();
  });

  it("⚠️ security review: never sweeps another draft's close-up onto this game, even if the saved state names its column id", async () => {
    // draftA genuinely owns this column id and its close-up.
    const draftA = await setUpDraft(SHEET_01);
    const sharedColumnId = draftA.state.columns.find((c) => c.sheetName === "Player B")!.id;
    await createColumnPhoto("closeup-cross-draft", draftA.draftId, sharedColumnId);

    // draftB's *submitted* state is crafted to reuse that same column id —
    // draftStateSchema only enforces uniqueness within one submitted state,
    // not across drafts, so the save transaction's own WHERE clause is what
    // has to hold the line.
    const draftB = await setUpDraft(SHEET_02);
    draftB.state.columns[0]!.id = sharedColumnId;

    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { photo } = await import("@/lib/db/schema");

    const resultB = await saveGame(draftB.draftId, draftB.state);

    const closeUpRow = (
      await getDb().select().from(photo).where(eq(photo.id, "closeup-cross-draft"))
    )[0]!;
    expect(closeUpRow.gameId).not.toBe(resultB.gameId);
    expect(closeUpRow.gameId).toBeNull();
  });
});

describe("criterion 58 — the date is stored as chosen", () => {
  it("stores playedOn exactly as the draft carried it", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { game } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01, { playedOn: "2019-03-14" });
    const result = await saveGame(draftId, state);

    const row = (await getDb().select().from(game).where(eq(game.id, result.gameId)))[0]!;
    expect(row.playedOn).toBe("2019-03-14");
  });
});

describe("venue and player resolve-or-create — criteria 60–63", () => {
  it("creates a new location from a pending name", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { game, location } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01, {
      newLocationName: "Player C's place",
    });
    const result = await saveGame(draftId, state);

    const row = (await getDb().select().from(game).where(eq(game.id, result.gameId)))[0]!;
    const loc = (
      await getDb().select().from(location).where(eq(location.id, row.locationId!))
    )[0]!;
    expect(loc.name).toBe("Player C's place");
  });

  it("⚠️ criterion 62: 'Player C's place' and '  player c's place ' resolve to ONE location", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { game, location } = await import("@/lib/db/schema");

    const first = await setUpDraft(SHEET_01, { newLocationName: "Player C's place" });
    const firstResult = await saveGame(first.draftId, first.state);

    const second = await setUpDraft(SHEET_02, {
      newLocationName: "  player c's place ",
    });
    const secondResult = await saveGame(second.draftId, second.state);

    const firstGame = (
      await getDb().select().from(game).where(eq(game.id, firstResult.gameId))
    )[0]!;
    const secondGame = (
      await getDb().select().from(game).where(eq(game.id, secondResult.gameId))
    )[0]!;
    expect(secondGame.locationId).toBe(firstGame.locationId);

    const rows = await getDb()
      .select()
      .from(location)
      .where(eq(location.nameKey, "player c's place"));
    expect(rows).toHaveLength(1);
  });

  it("a game with no location saves fine, and locationId stays null (criterion 61)", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { game } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const result = await saveGame(draftId, state);

    const row = (await getDb().select().from(game).where(eq(game.id, result.gameId)))[0]!;
    expect(row.locationId).toBeNull();
  });

  it("creates a new player for a pending 'someone new' name", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    await saveGame(draftId, state);

    const rows = await getDb().select().from(player);
    expect(rows.map((r) => r.displayName).sort()).toEqual([
      "Player A",
      "Player B",
      "Player C",
      "Player D",
    ]);
  });

  it("picking existing players from the list reuses their ids, creating nobody new", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player } = await import("@/lib/db/schema");

    const labels = SHEET_01.columns.map((c) => c.player);
    const playerIds = await createPlayers(labels);
    const { draftId, state } = await setUpDraft(SHEET_01, { playerIds });
    await saveGame(draftId, state);

    const rows = await getDb().select().from(player);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.id).sort()).toEqual(Object.values(playerIds).sort());
  });
});

describe("both fixtures together — criterion 64", () => {
  it("exactly 5 players, 2 rosters (sizes 4 and 5), 2 games, 99 round rows, each with both numbers", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player, roster, game, roundScore } = await import("@/lib/db/schema");

    const first = await setUpDraft(SHEET_01);
    await saveGame(first.draftId, first.state);

    // Sheet 2 shares four returning players; only Player E is new.
    const existingByLabel: Record<string, string> = {};
    const savedPlayers = await getDb().select().from(player);
    for (const row of savedPlayers) existingByLabel[row.displayName] = row.id;

    const second = await setUpDraft(SHEET_02, { playerIds: existingByLabel });
    await saveGame(second.draftId, second.state);

    const players = await getDb().select().from(player);
    expect(players).toHaveLength(5);

    const rosters = await getDb().select().from(roster);
    expect(rosters).toHaveLength(2);
    expect(rosters.map((r) => r.size).sort()).toEqual([4, 5]);

    const games = await getDb().select().from(game);
    expect(games).toHaveLength(2);

    const rounds = await getDb().select().from(roundScore);
    expect(rounds).toHaveLength(99); // 4*11 + 5*11
    for (const round of rounds) {
      expect(typeof round.runningTotal).toBe("number");
      expect(typeof round.score).toBe("number");
    }
  });
});

describe("winners — criterion 65", () => {
  it("sheet 1: Player C (78) sole winner; sheet 2: Player B (71) sole winner", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { gamePlayer, player } = await import("@/lib/db/schema");

    const first = await setUpDraft(SHEET_01);
    const firstResult = await saveGame(first.draftId, first.state);
    const firstPlayers = await getDb()
      .select({ displayName: player.displayName, finalScore: gamePlayer.finalScore })
      .from(gamePlayer)
      .innerJoin(player, eq(gamePlayer.playerId, player.id))
      .where(eq(gamePlayer.gameId, firstResult.gameId));
    const lowest1 = Math.min(...firstPlayers.map((p) => p.finalScore));
    expect(lowest1).toBe(78);
    expect(firstPlayers.filter((p) => p.finalScore === lowest1).map((p) => p.displayName)).toEqual([
      "Player C",
    ]);

    const second = await setUpDraft(SHEET_02);
    const secondResult = await saveGame(second.draftId, second.state);
    const secondPlayers = await getDb()
      .select({ displayName: player.displayName, finalScore: gamePlayer.finalScore })
      .from(gamePlayer)
      .innerJoin(player, eq(gamePlayer.playerId, player.id))
      .where(eq(gamePlayer.gameId, secondResult.gameId));
    const lowest2 = Math.min(...secondPlayers.map((p) => p.finalScore));
    expect(lowest2).toBe(71);
    expect(secondPlayers.filter((p) => p.finalScore === lowest2).map((p) => p.displayName)).toEqual([
      "Player B",
    ]);
  });
});

describe("⚠️ criterion 66 — the tie", () => {
  it("Player D's row 11 set to 78 (row 10 is 67, still climbs) shares the win with Player C", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { gamePlayer, player } = await import("@/lib/db/schema");

    const totals = [...SHEET_01.columns[3]!.runningTotals]; // Player D
    totals[10] = 78;
    const { draftId, state } = await setUpDraft(SHEET_01, { overrides: { 3: totals } });
    const result = await saveGame(draftId, state);

    const players = await getDb()
      .select({ displayName: player.displayName, finalScore: gamePlayer.finalScore })
      .from(gamePlayer)
      .innerJoin(player, eq(gamePlayer.playerId, player.id))
      .where(eq(gamePlayer.gameId, result.gameId));

    const lowest = Math.min(...players.map((p) => p.finalScore));
    expect(lowest).toBe(78);
    const winners = players.filter((p) => p.finalScore === lowest).map((p) => p.displayName).sort();
    expect(winners).toEqual(["Player C", "Player D"]);
  });
});

describe("⚠️ criterion 67 — a reordered roster is the same roster", () => {
  it("re-entering sheet 1's four players in a different column order matches the existing roster", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player, roster } = await import("@/lib/db/schema");

    const first = await setUpDraft(SHEET_01);
    const firstResult = await saveGame(first.draftId, first.state);

    const existingByLabel: Record<string, string> = {};
    for (const row of await getDb().select().from(player)) {
      existingByLabel[row.displayName] = row.id;
    }

    const reordered = {
      ...SHEET_01,
      columns: [...SHEET_01.columns].reverse(),
    };
    const second = await setUpDraft(reordered, { playerIds: existingByLabel });
    const secondResult = await saveGame(second.draftId, second.state);

    const { game } = await import("@/lib/db/schema");
    const firstGame = (
      await getDb().select().from(game).where(eq(game.id, firstResult.gameId))
    )[0]!;
    const secondGame = (
      await getDb().select().from(game).where(eq(game.id, secondResult.gameId))
    )[0]!;
    expect(secondGame.rosterId).toBe(firstGame.rosterId);

    const rosters = await getDb().select().from(roster);
    expect(rosters).toHaveLength(1);
  });
});

describe("criterion 68 — the roster auto-name", () => {
  it("a newly created roster has no stored name; the display name is built from members", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { roster } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    await saveGame(draftId, state);

    const rows = await getDb().select().from(roster);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBeNull();
  });
});

describe("idempotency", () => {
  it("saving an already-saved draft again returns the same gameId, unchanged", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { game } = await import("@/lib/db/schema");

    const { draftId, state } = await setUpDraft(SHEET_01);
    const first = await saveGame(draftId, state);
    expect(first.alreadySaved).toBe(false);

    const second = await saveGame(draftId, state);
    expect(second.alreadySaved).toBe(true);
    expect(second.gameId).toBe(first.gameId);

    const games = await getDb().select().from(game);
    expect(games).toHaveLength(1);
  });
});

describe("⚠️ all or nothing — a failure part-way through leaves nothing persisted", () => {
  it("a primary-key collision on the game insert rolls back the roster it just created too", async () => {
    const labels = SHEET_01.columns.map((c) => c.player);
    const playerIds = await createPlayers(labels);
    const { draftId, state } = await setUpDraft(SHEET_01, { playerIds });

    // Existing players, no new location: resolveLocation and resolvePlayers
    // make 0 randomUUID calls, so the only two calls left inside the
    // transaction are, in order, the new roster's id and the new game's id.
    const predictedRosterId = "predicted-roster-id";
    const predictedGameId = "predicted-game-id";
    uuidQueue.push(predictedRosterId, predictedGameId);

    const { getDb } = await import("@/lib/db");
    const { roster, game, gamePlayer, roundScore, draft: draftTable } = await import(
      "@/lib/db/schema"
    );

    // A throwaway roster purely so the pre-seeded game row below has a valid
    // roster_id to point at.
    await getDb()
      .insert(roster)
      .values({ id: "throwaway-roster", signature: "throwaway", size: 1 });
    // Pre-seed a game row at the id `saveGame` is about to mint, so its own
    // `INSERT INTO game` collides on the primary key — *after* it has already
    // inserted the new roster and roster_member rows in the same transaction.
    await getDb()
      .insert(game)
      .values({ id: predictedGameId, playedOn: "1999-01-01", rosterId: "throwaway-roster" });

    const { saveGame } = await import("@/lib/games/save");
    await expect(saveGame(draftId, state)).rejects.toThrow();

    // The roster the failed save created moments earlier, in the same
    // transaction, is gone — rolled back with everything after it.
    expect(await getDb().select().from(roster).where(eq(roster.id, predictedRosterId))).toHaveLength(0);
    expect(
      await getDb().select().from(gamePlayer).where(eq(gamePlayer.gameId, predictedGameId)),
    ).toHaveLength(0);
    expect(
      await getDb().select().from(roundScore).where(eq(roundScore.gameId, predictedGameId)),
    ).toHaveLength(0);

    const draftRow = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, draftId))
    )[0]!;
    expect(draftRow.savedGameId).toBeNull();
  });
});

describe("⚠️ security review MEDIUM 2 — the save doesn't trust client ids", () => {
  it("refuses (InvalidReferenceError, 422 invalid_grid at the route) a playerId that doesn't exist", async () => {
    const { saveGame, InvalidReferenceError } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01, {
      playerIds: { "Player A": "not-a-real-player-id" },
    });

    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(InvalidReferenceError);
  });

  it("refuses a playerId belonging to a player who has been merged away", async () => {
    const { saveGame, InvalidReferenceError } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player } = await import("@/lib/db/schema");

    const playerIds = await createPlayers(SHEET_01.columns.map((c) => c.player));
    const mergedId = playerIds[SHEET_01.columns[0]!.player]!;
    await getDb()
      .update(player)
      .set({ mergedIntoId: playerIds[SHEET_01.columns[1]!.player]! })
      .where(eq(player.id, mergedId));

    const { draftId, state } = await setUpDraft(SHEET_01, { playerIds });
    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(InvalidReferenceError);
  });

  it("refuses a locationId that doesn't exist", async () => {
    const { saveGame, InvalidReferenceError } = await import("@/lib/games/save");
    const { draftId, state } = await setUpDraft(SHEET_01, {
      locationId: "not-a-real-location-id",
    });

    await expect(saveGame(draftId, state)).rejects.toBeInstanceOf(InvalidReferenceError);
  });

  it("still saves cleanly when every id is real", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { location } = await import("@/lib/db/schema");

    const playerIds = await createPlayers(SHEET_01.columns.map((c) => c.player));
    const locationId = "a-real-location";
    await getDb()
      .insert(location)
      .values({ id: locationId, name: "The venue", slug: "the-venue", nameKey: "the venue" });

    const { draftId, state } = await setUpDraft(SHEET_01, { playerIds, locationId });
    const result = await saveGame(draftId, state);
    expect(result.alreadySaved).toBe(false);
  });
});

describe("⚠️ security review LOW 4 — a retyped existing name resolves, not duplicates", () => {
  it("'Player A' typed as new when Player A already exists resolves to them, not a second row", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player, gamePlayer } = await import("@/lib/db/schema");

    const existingId = (await createPlayers(["Player A"]))["Player A"]!;

    // Every column typed as "someone new" — including Player A's, by name.
    const { draftId, state } = await setUpDraft(SHEET_01);
    const result = await saveGame(draftId, state);

    const rows = await getDb().select().from(player).where(eq(player.displayName, "Player A"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(existingId);

    const gp = (
      await getDb()
        .select()
        .from(gamePlayer)
        .where(and(eq(gamePlayer.gameId, result.gameId), eq(gamePlayer.playerId, existingId)))
    )[0]!;
    expect(gp.sheetName).toBe("Player A");
  });

  it("⚠️ picking an existing player AND typing their name as new in another column is duplicate_player", async () => {
    const { saveGame, InvalidGridError } = await import("@/lib/games/save");
    const playerIds = await createPlayers(["Player A"]);

    const { draftId, state } = await setUpDraft(SHEET_01, {
      playerIds: { "Player A": playerIds["Player A"]! },
    });
    // Column 0 (Player A) picked the existing player directly; make column 1
    // (Player B) a pending name that resolves to the SAME existing player.
    state.columns[1]!.playerId = null;
    state.columns[1]!.newPlayerName = "Player A";

    expect.assertions(2);
    try {
      await saveGame(draftId, state);
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidGridError);
      expect((error as InstanceType<typeof InvalidGridError>).validation.issues[0]?.code).toBe(
        "duplicate_player",
      );
    }
  });

  it("case- and whitespace-insensitive: '  player a ' resolves to 'Player A'", async () => {
    const { saveGame } = await import("@/lib/games/save");
    const { getDb } = await import("@/lib/db");
    const { player } = await import("@/lib/db/schema");

    const existingId = (await createPlayers(["Player A"]))["Player A"]!;
    const { draftId, state } = await setUpDraft(SHEET_01);
    state.columns[0]!.newPlayerName = "  player a ";

    await saveGame(draftId, state);

    const rows = await getDb().select().from(player).where(eq(player.nameKey, "player a"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(existingId);
  });
});
