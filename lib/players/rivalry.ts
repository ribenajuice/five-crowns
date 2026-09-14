/**
 * Rivalry — PRD criteria 197–212, 219–221.
 *
 * Head-to-head, nemesis, per-roster win rate and streak-in-context, all
 * gathered from one player's own point of view. `getPlayerGameFacts` is this
 * module's one entry point into the database: **two queries** (this player's
 * own games with their roster/location, and every `game_player` row for
 * those games), then head-to-head, nemesis, the by-roster breakdown and the
 * streak/drought pair are all worked out in memory from those rows using
 * `lib/scoring`'s pure definitions — never a per-opponent, per-roster or
 * per-game query in a loop (criterion 221). Bounded by this player's own
 * game count, which does not grow with the size of the archive or the size
 * of the group.
 *
 * ⚠️ **Nothing is cached** (criterion 220): every export here reads
 * `game_player.final_score` and the game/roster rows at call time, so a
 * delete, an edit or a merge (M2's own features) is reflected on the very
 * next call, exactly like `lib/board/queries.ts` and `lib/players/queries.ts`.
 */

import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { game, gamePlayer, location, player, roster } from "@/lib/db/schema";
import {
  compareDisplayNames,
  determineWinners,
  headToHead as computeHeadToHead,
  longestDrought,
  longestStreak,
  nemesis as computeNemesis,
  rosterDisplayName,
  type HeadToHeadGame,
  type NemesisCandidate,
  type NemesisResult,
  type PlayerScore,
  type Streak,
  type StreakGame,
} from "@/lib/scoring";

/** One other participant in a game this player was also in. */
interface Participant {
  playerId: string;
  displayName: string;
  finalScore: number;
}

interface PlayerGameFact {
  gameId: string;
  playedOn: string;
  createdAt: string;
  locationName: string | null;
  rosterId: string;
  rosterName: string;
  finalScore: number;
  /** Whether this player held this game's own outright lowest score (ties shared). */
  won: boolean;
  /** This game's winner(s) by display name — for the drill-through's `GameRow`. */
  winnerNames: string[];
  /** Every other participant in this game — never includes this player. */
  opponents: (Participant & { won: boolean })[];
}

/**
 * One game behind a rivalry number, in exactly `GameRowProps`'s shape
 * (`components/GameRow.tsx`) — so the frontend can pass one of these
 * straight into the existing, unmodified `GameRow`, the same convention
 * `lib/board/queries.ts`'s `RecordGame` already establishes.
 */
export interface PlayerRecordGame {
  id: string;
  playedOn: string;
  locationName: string | null;
  rosterId: string;
  rosterName: string;
  winners: string[];
}

function toRecordGame(fact: PlayerGameFact): PlayerRecordGame {
  return {
    id: fact.gameId,
    playedOn: fact.playedOn,
    locationName: fact.locationName,
    rosterId: fact.rosterId,
    rosterName: fact.rosterName,
    winners: fact.winnerNames,
  };
}

