/**
 * The fun facts pool — PRD criteria 281–293 (Milestone 4, first slice).
 *
 * `getFunFacts()` computes over the same `game` / `game_player` /
 * `round_score` rows the records board already reads (criterion 281's own
 * instruction: "reuse the same underlying row shapes"), by reusing
 * `lib/board/queries.ts`'s `getBoardData()` — the module's actual
 * three-query fetch — rather than re-querying those tables itself.
 *
 * ⚠️ **Shared fetch, not a second one** (code review fix, Milestone 4): this
 * used to run its own independent copy of `getBoardData()`'s three queries
 * and its own copy of the same in-memory groupings, doubling the board page's
 * query count on every load. `getFunFacts()` now takes `getBoardData()`'s own
 * result as its argument — `app/page.tsx` fetches it once and passes it to
 * both this and `getBoard()` — the same "fetch once, thread it through" shape
 * `lib/players/rivalry.ts`'s `getPlayerGameFacts` already established.
 * Everything below the fetch — the eight generators in `lib/scoring/facts.ts`
 * — still runs in memory, never a per-player or per-pair query.
 *
 * ⚠️ **Nothing is cached or precomputed** (criterion 281, echoing M3's own
 * stance): every call re-derives from whatever rows it's given, so a delete,
 * an edit or a merge is reflected on the very next call, and a random pick
 * over data that's already recomputed every load costs nothing extra.
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

import { getBoardData, type BoardData } from "@/lib/board/queries";
import {
  collectiveTrivia,
  comebackNobodyAskedFor,
  currentDrought,
  flatliner,
  overdue,
  randomOldNight,
  rivalryNeedle,
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

/**
 * Every currently-true fun fact, freshly computed. `[]` for an empty archive
 * — the board shows no fact slot at all in that case (criterion 292), not an
 * empty one.
 *
 * `data` is `getBoardData()`'s own result (`lib/board/queries.ts`) — pass it
 * in when the caller already has it (the board page does, since it also
 * calls `getBoard(data)` with the same fetch); left out, this fetches it
 * itself, so every existing standalone call site (tests included) keeps
 * working unchanged, still at exactly three `db.select(...)` calls.
 *
 * ⚠️ `random` is threaded through to `randomOldNight` below purely so this
 * function keeps its own documented promise: **the pool itself is
 * deterministic**. Left at its default (`Math.random`), nothing about runtime
 * behaviour changes — `randomOldNight`'s own pick of *which* past game
 * anchors that one pool entry is exactly as random as criterion 288 asks for,
 * on top of `pickFunFact`'s separate random pick of *which fact* to show. But
 * without this parameter, `getFunFacts()` would silently touch `Math.random()`
 * on every call once the archive holds more than one game — undermining the
 * "assert the pool contains X" testing style this module's own doc comment
 * promises, not merely a style nit: it would make the pool's own contents
 * flaky across repeated calls with unchanged data, the exact failure mode
 * `pickFunFact` was split out to avoid.
 */
export async function getFunFacts(data?: BoardData, random: () => number = Math.random): Promise<FunFact[]> {
  const { gameRows, roundScoreRows, gamesById, gamePlayersByGame, winnerIdsByGame, rosterNameByGame } =
    data ?? (await getBoardData());

  if (gameRows.length === 0) return [];

  // ---------------------------------------------------------------------
  // Everything below is in-memory work over the rows above — no further
  // database access.
  // ---------------------------------------------------------------------

  const handsByGamePlayer = new Map<string, HandScoreEntry[]>();
  for (const row of roundScoreRows) {
    const key = `${row.gameId}:${row.playerId}`;
    const arr = handsByGamePlayer.get(key) ?? [];
    arr.push({ hand: row.hand, score: row.score });
    handsByGamePlayer.set(key, arr);
  }

  // This generator's own extra grouping — winning score per game — isn't
  // shared with `getBoard()`, which derives it fresh per record instead
  // (`toRecordGame`), so it's computed here rather than in `getBoardData()`.
  const winningScoreByGame = new Map<string, number>();
  for (const [gameId, rows] of gamePlayersByGame) {
    const scores: PlayerScore[] = rows.map((r) => ({ playerId: r.playerId, score: r.finalScore }));
    winningScoreByGame.set(gameId, winningScore(scores) ?? 0);
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
    randomOldNight(nightStories, random),
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
