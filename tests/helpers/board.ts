/**
 * Test-only helpers for seeding games directly into `game`, `game_player` and
 * `round_score` — bypassing the draft/save pipeline, which is unnecessary
 * ceremony (and, at 60 games, slow) for testing `lib/board/queries.ts`
 * against data whose shape is already trusted by `tests/games/save.test.ts`.
 */

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, roster, rosterMember, roundScore } from "@/lib/db/schema";
import { rosterSignature, rosterSize } from "@/lib/scoring";

export interface SeedGamePlayer {
  playerId: string;
  finalScore: number;
  /**
   * 11 per-hand scores summing to `finalScore`. Omit entirely for a test that
   * doesn't care about "most rounds won" — no `round_score` rows are written
   * for a player who has none, which is fine for every other record.
   */
  handScores?: number[];
}

export interface SeedGameOptions {
  id?: string;
  playedOn: string;
  createdAt?: string;
  locationName?: string | null;
  players: SeedGamePlayer[];
}

/**
 * A seeding function bound to its own roster cache, so repeated calls with
 * the same player set reuse one roster row instead of re-querying every
 * time — and so nothing leaks between tests using their own fresh database.
 */
export function createGameSeeder() {
  const rosterCache = new Map<string, string>();

  async function getOrCreateRoster(playerIds: string[]): Promise<string> {
    const signature = rosterSignature(playerIds);
    const cached = rosterCache.get(signature);
    if (cached) return cached;

    const db = getDb();
    const existing = (
      await db.select({ id: roster.id }).from(roster).where(eq(roster.signature, signature))
    )[0];
    if (existing) {
      rosterCache.set(signature, existing.id);
      return existing.id;
    }

    const id = randomUUID();
    await db.insert(roster).values({ id, signature, size: rosterSize(playerIds) });
    for (const playerId of new Set(playerIds)) {
      await db.insert(rosterMember).values({ rosterId: id, playerId });
    }
    rosterCache.set(signature, id);
    return id;
  }

  async function getOrCreateLocation(name: string): Promise<string> {
    const db = getDb();
    const nameKey = name.trim().toLowerCase().replace(/\s+/g, " ");
    const existing = (
      await db.select({ id: location.id }).from(location).where(eq(location.nameKey, nameKey))
    )[0];
    if (existing) return existing.id;

    const id = randomUUID();
    await db.insert(location).values({
      id,
      name,
      slug: `${nameKey.replace(/\s+/g, "-")}-${id.slice(-8)}`,
      nameKey,
    });
    return id;
  }

  return async function seedGame(options: SeedGameOptions): Promise<string> {
    const db = getDb();
    const gameId = options.id ?? randomUUID();
    const createdAt = options.createdAt ?? `${options.playedOn}T00:00:00.000Z`;
    const playerIds = options.players.map((p) => p.playerId);
    const rosterId = await getOrCreateRoster(playerIds);
    const locationId = options.locationName ? await getOrCreateLocation(options.locationName) : null;

    await db.insert(game).values({
      id: gameId,
      playedOn: options.playedOn,
      createdAt,
      locationId,
      rosterId,
    });

    for (const [index, p] of options.players.entries()) {
      await db.insert(gamePlayer).values({
        gameId,
        playerId: p.playerId,
        columnOrder: index,
        finalScore: p.finalScore,
      });

      if (p.handScores) {
        let running = 0;
        for (const [handIndex, score] of p.handScores.entries()) {
          running += score;
          await db.insert(roundScore).values({
            gameId,
            playerId: p.playerId,
            hand: handIndex + 1,
            runningTotal: running,
            score,
          });
        }
      }
    }

    return gameId;
  };
}
