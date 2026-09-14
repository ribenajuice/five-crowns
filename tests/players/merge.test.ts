/**
 * `mergePlayers` — PRD criteria 155–162. The highest-stakes transaction in
 * the project so far: permanent, cross-table, irreversible by design.
 *
 * Rows are built directly rather than through the save pipeline — precise
 * control over exactly which players/rosters/games collide is what these
 * tests are about, and the save pipeline would obscure that.
 */

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

beforeEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

async function insertPlayer(id: string, displayName: string) {
  const { getDb } = await import("@/lib/db");
  const { player } = await import("@/lib/db/schema");
  await getDb()
    .insert(player)
    .values({ id, displayName, slug: id, nameKey: displayName.toLowerCase() });
}

async function insertRoster(
  id: string,
  memberIds: string[],
  options: { name?: string | null; createdAt?: string } = {},
) {
  const { getDb } = await import("@/lib/db");
  const { roster, rosterMember } = await import("@/lib/db/schema");
  const { rosterSignature } = await import("@/lib/scoring");

  await getDb()
    .insert(roster)
    .values({
      id,
      signature: rosterSignature(memberIds),
      size: memberIds.length,
      name: options.name ?? null,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    });
  await getDb()
    .insert(rosterMember)
    .values(memberIds.map((playerId) => ({ rosterId: id, playerId })));
}

async function insertGame(
  id: string,
  rosterId: string,
  playerIds: string[],
  options: { playedOn?: string; locationId?: string | null } = {},
) {
  const { getDb } = await import("@/lib/db");
  const { game, gamePlayer, roundScore } = await import("@/lib/db/schema");

  await getDb()
    .insert(game)
    .values({
      id,
      playedOn: options.playedOn ?? "2026-01-01",
      locationId: options.locationId ?? null,
      rosterId,
    });

  for (const [i, playerId] of playerIds.entries()) {
    await getDb().insert(gamePlayer).values({
      gameId: id,
      playerId,
      columnOrder: i,
      sheetName: null,
      finalScore: 100 + i,
    });
    for (let hand = 1; hand <= 3; hand++) {
      await getDb().insert(roundScore).values({
        gameId: id,
        playerId,
        hand,
        runningTotal: hand * 10,
        score: 10,
      });
    }
  }
}

async function insertColumnPhoto(id: string, playerId: string) {
  const { getDb } = await import("@/lib/db");
  const { photo } = await import("@/lib/db/schema");
  await getDb().insert(photo).values({
    id,
    kind: "column",
    playerId,
    s3KeyOriginal: `${id}/original.jpg`,
    s3KeyModel: `${id}/model.jpg`,
  });
}

describe("mergePlayers — the ordinary case (no shared game)", () => {
  it("repoints game_player, round_score and photo, and deletes the losing player (criteria 158, 161)", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertRoster("r1", ["loser"]);
    await insertGame("g1", "r1", ["loser"]);
    await insertColumnPhoto("photo1", "loser");

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");
    expect(result.deletedPlayerId).toBe("loser");
    expect(result.survivorId).toBe("survivor");

    const { getDb } = await import("@/lib/db");
    const { player, gamePlayer, roundScore, photo } = await import("@/lib/db/schema");

    expect(await getDb().select().from(player).where(eq(player.id, "loser"))).toHaveLength(0);

    const gp = await getDb().select().from(gamePlayer).where(eq(gamePlayer.gameId, "g1"));
    expect(gp).toHaveLength(1);
    expect(gp[0]!.playerId).toBe("survivor");

    const rs = await getDb().select().from(roundScore).where(eq(roundScore.gameId, "g1"));
    expect(rs.every((r) => r.playerId === "survivor")).toBe(true);
    expect(rs).toHaveLength(3);

    const ph = await getDb().select().from(photo).where(eq(photo.id, "photo1"));
    expect(ph[0]!.playerId).toBe("survivor");
  });

  it("throws SamePlayerError for the same id twice", async () => {
    await insertPlayer("p1", "Solo");
    const { mergePlayers, SamePlayerError } = await import("@/lib/players/merge");
    await expect(mergePlayers("p1", "p1")).rejects.toBeInstanceOf(SamePlayerError);
  });

  it("throws PlayerNotFoundError when either id doesn't exist", async () => {
    await insertPlayer("p1", "Solo");
    const { mergePlayers, PlayerNotFoundError } = await import("@/lib/players/merge");
    await expect(mergePlayers("p1", "no-such-player")).rejects.toBeInstanceOf(PlayerNotFoundError);
    await expect(mergePlayers("no-such-player", "p1")).rejects.toBeInstanceOf(PlayerNotFoundError);
  });
});

