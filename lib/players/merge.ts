/**
 * `mergePlayers` — PRD criteria 155–162.
 *
 * `docs/DECISIONS.md`, 2026-09-14, "Milestone 2: player/location merges are
 * permanent": a merge is a single-transaction, irreversible repoint with no
 * history kept anywhere — the same stance this project already takes on a
 * game delete. This is the highest-stakes write in the project so far:
 * correctness and transactional integrity come before cleverness.
 *
 * In order:
 *   1. **Refused up front, before anything changes** (criterion 160), if the
 *      survivor and the loser appear in the same game. Checked outside any
 *      transaction — there is nothing to roll back if this refuses.
 *   2. One transaction:
 *      a. Repoint `game_player`, `round_score` and `photo` rows from the
 *         loser to the survivor (criterion 158). Safe as blanket updates —
 *         step 1 already guarantees the two never share a `game_id`, so
 *         nothing here can collide with an existing survivor row on either
 *         table's primary key.
 *      b. Repoint `roster_member` rows, roster by roster, folding any
 *         collision this creates (criterion 159).
 *      c. Delete the losing `player` row.
 *
 * ⚠️ **`roster_member`'s repoint cannot be a single blanket UPDATE.** Two
 * failure modes a bulk `UPDATE ... WHERE player_id = loser` would hit:
 *   - `roster.signature` is `UNIQUE`. Repointing a roster's member from loser
 *     to survivor can make its signature collide with an existing roster's —
 *     exactly criterion 159's roster folding, which has to run per roster,
 *     not once at the end.
 *   - A stale roster (every one of its games since deleted or edited away,
 *     Stage 3 decision 5) can still list *both* players as members even
 *     though they never actually shared a live game — the same-game refusal
 *     only looks at real games. Updating that roster's `(roster_id,
 *     player_id)` row from loser to survivor would collide with the
 *     survivor's own row already sitting there; handled per roster, below,
 *     by deleting the loser's row instead of updating it when that happens.
 */

import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  game,
  gamePlayer,
  location,
  photo,
  player,
  roster,
  rosterMember,
  roundScore,
} from "@/lib/db/schema";
import type { Tx } from "@/lib/games/resolve";
import { rosterSignature } from "@/lib/scoring";

export class PlayerNotFoundError extends Error {
  override name = "PlayerNotFoundError";
  constructor(public readonly playerId: string) {
    super("That player doesn't exist.");
  }
}

export class SamePlayerError extends Error {
  override name = "SamePlayerError";
  constructor() {
    super("A player can't be merged with themselves.");
  }
}

export interface ConflictingGame {
  id: string;
  playedOn: string;
  locationName: string | null;
}

/**
 * Criterion 160: refused before anything changes, naming every offending
 * game so the frontend can link to it for editing.
 */
export class SameGameConflictError extends Error {
  override name = "SameGameConflictError";
  constructor(public readonly games: ConflictingGame[]) {
    super("These two players appear in the same game and can't be merged yet.");
  }
}

export interface RosterFold {
  /** The roster that survived the fold. */
  winnerRosterId: string;
  /** The roster that was deleted. */
  loserRosterId: string;
  /** `roster.name` after the fold — `null` if neither roster had a custom name. */
  keptName: string | null;
  /** True only when *both* rosters had a custom name (criterion 159's report). */
  bothHadCustomNames: boolean;
}

export interface MergePlayersResult {
  survivorId: string;
  deletedPlayerId: string;
  /** Every roster collision the merge created and folded, in the order found. */
  rosterFolds: RosterFold[];
}

export interface PlayerMergePreview {
  survivor: { id: string; displayName: string; gamesPlayed: number };
  other: { id: string; displayName: string; gamesPlayed: number };
  conflicts: ConflictingGame[];
}

async function gamesPlayedByPlayer(
  db: ReturnType<typeof getDb>,
  playerId: string,
): Promise<number> {
  const rows = await db
    .select({ gameId: gamePlayer.gameId })
    .from(gamePlayer)
    .where(eq(gamePlayer.playerId, playerId));
  return rows.length;
}

/**
 * Every game both players appear in — empty when there is none. Exported so
 * the preview endpoint and the merge transaction's up-front refusal share one
 * implementation and can never disagree about what counts as a conflict.
 */
