/**
 * The fun facts pool — PRD criteria 281–293 (Milestone 4, first slice).
 *
 * `getFunFacts()` is this feature's one entry point into the database:
 * **exactly three `db.select(...)` calls**, mirroring `getBoard()`'s own
 * bounded-query proof (`lib/board/queries.ts`) — the same `game` /
 * `game_player` / `round_score` rows that screen already reads, since this
 * feature computes over the identical data (criterion 281's own instruction:
 * "reuse the same underlying row shapes"). Everything else — the eight
 * generators in `lib/scoring/facts.ts` — runs in memory over those three row
 * sets, never a per-player or per-pair query.
 *
 * ⚠️ **Nothing is cached or precomputed** (criterion 281, echoing M3's own
 * stance): every call re-fetches and re-derives from scratch, so a delete, an
 * edit or a merge is reflected on the very next call, and a random pick over
 * data that's already recomputed every load costs nothing extra.
 *
 * ⚠️ **Where "pick one at random" lives**: deliberately **not** in this
 * function. `getFunFacts()` returns every currently-true fact — a small,
 * fully deterministic array, exhaustively unit-testable without ever
 * asserting on `Math.random()`. `pickFunFact()` below is a separate,
 * one-line pure helper that the board page calls immediately before
 * rendering, right at the point criterion 281 actually needs a random choice
 * ("shows exactly one, chosen at random... refresh the page, get another").
 * Keeping the pick out of `getFunFacts()` means the pool's own tests assert
 * "the pool contains X" rather than "the pool, run 1000 times, contains X
 * about the right proportion of the time".
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster, roundScore } from "@/lib/db/schema";
import {
  collectiveTrivia,
  comebackNobodyAskedFor,
  currentDrought,
  determineWinners,
  flatliner,
  overdue,
  randomOldNight,
  rivalryNeedle,
  rosterDisplayName,
  slump,
  winningScore,
  type ArchiveGame,
  type FunFact,
  type HandScoreEntry,
  type HeadToHeadGame,
  type NightStory,
  type PlayerGameSummary,
  type PlayerScore,
} from "@/lib/scoring";

interface GameRow {
  id: string;
  playedOn: string;
  createdAt: string;
  locationName: string | null;
  rosterId: string;
  rosterName: string | null;
}

interface GamePlayerRow {
  gameId: string;
  playerId: string;
  displayName: string;
  columnOrder: number;
  finalScore: number;
}

interface RoundScoreRow {
  gameId: string;
  playerId: string;
  hand: number;
  score: number;
}

/**
 * Every currently-true fun fact, freshly computed. `[]` for an empty archive
 * — the board shows no fact slot at all in that case (criterion 292), not an
 * empty one.
 */