describe("mergePlayers — criterion 160: the same-game refusal", () => {
  it("refuses before anything changes, naming every offending game, and repoints nothing", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertRoster("r1", ["survivor", "loser"]);
    await insertGame("g1", "r1", ["survivor", "loser"], { playedOn: "2026-05-01" });

    const { mergePlayers, SameGameConflictError } = await import("@/lib/players/merge");
    const { getDb } = await import("@/lib/db");
    const { gamePlayer, roundScore, player } = await import("@/lib/db/schema");

    const beforeGamePlayer = await getDb().select().from(gamePlayer);
    const beforeRoundScore = await getDb().select().from(roundScore);
    const beforePlayers = await getDb().select().from(player);

    let caught: unknown;
    try {
      await mergePlayers("survivor", "loser");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SameGameConflictError);
    const conflictError = caught as InstanceType<typeof SameGameConflictError>;
    expect(conflictError.games).toEqual([{ id: "g1", playedOn: "2026-05-01", locationName: null }]);

    // QA's own assertion, stated literally: no row anywhere was repointed.
    expect(await getDb().select().from(gamePlayer)).toEqual(beforeGamePlayer);
    expect(await getDb().select().from(roundScore)).toEqual(beforeRoundScore);
    expect(await getDb().select().from(player)).toEqual(beforePlayers);
  });
});