export async function findSharedGames(
  survivorId: string,
  otherId: string,
): Promise<ConflictingGame[]> {
  const db = getDb();

  const [survivorGames, otherGames] = await Promise.all([
    db.select({ gameId: gamePlayer.gameId }).from(gamePlayer).where(eq(gamePlayer.playerId, survivorId)),
    db.select({ gameId: gamePlayer.gameId }).from(gamePlayer).where(eq(gamePlayer.playerId, otherId)),
  ]);

  const otherGameIds = new Set(otherGames.map((g) => g.gameId));
  const sharedGameIds = [...new Set(survivorGames.map((g) => g.gameId))].filter((id) =>
    otherGameIds.has(id),
  );
  if (sharedGameIds.length === 0) return [];

  const rows = await db
    .select({ id: game.id, playedOn: game.playedOn, locationName: location.name })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .where(inArray(game.id, sharedGameIds));

  return rows.sort((a, b) => (a.playedOn < b.playedOn ? -1 : a.playedOn > b.playedOn ? 1 : 0));
}

/**
 * Both players' names and games-played, plus any same-game conflict — what
 * `MergeConfirmScreen` needs before it lets the founder pick a survivor
 * (`docs/DESIGN-SYSTEM.md` § "Merging two players"). `survivorId`/`otherId`
 * here are just "the two players", not a choice yet — the screen picks the
 * survivor afterwards.
 *
 * @throws {PlayerNotFoundError}
 */
export async function previewPlayerMerge(
  aId: string,
  bId: string,
): Promise<PlayerMergePreview> {
  const db = getDb();

  const [aRow, bRow] = await Promise.all([
    db.select().from(player).where(eq(player.id, aId)),
    db.select().from(player).where(eq(player.id, bId)),
  ]);
  const a = aRow[0];
  const b = bRow[0];
  if (!a) throw new PlayerNotFoundError(aId);
  if (!b) throw new PlayerNotFoundError(bId);

  const [aGames, bGames, conflicts] = await Promise.all([
    gamesPlayedByPlayer(db, aId),
    gamesPlayedByPlayer(db, bId),
    findSharedGames(aId, bId),
  ]);

  return {
    survivor: { id: a.id, displayName: a.displayName, gamesPlayed: aGames },
    other: { id: b.id, displayName: b.displayName, gamesPlayed: bGames },
    conflicts,
  };
}