export async function getFunFacts(): Promise<FunFact[]> {
  const db = getDb();

  // Query 1 of 3: every game, with its location and roster names attached —
  // identical shape to `getBoard()`'s own first query.
  const gameRows: GameRow[] = await db
    .select({
      id: game.id,
      playedOn: game.playedOn,
      createdAt: game.createdAt,
      locationName: location.name,
      rosterId: game.rosterId,
      rosterName: roster.name,
    })
    .from(game)
    .leftJoin(location, eq(game.locationId, location.id))
    .innerJoin(roster, eq(game.rosterId, roster.id));

  if (gameRows.length === 0) return [];

  // Queries 2 and 3 of 3: every game_player row (with display names and
  // column order attached) and every round_score row in the archive. Neither
  // depends on the other's result, so they run concurrently — same pattern
  // `getBoard()` uses for its own two independent queries.
  const [gamePlayerRows, roundScoreRows]: [GamePlayerRow[], RoundScoreRow[]] = await Promise.all([
    db
      .select({
        gameId: gamePlayer.gameId,
        playerId: gamePlayer.playerId,
        displayName: player.displayName,
        columnOrder: gamePlayer.columnOrder,
        finalScore: gamePlayer.finalScore,
      })
      .from(gamePlayer)
      .innerJoin(player, eq(gamePlayer.playerId, player.id)),
    db
      .select({
        gameId: roundScore.gameId,
        playerId: roundScore.playerId,
        hand: roundScore.hand,
        score: roundScore.score,
      })
      .from(roundScore),
  ]);

  // ---------------------------------------------------------------------
  // Everything below is in-memory work over the three row sets above — no
  // further database access.
  // ---------------------------------------------------------------------

  const gamesById = new Map(gameRows.map((g) => [g.id, g]));

  const gamePlayersByGame = new Map<string, GamePlayerRow[]>();
  for (const row of gamePlayerRows) {
    const arr = gamePlayersByGame.get(row.gameId) ?? [];
    arr.push(row);
    gamePlayersByGame.set(row.gameId, arr);
  }

  const handsByGamePlayer = new Map<string, HandScoreEntry[]>();
  for (const row of roundScoreRows) {
    const key = `${row.gameId}:${row.playerId}`;
    const arr = handsByGamePlayer.get(key) ?? [];
    arr.push({ hand: row.hand, score: row.score });
    handsByGamePlayer.set(key, arr);
  }

  // Each game's winner(s), winning score and effective roster name, computed
  // once and reused by every generator that needs them.
  const winnerIdsByGame = new Map<string, string[]>();
  const winningScoreByGame = new Map<string, number>();
  const rosterNameByGame = new Map<string, string>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    winnerIdsByGame.set(gameId, determineWinners(scores));
    winningScoreByGame.set(gameId, winningScore(scores) ?? 0);
    const g = gamesById.get(gameId)!;
    rosterNameByGame.set(gameId, g.rosterName ?? rosterDisplayName(rows.map((r) => r.displayName)));
  }

  // ---- lib/scoring/facts.ts's one shared row shape, built once, reused by
  // the flatliner, current drought, the comeback and the slump.
  const playerGameSummaries: PlayerGameSummary[] = [];
  for (const [gameId, rows] of gamePlayersByGame) {
    const g = gamesById.get(gameId)!;
    const winnerIds = new Set(winnerIdsByGame.get(gameId));
    for (const row of rows) {
      playerGameSummaries.push({
        gameId,
        playerId: row.playerId,
        displayName: row.displayName,
        playedOn: g.playedOn,
        createdAt: g.createdAt,
        won: winnerIds.has(row.playerId),
        finalScore: row.finalScore,
        hands: handsByGamePlayer.get(`${gameId}:${row.playerId}`) ?? [],
      });
    }
  }

  // ---- overdue (287): archive-wide, shared-win-tagged games.
  const archiveGames: ArchiveGame[] = gameRows.map((g) => ({
    gameId: g.id,
    playedOn: g.playedOn,
    createdAt: g.createdAt,
    isSharedWin: (winnerIdsByGame.get(g.id) ?? []).length > 1,
  }));

  // ---- rivalry needle (286): every unordered pair of players who've shared
  // at least one game, with their own head-to-head game list.
  interface MutablePairGames {
    aId: string;
    aDisplayName: string;
    bId: string;
    bDisplayName: string;
    games: HeadToHeadGame[];
  }

  const pairsByKey = new Map<string, MutablePairGames>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const winnerIds = new Set(winnerIdsByGame.get(gameId));
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const rowA = rows[i]!;
        const rowB = rows[j]!;
        // Ordered by player id, not insertion order, so the same pair always
        // accumulates under the same key regardless of which game found it first.
        const [first, second] = rowA.playerId < rowB.playerId ? [rowA, rowB] : [rowB, rowA];
        const key = `${first.playerId}:${second.playerId}`;
        const entry = pairsByKey.get(key) ?? {
          aId: first.playerId,
          aDisplayName: first.displayName,
          bId: second.playerId,
          bDisplayName: second.displayName,
          games: [],
        };
        entry.games.push({
          gameId,
          aWon: winnerIds.has(first.playerId),
          bWon: winnerIds.has(second.playerId),
          aScore: first.finalScore,
          bScore: second.finalScore,
        });
        pairsByKey.set(key, entry);
      }
    }
  }

  // ---- a random old night (288): every game's full story.
  const nightStories: NightStory[] = gameRows.map((g) => {
    const rows = [...(gamePlayersByGame.get(g.id) ?? [])].sort((a, b) => a.columnOrder - b.columnOrder);
    const winnerIds = new Set(winnerIdsByGame.get(g.id));
    return {
      gameId: g.id,
      playedOn: g.playedOn,
      locationName: g.locationName,
      rosterName: rosterNameByGame.get(g.id)!,
      players: rows.map((r) => ({ displayName: r.displayName, finalScore: r.finalScore })),
      winners: rows.filter((r) => winnerIds.has(r.playerId)).map((r) => r.displayName),
      winningScore: winningScoreByGame.get(g.id)!,
    };
  });

  // ---------------------------------------------------------------------
  // Run every generator; keep only the ones that returned a fact.
  // ---------------------------------------------------------------------
  const facts: (FunFact | null)[] = [
    flatliner(playerGameSummaries),
    currentDrought(playerGameSummaries),
    comebackNobodyAskedFor(playerGameSummaries),
    slump(playerGameSummaries),
    rivalryNeedle([...pairsByKey.values()]),
    overdue(archiveGames),
    randomOldNight(nightStories),
    collectiveTrivia(gameRows.length),
  ];

  return facts.filter((fact): fact is FunFact => fact !== null);
}

/**
 * Picks one fact at random from the pool (criterion 281's "shows exactly
 * one, chosen at random") — the one piece of randomness this feature has,
 * deliberately kept out of `getFunFacts()` itself (see module doc comment
 * above). Callers pass the same array `getFunFacts()` returned; `random` is
 * injectable for tests, defaulting to `Math.random`.
 *
 * `null` for an empty pool — an empty archive, or (defensively) an archive
 * where no generator happened to return a fact, which criterion 288's
 * "random old night" already rules out for any non-empty archive in practice.
 */
export function pickFunFact(facts: readonly FunFact[], random: () => number = Math.random): FunFact | null {
  if (facts.length === 0) return null;
  const index = Math.min(Math.floor(random() * facts.length), facts.length - 1);
  return facts[index]!;
}