function sortNewestFirst(a: PlayerGameFact, b: PlayerGameFact): number {
  if (a.playedOn !== b.playedOn) return a.playedOn < b.playedOn ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

/**
 * This player's own games, each carrying every other participant's own
 * score and outcome — the one fetch every function below is built from.
 * `[]` for a player who exists but has no games (criterion 136's own case),
 * never an error.
 */
async function getPlayerGameFacts(playerId: string): Promise<PlayerGameFact[]> {
  const db = getDb();

  const participations = await db
    .select({ gameId: gamePlayer.gameId })
    .from(gamePlayer)
    .where(eq(gamePlayer.playerId, playerId));

  if (participations.length === 0) return [];

  const gameIds = participations.map((p) => p.gameId);

  // Query 1 of 2: this player's own games, with location and roster names.
  const gameRows = await db
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
    .innerJoin(roster, eq(game.rosterId, roster.id))
    .where(inArray(game.id, gameIds));

  // Query 2 of 2: every participant (this player and every opponent) in
  // those same games — needed to determine each game's own winner(s), which
  // "finishing above" (198) is deliberately not the same thing as.
  const participantRows = await db
    .select({
      gameId: gamePlayer.gameId,
      playerId: gamePlayer.playerId,
      displayName: player.displayName,
      finalScore: gamePlayer.finalScore,
    })
    .from(gamePlayer)
    .innerJoin(player, eq(gamePlayer.playerId, player.id))
    .where(inArray(gamePlayer.gameId, gameIds));

  const byGame = new Map<string, Participant[]>();
  for (const row of participantRows) {
    const arr = byGame.get(row.gameId) ?? [];
    arr.push({ playerId: row.playerId, displayName: row.displayName, finalScore: row.finalScore });
    byGame.set(row.gameId, arr);
  }

  return gameRows.map((g): PlayerGameFact => {
    const participants = byGame.get(g.id) ?? [];
    const scores: PlayerScore[] = participants.map((p) => ({ playerId: p.playerId, score: p.finalScore }));
    const winnerIds = new Set(determineWinners(scores));
    const mine = participants.find((p) => p.playerId === playerId)!;

    return {
      gameId: g.id,
      playedOn: g.playedOn,
      createdAt: g.createdAt,
      locationName: g.locationName,
      rosterId: g.rosterId,
      rosterName: g.rosterName ?? rosterDisplayName(participants.map((p) => p.displayName)),
      finalScore: mine.finalScore,
      won: winnerIds.has(playerId),
      winnerNames: participants.filter((p) => winnerIds.has(p.playerId)).map((p) => p.displayName),
      opponents: participants
        .filter((p) => p.playerId !== playerId)
        .map((p) => ({ ...p, won: winnerIds.has(p.playerId) })),
    };
  });
}

/* --------------------------------------------------- head-to-head (197-198, 203-206) */

export interface HeadToHeadRow {
  opponentId: string;
  displayName: string;
  gamesTogether: number;
  /** This player's wins in the games both played (M1's win, ties shared) — criterion 197. */
  wins: number;
  /** The opponent's wins in the same games. */
  opponentWins: number;
  /** This player's win rate across those games, a fraction 0–1 — format with `formatWinRatePercent`. */
  winRate: number;
  /** The opponent's win rate, mirrored, same fraction convention. */
  opponentWinRate: number;
  /** This player's rate of finishing above the opponent (198), a fraction 0–1. */
  aboveRate: number;
  /** The opponent's rate of finishing above this player — the number nemesis (199) is built on. */
  opponentAboveRate: number;
  /** Exactly the games both players played, newest first (criterion 204). */
  games: PlayerRecordGame[];
}

/**
 * Every opponent this player has shared at least one game with, one row
 * each (criterion 203). `[]` for a player with no shared games — the
 * section's own empty state, not a missing section. Ordered by games
 * together descending, then alphabetically, matching criterion 203's own
 * wording.
 *
 * Built on `headToHead` (`lib/scoring`), one call per opponent over rows
 * already fetched — never a second query per opponent (criterion 221). The
 * same call from A's page and from B's page reads mirrored input, so
 * criterion 205 ("the same pair reads the same from either side") holds by
 * construction, not by convention.
 */
export async function getPlayerHeadToHead(playerId: string): Promise<HeadToHeadRow[]> {
  const facts = await getPlayerGameFacts(playerId);

  const byOpponent = new Map<
    string,
    { displayName: string; facts: PlayerGameFact[]; games: HeadToHeadGame[] }
  >();
  for (const fact of facts) {
    for (const opponent of fact.opponents) {
      const entry = byOpponent.get(opponent.playerId) ?? {
        displayName: opponent.displayName,
        facts: [],
        games: [],
      };
      entry.facts.push(fact);
      entry.games.push({
        gameId: fact.gameId,
        aWon: fact.won,
        bWon: opponent.won,
        aScore: fact.finalScore,
        bScore: opponent.finalScore,
      });
      byOpponent.set(opponent.playerId, entry);
    }
  }

  const rows: HeadToHeadRow[] = [];
  for (const [opponentId, entry] of byOpponent) {
    const h2h = computeHeadToHead(entry.games);
    rows.push({
      opponentId,
      displayName: entry.displayName,
      gamesTogether: h2h.gamesTogether,
      wins: h2h.a.wins,
      opponentWins: h2h.b.wins,
      winRate: h2h.a.winRate,
      opponentWinRate: h2h.b.winRate,
      aboveRate: h2h.a.aboveRate,
      opponentAboveRate: h2h.b.aboveRate,
      games: [...entry.facts].sort(sortNewestFirst).map(toRecordGame),
    });
  }

  return rows.sort((a, b) => {
    if (a.gamesTogether !== b.gamesTogether) return b.gamesTogether - a.gamesTogether;
    return compareDisplayNames(a.displayName, b.displayName);
  });
}

/* --------------------------------------------------------------- nemesis (199-201, 206) */

/**
 * Nemesis, derived from head-to-head rows already fetched — **no second
 * database round trip** for the same data. Prefer this over
 * `getPlayerNemesis` whenever the page has already called
 * `getPlayerHeadToHead` (criterion 206: nemesis sits beside the head-to-head
 * rows it is computed from).
 */
export function nemesisFromHeadToHead(rows: readonly HeadToHeadRow[]): NemesisResult {
  const candidates: NemesisCandidate[] = rows.map((r) => ({
    playerId: r.opponentId,
    displayName: r.displayName,
    aboveRate: r.opponentAboveRate,
    gamesTogether: r.gamesTogether,
  }));
  return computeNemesis(candidates);
}

/**
 * Standalone convenience wrapper — fetches head-to-head itself. Equivalent
 * to `nemesisFromHeadToHead(await getPlayerHeadToHead(playerId))`; useful for
 * a caller that only wants the nemesis and nothing else, at the cost of its
 * own pair of queries.
 */
export async function getPlayerNemesis(playerId: string): Promise<NemesisResult> {
  return nemesisFromHeadToHead(await getPlayerHeadToHead(playerId));
}

/* -------------------------------------------------- win rate per roster (207-210) */

export interface PlayerRosterStat {
  rosterId: string;
  rosterName: string;
  gamesPlayed: number;
  wins: number;
  /**
   * A fraction 0–1 — the identical figure `RosterPageMember.winRate`
   * (`lib/rosters/queries.ts`) already computes for this player in this
   * roster (criterion 209), because both read the same `determineWinners`
   * outcome over the same game rows: a roster's games are, by construction,
   * every game whose own participant set exactly equals that roster's
   * members (`lib/games/save.ts`'s `upsertRoster`), so grouping this
   * player's own games by `rosterId` **is** that roster's game list restricted
   * to this player, gathered rather than rebuilt (spec decision 15).
   */
  winRate: number;
}

/**
 * One row per **exact** roster this player has played in (criterion 208).
 * `[]` for a player with no games. ⚠️ **Exact sets only** (criterion 210):
 * every game has exactly one `rosterId`, so grouping by it partitions this
 * player's games with no overlap and no gap — the by-roster rows' own
 * `gamesPlayed` therefore always sum to exactly `getPlayerPage`'s
 * `gamesPlayed` for the same player (criterion 207), which is the provable
 * invariant criterion 210 asks QA to check.
 */
export async function getPlayerRosterStats(playerId: string): Promise<PlayerRosterStat[]> {
  const facts = await getPlayerGameFacts(playerId);

  const byRoster = new Map<string, { rosterName: string; gamesPlayed: number; wins: number }>();
  for (const fact of facts) {
    const entry = byRoster.get(fact.rosterId) ?? { rosterName: fact.rosterName, gamesPlayed: 0, wins: 0 };
    entry.gamesPlayed += 1;
    if (fact.won) entry.wins += 1;
    byRoster.set(fact.rosterId, entry);
  }

  return [...byRoster.entries()]
    .map(([rosterId, r]) => ({
      rosterId,
      rosterName: r.rosterName,
      gamesPlayed: r.gamesPlayed,
      wins: r.wins,
      winRate: r.gamesPlayed > 0 ? r.wins / r.gamesPlayed : 0,
    }))
    .sort((a, b) => compareDisplayNames(a.rosterName, b.rosterName));
}

/* --------------------------------------------------------- streaks, in context (211-212) */

export interface PlayerStreakDetail {
  /** The longest ever recorded — not the run they're on now (criteria 177, 212). */
  length: number;
  /** Oldest → newest, the order the run was actually played in — the one deliberate exception to newest-first, matching `lib/board/queries.ts`'s own streak drill-through. */
  games: PlayerRecordGame[];
}

export interface PlayerStreaks {
  /** Criterion 211 — Stage 1's `longestStreak`, unchanged, just exposed per-player here. */
  longestWinningStreak: PlayerStreakDetail;
  /** Criterion 212 — the same machinery negated (`longestDrought`). */
  drought: PlayerStreakDetail;
}

/**
 * This player's longest winning streak and longest drought, both ever
 * recorded. Reuses `longestStreak` (criterion 177's own function, never a
 * second implementation) and `longestDrought` (its documented negation) over
 * this player's own games.
 */
export async function getPlayerStreaks(playerId: string): Promise<PlayerStreaks> {
  const facts = await getPlayerGameFacts(playerId);
  const factsByGameId = new Map(facts.map((f) => [f.gameId, f]));
  const streakGames: StreakGame[] = facts.map((f) => ({
    gameId: f.gameId,
    playedOn: f.playedOn,
    createdAt: f.createdAt,
    won: f.won,
  }));

  function toDetail(streak: Streak): PlayerStreakDetail {
    return {
      length: streak.length,
      games: streak.gameIds.map((id) => toRecordGame(factsByGameId.get(id)!)),
    };
  }

  return {
    longestWinningStreak: toDetail(longestStreak(streakGames)),
    drought: toDetail(longestDrought(streakGames)),
  };
}
