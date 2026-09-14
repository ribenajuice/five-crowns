/**
 * A player's own distributions — PRD criteria 223, 225–226, 243.
 *
 * `getPlayerDistributions` is this module's one entry point: **one query**
 * beyond whatever `getPlayerGameFacts` (`lib/players/rivalry.ts`) already
 * cost — every `round_score` row this player has ever posted, across every
 * game they've played — then their own average, hand profile, worst hand(s)
 * and best/worst game are all worked out in memory from those rows using
 * `lib/scoring`'s pure definitions. Bounded by this player's own row count,
 * never by the size of the archive (criterion 248), the same shape
 * `lib/players/rivalry.ts` already established.
 *
 * ⚠️ **No second mean, no second "biggest/smallest" is written here**
 * (criterion 223): `averageFinalScore` is criterion 178's own function,
 * `perHandMeans` is criterion 225's, and a player's own best/worst game
 * reuses `bestGameEver`/`worstGameEver` (criteria 228–229) — the identical
 * pure functions the board and `/stats` use for the whole archive, just
 * called here with one player's own games as the entire input. A personal
 * best/worst is that same definition run over a smaller sample, not a
 * different one.
 *
 * ⚠️ **Nothing is cached** (criterion 246, restating 189/220): every export
 * here reads `game_player.final_score` and `round_score.score` at call time.
 */

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { roundScore } from "@/lib/db/schema";
import {
  averageFinalScore,
  bestGameEver,
  compareNewestFirst,
  handsBledOn,
  perHandMeans,
  worstGameEver,
  type AverageScore,
  type FinalScoreInstance,
  type HandLabel,
  type HandMean,
} from "@/lib/scoring";

import { getPlayerGameFacts, type PlayerGameFact, type PlayerRecordGame } from "./rivalry";

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

export interface PlayerExtremeGame {
  score: number;
  /** Every one of this player's own games at that score, newest first — usually one, but a repeated personal best/worst is not impossible (criteria 228–229's own tie rule, run over one player's games). */
  games: PlayerRecordGame[];
}

export interface PlayerDistributions {
  /** Criterion 223 — the same `averageFinalScore` the board and `/stats` use, `null` for a player with no games. */
  average: AverageScore | null;
  /** Criterion 225 — this player's own per-hand means, 3s through Kings. `[]` for a player with no `round_score` rows (never reachable for a real saved game). */
  handProfile: HandMean[];
  /** Criterion 226 — every hand tied for this player's own highest mean. `[]` when `handProfile` is empty. */
  worstHands: HandLabel[];
  /** Criterion 243 — this player's own lowest final score, with a link to each game it happened in. `null` for a player with no games. */
  bestGame: PlayerExtremeGame | null;
  /** Criterion 243 — same shape, the highest. */
  worstGame: PlayerExtremeGame | null;
}

/**
 * This player's own average, hand profile and best/worst game (criterion
 * 243). `gameFacts` is `getPlayerGameFacts(playerId)`'s own result — pass it
 * in when the caller already has it (the player page's populated body
 * does); left out, this fetches it itself, matching every sibling function
 * in `lib/players/rivalry.ts`.
 */
export async function getPlayerDistributions(
  playerId: string,
  gameFacts?: readonly PlayerGameFact[],
): Promise<PlayerDistributions> {
  const facts = gameFacts ?? (await getPlayerGameFacts(playerId));

  if (facts.length === 0) {
    return { average: null, handProfile: [], worstHands: [], bestGame: null, worstGame: null };
  }

  const average = averageFinalScore(facts.map((f) => f.finalScore));

  // The one query this module adds: every round_score row this player has
  // ever posted, across every game — not restricted to `facts`' game ids,
  // since that would be the same set anyway (every round_score row for this
  // player belongs to a game they played) but this reads it directly rather
  // than threading gameIds through a second `inArray`.
  const rows = await getDb()
    .select({ hand: roundScore.hand, score: roundScore.score })
    .from(roundScore)
    .where(eq(roundScore.playerId, playerId));

  const handProfile = perHandMeans(rows);
  const bled = handsBledOn(handProfile);

  const factsByGame = new Map(facts.map((f) => [f.gameId, f]));
  const instances: FinalScoreInstance[] = facts.map((f) => ({
    playerId,
    gameId: f.gameId,
    score: f.finalScore,
  }));

  function toExtreme(extreme: { score: number; instances: readonly FinalScoreInstance[] } | null): PlayerExtremeGame | null {
    if (!extreme) return null;
    return {
      score: extreme.score,
      games: extreme.instances
        .map((i) => factsByGame.get(i.gameId)!)
        .sort(compareNewestFirst)
        .map(toRecordGame),
    };
  }

  return {
    average,
    handProfile,
    worstHands: bled?.hands ?? [],
    bestGame: toExtreme(bestGameEver(instances)),
    worstGame: toExtreme(worstGameEver(instances)),
  };
}