describe("mergePlayers — criterion 159: roster folding", () => {
  it("folds a colliding roster into the pre-existing one when it has more games", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");
    await insertPlayer("c", "C");

    // The pre-existing {survivor, B, C} roster, with two games — this is the
    // roster the repointed one will collide with.
    await insertRoster("existing", ["survivor", "b", "c"]);
    await insertGame("g-existing-1", "existing", ["survivor", "b", "c"]);
    await insertGame("g-existing-2", "existing", ["survivor", "b", "c"]);

    // {loser, B, C}, one game — becomes {survivor, B, C} once repointed,
    // colliding with "existing".
    await insertRoster("folding", ["loser", "b", "c"]);
    await insertGame("g-folding-1", "folding", ["loser", "b", "c"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");

    expect(result.rosterFolds).toHaveLength(1);
    expect(result.rosterFolds[0]!.winnerRosterId).toBe("existing"); // more games
    expect(result.rosterFolds[0]!.loserRosterId).toBe("folding");

    const { getDb } = await import("@/lib/db");
    const { roster, rosterMember, game } = await import("@/lib/db/schema");

    expect(await getDb().select().from(roster).where(eq(roster.id, "folding"))).toHaveLength(0);
    expect(
      await getDb().select().from(rosterMember).where(eq(rosterMember.rosterId, "folding")),
    ).toHaveLength(0);

    // The folding roster's game now belongs to the surviving roster.
    const foldedGame = (await getDb().select().from(game).where(eq(game.id, "g-folding-1")))[0]!;
    expect(foldedGame.rosterId).toBe("existing");

    // The surviving roster's own games are untouched.
    const membersOfExisting = await getDb()
      .select()
      .from(rosterMember)
      .where(eq(rosterMember.rosterId, "existing"));
    expect(membersOfExisting.map((m) => m.playerId).sort()).toEqual(["b", "c", "survivor"]);
  });

  it("folds the pre-existing roster away when the repointed one has more games", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");
    await insertPlayer("c", "C");

    await insertRoster("existing", ["survivor", "b", "c"]);
    await insertGame("g-existing-1", "existing", ["survivor", "b", "c"]);

    await insertRoster("folding", ["loser", "b", "c"]);
    await insertGame("g-folding-1", "folding", ["loser", "b", "c"]);
    await insertGame("g-folding-2", "folding", ["loser", "b", "c"]);
    await insertGame("g-folding-3", "folding", ["loser", "b", "c"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");

    // "folding" (now {survivor,b,c}) has more games (3 vs 1), so it wins —
    // "existing" is the one folded away this time.
    expect(result.rosterFolds[0]!.winnerRosterId).toBe("folding");
    expect(result.rosterFolds[0]!.loserRosterId).toBe("existing");

    const { getDb } = await import("@/lib/db");
    const { roster, game } = await import("@/lib/db/schema");
    expect(await getDb().select().from(roster).where(eq(roster.id, "existing"))).toHaveLength(0);
    const movedGame = (await getDb().select().from(game).where(eq(game.id, "g-existing-1")))[0]!;
    expect(movedGame.rosterId).toBe("folding");

    // The surviving roster's own signature/size are correct post-fold.
    const survivorRosterRow = (
      await getDb().select().from(roster).where(eq(roster.id, "folding"))
    )[0]!;
    const { rosterSignature } = await import("@/lib/scoring");
    expect(survivorRosterRow.signature).toBe(rosterSignature(["survivor", "b", "c"]));
    expect(survivorRosterRow.size).toBe(3);
  });

  it("⚠️ ties on games played go to the older roster", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");

    await insertRoster("older", ["survivor", "b"], { createdAt: "2020-01-01T00:00:00.000Z" });
    await insertGame("g-older-1", "older", ["survivor", "b"]);

    await insertRoster("newer", ["loser", "b"], { createdAt: "2025-01-01T00:00:00.000Z" });
    await insertGame("g-newer-1", "newer", ["loser", "b"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");

    expect(result.rosterFolds[0]!.winnerRosterId).toBe("older");
    expect(result.rosterFolds[0]!.loserRosterId).toBe("newer");
  });

  it("⚠️ criterion 159: a custom name carries across only if the survivor had none", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");

    // The pre-existing roster wins on games played, and has no custom name.
    await insertRoster("existing", ["survivor", "b"], { name: null });
    await insertGame("g-existing-1", "existing", ["survivor", "b"]);
    await insertGame("g-existing-2", "existing", ["survivor", "b"]);

    // The folding roster has a custom name.
    await insertRoster("folding", ["loser", "b"], { name: "Thursday crew" });
    await insertGame("g-folding-1", "folding", ["loser", "b"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");

    expect(result.rosterFolds[0]!.keptName).toBe("Thursday crew");
    expect(result.rosterFolds[0]!.bothHadCustomNames).toBe(false);

    const { getDb } = await import("@/lib/db");
    const { roster } = await import("@/lib/db/schema");
    const winnerRow = (await getDb().select().from(roster).where(eq(roster.id, "existing")))[0]!;
    expect(winnerRow.name).toBe("Thursday crew");
  });

  it("⚠️ criterion 159: if both had custom names, the survivor's is kept and reported", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");

    await insertRoster("existing", ["survivor", "b"], { name: "Winner name" });
    await insertGame("g-existing-1", "existing", ["survivor", "b"]);
    await insertGame("g-existing-2", "existing", ["survivor", "b"]);

    await insertRoster("folding", ["loser", "b"], { name: "Loser name" });
    await insertGame("g-folding-1", "folding", ["loser", "b"]);

    const { mergePlayers } = await import("@/lib/players/merge");
    const result = await mergePlayers("survivor", "loser");

    expect(result.rosterFolds[0]!.bothHadCustomNames).toBe(true);
    expect(result.rosterFolds[0]!.keptName).toBe("Winner name");

    const { getDb } = await import("@/lib/db");
    const { roster } = await import("@/lib/db/schema");
    const winnerRow = (await getDb().select().from(roster).where(eq(roster.id, "existing")))[0]!;
    expect(winnerRow.name).toBe("Winner name");
  });

  it("a roster containing both players with zero live games doesn't collide on repoint", async () => {
    // A stale roster (Stage 3 decision 5): every game that used it has since
    // been deleted, but the roster_member rows survive and, unusually,
    // already list both the survivor and the loser (no live game ever had
    // them share a table, so the same-game refusal doesn't fire).
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    const { getDb } = await import("@/lib/db");
    const { roster, rosterMember } = await import("@/lib/db/schema");
    await getDb()
      .insert(roster)
      .values({ id: "stale", signature: "irrelevant-stale-signature", size: 2, name: null });
    await getDb()
      .insert(rosterMember)
      .values([
        { rosterId: "stale", playerId: "survivor" },
        { rosterId: "stale", playerId: "loser" },
      ]);

    const { mergePlayers } = await import("@/lib/players/merge");
    await expect(mergePlayers("survivor", "loser")).resolves.toBeDefined();

    const members = await getDb()
      .select()
      .from(rosterMember)
      .where(eq(rosterMember.rosterId, "stale"));
    expect(members.map((m) => m.playerId)).toEqual(["survivor"]);
  });
});

describe("mergePlayers — criterion 162: single transaction, all or nothing", () => {
  it("a forced failure partway through leaves the record exactly as it was", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertRoster("r1", ["loser"]);
    await insertGame("g1", "r1", ["loser"]);
    await insertColumnPhoto("photo1", "loser");

    const { getDb } = await import("@/lib/db");
    // Force the final step (deleting the losing player row) to fail. Every
    // repoint above it in the transaction must then roll back too.
    await getDb().run(
      sql.raw(
        `CREATE TRIGGER force_merge_failure BEFORE DELETE ON player WHEN old.id = 'loser' BEGIN SELECT RAISE(ABORT, 'forced test failure'); END;`,
      ),
    );

    const { mergePlayers } = await import("@/lib/players/merge");
    await expect(mergePlayers("survivor", "loser")).rejects.toThrow();

    const { player, gamePlayer, roundScore, photo } = await import("@/lib/db/schema");

    // Nothing repointed: still pointing at the loser, exactly as before.
    expect(await getDb().select().from(player).where(eq(player.id, "loser"))).toHaveLength(1);
    const gp = (await getDb().select().from(gamePlayer).where(eq(gamePlayer.gameId, "g1")))[0]!;
    expect(gp.playerId).toBe("loser");
    const rs = await getDb().select().from(roundScore).where(eq(roundScore.gameId, "g1"));
    expect(rs.every((r) => r.playerId === "loser")).toBe(true);
    const ph = (await getDb().select().from(photo).where(eq(photo.id, "photo1")))[0]!;
    expect(ph.playerId).toBe("loser");
  });

  it("a forced failure during roster folding leaves the folded-away roster intact", async () => {
    await insertPlayer("survivor", "Survivor");
    await insertPlayer("loser", "Loser");
    await insertPlayer("b", "B");

    await insertRoster("existing", ["survivor", "b"]);
    await insertGame("g-existing-1", "existing", ["survivor", "b"]);
    await insertGame("g-existing-2", "existing", ["survivor", "b"]);

    await insertRoster("folding", ["loser", "b"]);
    await insertGame("g-folding-1", "folding", ["loser", "b"]);

    const { getDb } = await import("@/lib/db");
    await getDb().run(
      sql.raw(
        `CREATE TRIGGER force_merge_failure BEFORE DELETE ON player WHEN old.id = 'loser' BEGIN SELECT RAISE(ABORT, 'forced test failure'); END;`,
      ),
    );

    const { mergePlayers } = await import("@/lib/players/merge");
    await expect(mergePlayers("survivor", "loser")).rejects.toThrow();

    const { roster, rosterMember, game } = await import("@/lib/db/schema");
    // The "folding" roster must still exist, untouched, and its game must
    // still point at it — the fold never happened.
    expect(await getDb().select().from(roster).where(eq(roster.id, "folding"))).toHaveLength(1);
    const foldingMembers = await getDb()
      .select()
      .from(rosterMember)
      .where(eq(rosterMember.rosterId, "folding"));
    expect(foldingMembers.map((m) => m.playerId).sort()).toEqual(["b", "loser"]);
    const stillFoldingGame = (
      await getDb().select().from(game).where(eq(game.id, "g-folding-1"))
    )[0]!;
    expect(stillFoldingGame.rosterId).toBe("folding");
  });
});

describe("previewPlayerMerge", () => {
  it("reports both players' games played and no conflicts when they've never shared a game", async () => {
    await insertPlayer("a", "Player A");
    await insertPlayer("b", "Player B");
    await insertRoster("r1", ["a"]);
    await insertGame("g1", "r1", ["a"]);
    await insertGame("g2", "r1", ["a"]);

    const { previewPlayerMerge } = await import("@/lib/players/merge");
    const preview = await previewPlayerMerge("a", "b");
    expect(preview.survivor).toEqual({ id: "a", displayName: "Player A", gamesPlayed: 2 });
    expect(preview.other).toEqual({ id: "b", displayName: "Player B", gamesPlayed: 0 });
    expect(preview.conflicts).toEqual([]);
  });

  it("surfaces the conflicting games when the two share one", async () => {
    await insertPlayer("a", "Player A");
    await insertPlayer("b", "Player B");
    await insertRoster("r1", ["a", "b"]);
    await insertGame("g1", "r1", ["a", "b"], { playedOn: "2026-03-03" });

    const { previewPlayerMerge } = await import("@/lib/players/merge");
    const preview = await previewPlayerMerge("a", "b");
    expect(preview.conflicts).toEqual([{ id: "g1", playedOn: "2026-03-03", locationName: null }]);
  });

  it("throws PlayerNotFoundError for a missing id", async () => {
    await insertPlayer("a", "Player A");
    const { previewPlayerMerge, PlayerNotFoundError } = await import("@/lib/players/merge");
    await expect(previewPlayerMerge("a", "no-such-id")).rejects.toBeInstanceOf(PlayerNotFoundError);
  });
});