async function countGamesForRoster(tx: Tx, rosterId: string): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)` })
    .from(game)
    .where(eq(game.rosterId, rosterId));
  return Number(rows[0]?.count ?? 0);
}

/**
 * Repoint one roster's membership from the loser to the survivor, folding it
 * into a colliding roster if repointing produces a signature that already
 * exists. Called once per roster that had the loser as a member, in the
 * order those rosters were found — see `mergePlayers`.
 */
async function repointRosterMembership(
  tx: Tx,
  rosterId: string,
  survivorId: string,
  loserId: string,
): Promise<RosterFold | null> {
  // ⚠️ A stale roster (Stage 3 decision 5: never auto-deleted) can already
  // list both players if every game that ever used it has since been
  // deleted or edited away — the same-game refusal only looks at *live*
  // games. Delete rather than update in that case, or the UPDATE below would
  // collide with the survivor's own (roster_id, player_id) row.
  const survivorAlreadyMember = (
    await tx
      .select({ playerId: rosterMember.playerId })
      .from(rosterMember)
      .where(and(eq(rosterMember.rosterId, rosterId), eq(rosterMember.playerId, survivorId)))
  )[0];

  if (survivorAlreadyMember) {
    await tx
      .delete(rosterMember)
      .where(and(eq(rosterMember.rosterId, rosterId), eq(rosterMember.playerId, loserId)));
  } else {
    await tx
      .update(rosterMember)
      .set({ playerId: survivorId })
      .where(and(eq(rosterMember.rosterId, rosterId), eq(rosterMember.playerId, loserId)));
  }

  const memberRows = await tx
    .select({ playerId: rosterMember.playerId })
    .from(rosterMember)
    .where(eq(rosterMember.rosterId, rosterId));
  const memberIds = memberRows.map((r) => r.playerId);
  const newSignature = rosterSignature(memberIds);

  const thisRoster = (await tx.select().from(roster).where(eq(roster.id, rosterId)))[0]!;

  const collision = (
    await tx
      .select()
      .from(roster)
      .where(and(eq(roster.signature, newSignature), ne(roster.id, rosterId)))
  )[0];

  if (!collision) {
    await tx
      .update(roster)
      .set({ signature: newSignature, size: memberIds.length })
      .where(eq(roster.id, rosterId));
    return null;
  }

  // Criterion 159: the survivor is the roster with more games; ties go to
  // the older roster (earlier createdAt).
  const [thisGames, collisionGames] = await Promise.all([
    countGamesForRoster(tx, thisRoster.id),
    countGamesForRoster(tx, collision.id),
  ]);

  let winner = thisRoster;
  let loserRoster = collision;
  if (collisionGames > thisGames) {
    winner = collision;
    loserRoster = thisRoster;
  } else if (collisionGames === thisGames && collision.createdAt < thisRoster.createdAt) {
    winner = collision;
    loserRoster = thisRoster;
  }

  const bothHadCustomNames = Boolean(winner.name) && Boolean(loserRoster.name);
  const keptName = winner.name ?? loserRoster.name ?? null;

  // Repoint the loser roster's games to the winner, then delete its
  // membership and its own row.
  await tx.update(game).set({ rosterId: winner.id }).where(eq(game.rosterId, loserRoster.id));
  await tx.delete(rosterMember).where(eq(rosterMember.rosterId, loserRoster.id));
  await tx.delete(roster).where(eq(roster.id, loserRoster.id));

  if (winner.id === thisRoster.id) {
    // The roster we were repointing survives the fold — safe to write its
    // recomputed signature/size now that the colliding row is gone, plus the
    // name the fold decided on.
    await tx
      .update(roster)
      .set({ signature: newSignature, size: memberIds.length, name: keptName })
      .where(eq(roster.id, winner.id));
  } else if (keptName !== winner.name) {
    // The pre-existing collision survives; its own signature/size are
    // already correct, only the name might change.
    await tx.update(roster).set({ name: keptName }).where(eq(roster.id, winner.id));
  }

  return {
    winnerRosterId: winner.id,
    loserRosterId: loserRoster.id,
    keptName,
    bothHadCustomNames,
  };
}

/**
 * Merge `loserId` into `survivorId`. Permanent: the loser's row is deleted at
 * the end and nothing records that this ran (criterion 162).
 *
 * @throws {SamePlayerError} if the two ids are the same.
 * @throws {PlayerNotFoundError} if either id doesn't name a real player.
 * @throws {SameGameConflictError} if the two share a game — refused before
 *   anything changes; nothing is repointed.
 */
export async function mergePlayers(
  survivorId: string,
  loserId: string,
): Promise<MergePlayersResult> {
  if (survivorId === loserId) throw new SamePlayerError();

  const db = getDb();

  const [survivorRow, loserRow] = await Promise.all([
    db.select().from(player).where(eq(player.id, survivorId)),
    db.select().from(player).where(eq(player.id, loserId)),
  ]);
  if (!survivorRow[0]) throw new PlayerNotFoundError(survivorId);
  if (!loserRow[0]) throw new PlayerNotFoundError(loserId);

  // Criterion 160: refused up front, outside any transaction — there is
  // nothing to roll back if this refuses.
  const conflicts = await findSharedGames(survivorId, loserId);
  if (conflicts.length > 0) throw new SameGameConflictError(conflicts);

  return db.transaction(async (tx) => {
    // Re-check for a conflict inside the transaction too: the up-front check
    // above is best-effort against a concurrent save landing in between
    // (docs/ARCHITECTURE.md § "Concurrency, deliberately not solved" — this
    // app assumes one editor, but refusing loudly here is cheap insurance
    // against the rare double-tap).
    const [survivorGames, loserGames] = await Promise.all([
      tx.select({ gameId: gamePlayer.gameId }).from(gamePlayer).where(eq(gamePlayer.playerId, survivorId)),
      tx.select({ gameId: gamePlayer.gameId }).from(gamePlayer).where(eq(gamePlayer.playerId, loserId)),
    ]);
    const loserGameIds = new Set(loserGames.map((g) => g.gameId));
    if (survivorGames.some((g) => loserGameIds.has(g.gameId))) {
      throw new SameGameConflictError(await findSharedGames(survivorId, loserId));
    }

    // criterion 158: game_player, round_score, photo. Safe as blanket
    // updates — the two never share a game_id, so neither table's primary
    // key (game_id, player_id[, hand]) can collide.
    await tx.update(gamePlayer).set({ playerId: survivorId }).where(eq(gamePlayer.playerId, loserId));
    await tx.update(roundScore).set({ playerId: survivorId }).where(eq(roundScore.playerId, loserId));
    await tx.update(photo).set({ playerId: survivorId }).where(eq(photo.playerId, loserId));

    // criterion 158/159: roster_member, folding any signature collision.
    const affectedRosterRows = await tx
      .select({ rosterId: rosterMember.rosterId })
      .from(rosterMember)
      .where(eq(rosterMember.playerId, loserId));
    const affectedRosterIds = [...new Set(affectedRosterRows.map((r) => r.rosterId))];

    const rosterFolds: RosterFold[] = [];
    for (const rosterId of affectedRosterIds) {
      const fold = await repointRosterMembership(tx, rosterId, survivorId, loserId);
      if (fold) rosterFolds.push(fold);
    }

    await tx.delete(player).where(eq(player.id, loserId));

    return { survivorId, deletedPlayerId: loserId, rosterFolds };
  });
}
