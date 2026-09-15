import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlayerDistributions } from "@/lib/players/distributions";
import { getPlayerPage, type PlayerPage as PlayerPageData } from "@/lib/players/queries";
import {
  getPlayerGameFacts,
  getPlayerHeadToHead,
  getPlayerRosterStats,
  getPlayerStreaks,
  getPlayerVenueStats,
  nemesisFromHeadToHead,
  type HeadToHeadRow as HeadToHeadRowData,
} from "@/lib/players/rivalry";
import { rosterDisplayName } from "@/lib/scoring";
import { AppBar } from "@/components/AppBar";
import { Banner } from "@/components/Banner";
import { ButtonLink } from "@/components/Button";
import { ByRosterRow } from "@/components/ByRosterRow";
import { ByVenueRow } from "@/components/ByVenueRow";
import { GameRow } from "@/components/GameRow";
import { HandTrendBars } from "@/components/HandTrendBars";
import { HeadToHeadRow } from "@/components/HeadToHeadRow";
import { NemesisCard } from "@/components/NemesisCard";
import { PersonalGameCard } from "@/components/PersonalGameCard";
import { PersonalRecordCard } from "@/components/PersonalRecordCard";
import { PlayerGameRow } from "@/components/PlayerGameRow";
import { StatBlock } from "@/components/StatBlock";
import {
  MERGE_ENTRY_POINT_LABEL,
  MERGE_SUCCESS_TITLE,
  NEMESIS_CARD_TITLE,
  NO_LOCATION_ROW,
  PERSONAL_GAME_CARD_BEST_LABEL,
  PERSONAL_GAME_CARD_WORST_LABEL,
  PERSONAL_RECORD_DROUGHT_TITLE,
  PERSONAL_RECORD_DROUGHT_UNIT,
  PERSONAL_RECORD_STREAK_TITLE,
  PERSONAL_RECORD_STREAK_UNIT,
  PLAYER_AVERAGE_FINAL_SCORE_LABEL,
  PLAYER_BEST_WORST_GAME_HEADING,
  PLAYER_BY_ROSTER_HEADING,
  PLAYER_BY_ROSTER_SAMPLE_LINE,
  PLAYER_BY_VENUE_HEADING,
  PLAYER_BY_VENUE_SAMPLE_LINE,
  PLAYER_HAND_PROFILE_HEADING,
  PLAYER_HEAD_TO_HEAD_EMPTY_SENTENCE,
  PLAYER_HEAD_TO_HEAD_HEADING,
  PLAYER_HEAD_TO_HEAD_SAMPLE_LINE,
  PLAYER_STREAK_SECTION_HEADING,
  PLAYER_ZERO_GAMES_TITLE,
  STAT_LABEL_GAMES_PLAYED,
  STAT_LABEL_WINS,
  STAT_LABEL_WIN_RATE,
  drillThroughHeading,
  formatRecordDate,
  formatWinRatePercent,
  headToHeadDrillThroughHeading,
  headToHeadTogetherCaption,
  mergeSuccessBodyPlayer,
  nemesisDetailSentence,
  playerGamesHeading,
  playerHandProfileSampleLine,
  playerZeroGamesBody,
  recordSampleLine,
  rosterFoldNote,
  statSampleCaption,
} from "@/lib/ui/copy";

/**
 * A player page — PRD criteria 130, 133–136, 155, extended by M3 Stage 2
 * (criteria 203–212) with three more sections: head-to-head, nemesis, by
 * roster and streak-in-context, all between the merge button and the
 * player's own games list. `notFound()` for a made-up id (criterion 130),
 * same as the game view. `docs/DESIGN-SYSTEM.md` § "Player page".
 *
 * ⚠️ **No new page type, no `/vs/` route** (criterion 203, spec decision 11):
 * every drill-through this stage adds — a head-to-head pair's shared games, a
 * personal streak or drought's own games — is reached via a query string on
 * this exact route (`?opponent=`, `?streak=`), the same route the ordinary
 * page renders from, rather than a dedicated comparison screen with a
 * picker. This mirrors `?merged=`'s existing use on this same page for the
 * one-time merge banner: a query param selecting a rendering, never a new
 * resource, and it keeps every link a player could tap already known ahead
 * of time from `getPlayerHeadToHead`/`getPlayerStreaks` — never an
 * everyone-against-everyone matrix a picker would need.
 */
export const dynamic = "force-dynamic";

interface PlayerPageSearchParams {
  merged?: string;
  foldedRoster?: string;
  /** A head-to-head opponent's id — renders that pair's shared-games drill-through. */
  opponent?: string;
  /** "winning" or "drought" — renders that personal record's own drill-through. */
  streak?: string;
}

/** The head-to-head drill-through (criterion 204): exactly the games both
 *  players played, newest first, under a heading naming both and stating the
 *  sample. A made-up opponent id 404s, same "nothing to drill into" precedent
 *  as `/records/[key]`. */
async function renderHeadToHeadDrillThrough(
  playerId: string,
  playerName: string,
  opponentId: string,
) {
  const rows = await getPlayerHeadToHead(playerId);
  const row = rows.find((r) => r.opponentId === opponentId);
  if (!row) notFound();

  return (
    <>
      <AppBar
        title={headToHeadDrillThroughHeading(playerName, row.displayName)}
        context={headToHeadTogetherCaption(row.gamesTogether)}
        back={{ href: `/players/${playerId}`, label: `Back to ${playerName}'s page` }}
      />
      <main className="mx-auto w-full max-w-wide px-4 py-6">
        <div className="flex flex-col gap-2">
          {row.games.map((g) => (
            <GameRow
              key={g.id}
              id={g.id}
              playedOn={g.playedOn}
              locationName={g.locationName}
              rosterId={g.rosterId}
              rosterName={g.rosterName}
              winners={g.winners}
            />
          ))}
        </div>
      </main>
    </>
  );
}

/** The personal streak/drought drill-through (criteria 211–212): oldest →
 *  newest, the one deliberate exception to "newest first," identical
 *  reasoning to Stage 1's own streak drill-through. No qualifying games (a
 *  streak or drought of 0) 404s — there is nothing to drill into. */
async function renderPersonalStreakDrillThrough(
  playerId: string,
  playerName: string,
  which: "winning" | "drought",
) {
  const streaks = await getPlayerStreaks(playerId);
  const detail = which === "winning" ? streaks.longestWinningStreak : streaks.drought;
  if (detail.games.length === 0) notFound();

  const title = which === "winning" ? PERSONAL_RECORD_STREAK_TITLE : PERSONAL_RECORD_DROUGHT_TITLE;
  const unit = which === "winning" ? PERSONAL_RECORD_STREAK_UNIT : PERSONAL_RECORD_DROUGHT_UNIT;

  return (
    <>
      <AppBar
        title={drillThroughHeading(title, playerName)}
        context={`${detail.length} ${unit}`}
        back={{ href: `/players/${playerId}`, label: `Back to ${playerName}'s page` }}
      />
      <main className="mx-auto w-full max-w-wide px-4 py-6">
        <div className="flex flex-col gap-2">
          {detail.games.map((g) => (
            <GameRow
              key={g.id}
              id={g.id}
              playedOn={g.playedOn}
              locationName={g.locationName}
              rosterId={g.rosterId}
              rosterName={g.rosterName}
              winners={g.winners}
            />
          ))}
        </div>
      </main>
    </>
  );
}

interface NemesisFacts {
  opponentName: string | null;
  detail: string | null;
  href: string | null;
}

/** The nemesis card's own display facts (criteria 199–201, 206), built from
 *  head-to-head rows already fetched — never a second query for the same
 *  data. Links to the (alphabetically) first joint holder's own head-to-head
 *  row when more than one opponent ties on the highest above-rate. */
function nemesisFacts(playerId: string, rows: readonly HeadToHeadRowData[]): NemesisFacts {
  const result = nemesisFromHeadToHead(rows);
  if (result.holders.length === 0 || result.aboveRatePercent === null) {
    return { opponentName: null, detail: null, href: null };
  }

  const opponentName = rosterDisplayName(result.holders.map((h) => h.displayName));
  const primaryRow = rows.find((r) => r.opponentId === result.holders[0]!.playerId)!;

  // Every joint holder shares the same above-rate percent (criterion 199) but
  // can have different raw counts and samples — each is stated in full rather
  // than presenting one opponent's numbers as though they applied to both.
  const sentences = result.holders.map((holder) => {
    const row = rows.find((r) => r.opponentId === holder.playerId)!;
    const above = Math.round(row.opponentAboveRate * row.gamesTogether);
    const sentence = nemesisDetailSentence(above, row.gamesTogether, result.aboveRatePercent!);
    if (result.holders.length === 1) return sentence;
    return `${holder.displayName} ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  });

  return {
    opponentName,
    detail: sentences.join(" "),
    href: `/players/${playerId}?opponent=${primaryRow.opponentId}`,
  };
}

/**
 * The populated player page's own body (criteria 133–136, 203–212): the
 * headline stat grid (unchanged since M2), the merge entry point, then the
 * three new rivalry sections, then this player's own games list.
 *
 * `getPlayerGameFacts` is fetched exactly once here and threaded through to
 * all three rivalry functions below — each of them would otherwise re-fetch
 * the same rows itself, tripling the query count for no reason (the same
 * "fetch once, compute several things from the one result" shape
 * `lib/board/queries.ts`'s `getBoard()` already uses).
 */
async function renderPopulatedBody(playerId: string, player: PlayerPageData) {
  const facts = await getPlayerGameFacts(playerId);
  const [headToHeadRows, rosterStats, streaks, distributions, venueStats] = await Promise.all([
    getPlayerHeadToHead(playerId, facts),
    getPlayerRosterStats(playerId, facts),
    getPlayerStreaks(playerId, facts),
    getPlayerDistributions(playerId, facts),
    getPlayerVenueStats(playerId, facts),
  ]);
  const nemesis = nemesisFacts(playerId, headToHeadRows);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <StatBlock label={STAT_LABEL_GAMES_PLAYED} value={String(player.gamesPlayed)} />
        <StatBlock
          label={STAT_LABEL_WINS}
          value={String(player.wins)}
          sample={statSampleCaption(player.wins, player.gamesPlayed)}
        />
        <StatBlock
          label={STAT_LABEL_WIN_RATE}
          value={formatWinRatePercent(player.winRate ?? 0)}
          sample={statSampleCaption(player.wins, player.gamesPlayed)}
        />
      </div>

      <ButtonLink href={`/players/${playerId}/merge`} variant="ghost" fullWidth>
        {MERGE_ENTRY_POINT_LABEL}
      </ButtonLink>

      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_HEAD_TO_HEAD_HEADING}</h2>
        {headToHeadRows.length === 0 ? (
          <p className="text-text-muted">{PLAYER_HEAD_TO_HEAD_EMPTY_SENTENCE}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {headToHeadRows.map((row) => (
                <HeadToHeadRow
                  key={row.opponentId}
                  opponentName={row.displayName}
                  gamesTogether={row.gamesTogether}
                  wins={row.wins}
                  opponentWins={row.opponentWins}
                  winRate={row.winRate}
                  opponentAboveRate={row.opponentAboveRate}
                  href={`/players/${playerId}?opponent=${row.opponentId}`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-text-muted">{PLAYER_HEAD_TO_HEAD_SAMPLE_LINE}</p>
          </>
        )}
      </div>

      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{NEMESIS_CARD_TITLE}</h2>
        <NemesisCard opponentName={nemesis.opponentName} detail={nemesis.detail} href={nemesis.href} />
      </div>

      {rosterStats.length > 0 ? (
        <div>
          <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_BY_ROSTER_HEADING}</h2>
          <p className="mb-2 text-sm text-text-muted">{PLAYER_BY_ROSTER_SAMPLE_LINE}</p>
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <ul>
              {rosterStats.map((r) => (
                <ByRosterRow
                  key={r.rosterId}
                  rosterId={r.rosterId}
                  rosterName={r.rosterName}
                  gamesPlayed={r.gamesPlayed}
                  wins={r.wins}
                  winRate={r.winRate}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 font-display text-lg font-bold">{PLAYER_STREAK_SECTION_HEADING}</h2>
        <div className="grid grid-cols-2 gap-2">
          <PersonalRecordCard
            title={PERSONAL_RECORD_STREAK_TITLE}
            value={String(streaks.longestWinningStreak.length)}
            unit={PERSONAL_RECORD_STREAK_UNIT}
            href={
              streaks.longestWinningStreak.games.length > 0
                ? `/players/${playerId}?streak=winning`
                : null
            }
            claim={`${PERSONAL_RECORD_STREAK_TITLE}: ${player.displayName}, ${streaks.longestWinningStreak.length} ${PERSONAL_RECORD_STREAK_UNIT}`}
          />
          <PersonalRecordCard
            title={PERSONAL_RECORD_DROUGHT_TITLE}
            value={String(streaks.drought.length)}
            unit={PERSONAL_RECORD_DROUGHT_UNIT}
            href={streaks.drought.games.length > 0 ? `/players/${playerId}?streak=drought` : null}
            claim={`${PERSONAL_RECORD_DROUGHT_TITLE}: ${player.displayName}, ${streaks.drought.length} ${PERSONAL_RECORD_DROUGHT_UNIT}`}
          />
        </div>
      </div>

      {/*
       * M3 Stage 3 (criterion 243): average final score, the eleven-hand
       * profile and this player's own best/worst game — appended below
       * every one of Stage 2's sections above, nothing above them moves or
       * is re-explained. A one-game player still shows every one of these
       * three, with "1 game" or that game's own date beside it (criterion
       * 245: no floor, nobody set aside), since `distributions` is only
       * ever the empty shape for a *zero*-game player, and this whole
       * function only runs once `player.gamesPlayed > 0`.
       */}
      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_AVERAGE_FINAL_SCORE_LABEL}</h2>
        <div className="max-w-[220px]">
          <StatBlock
            label={PLAYER_AVERAGE_FINAL_SCORE_LABEL}
            value={distributions.average ? distributions.average.average.toFixed(1) : "–"}
            sample={
              distributions.average
                ? recordSampleLine([
                    { displayName: player.displayName, gamesPlayed: distributions.average.gamesPlayed },
                  ])
                : undefined
            }
          />
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_HAND_PROFILE_HEADING}</h2>
        <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <p className="mb-3 text-sm text-text-muted">
            {playerHandProfileSampleLine(distributions.average?.gamesPlayed ?? 0)}
          </p>
          <HandTrendBars hands={distributions.handProfile} worstHands={distributions.worstHands} />
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_BEST_WORST_GAME_HEADING}</h2>
        <div className="grid grid-cols-2 gap-2">
          {distributions.bestGame ? (
            <PersonalGameCard
              label={PERSONAL_GAME_CARD_BEST_LABEL}
              score={distributions.bestGame.score}
              date={formatRecordDate(distributions.bestGame.games[0]!.playedOn)}
              href={`/games/${distributions.bestGame.games[0]!.id}`}
              claim={`${PERSONAL_GAME_CARD_BEST_LABEL}: ${distributions.bestGame.score}, ${formatRecordDate(
                distributions.bestGame.games[0]!.playedOn,
              )}`}
            />
          ) : null}
          {distributions.worstGame ? (
            <PersonalGameCard
              label={PERSONAL_GAME_CARD_WORST_LABEL}
              score={distributions.worstGame.score}
              date={formatRecordDate(distributions.worstGame.games[0]!.playedOn)}
              href={`/games/${distributions.worstGame.games[0]!.id}`}
              claim={`${PERSONAL_GAME_CARD_WORST_LABEL}: ${distributions.worstGame.score}, ${formatRecordDate(
                distributions.worstGame.games[0]!.playedOn,
              )}`}
            />
          ) : null}
        </div>
      </div>

      {/*
       * M3 Stage 4 (criteria 256–258): "By venue" — directly below Stage 3's
       * "Best and worst game" section, above this player's own games list,
       * so nothing above it moves. Always rendered (never a missing
       * section): `venueStats` always carries at least the "No location"
       * row, even for a player whose only games have no location.
       */}
      <div>
        <h2 className="mb-1 font-display text-lg font-bold">{PLAYER_BY_VENUE_HEADING}</h2>
        <p className="mb-2 text-sm text-text-muted">{PLAYER_BY_VENUE_SAMPLE_LINE}</p>
        <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <ul>
            {venueStats.map((v) => (
              <ByVenueRow
                key={v.locationId ?? "no-location"}
                locationId={v.locationId}
                locationName={v.locationName ?? NO_LOCATION_ROW}
                gamesPlayed={v.gamesPlayed}
                wins={v.wins}
                winRate={v.winRate}
                average={v.average}
              />
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">{playerGamesHeading(player.displayName)}</h2>
        <div className="flex flex-col gap-2">
          {player.games.map((g) => (
            <PlayerGameRow
              key={g.gameId}
              gameId={g.gameId}
              playedOn={g.playedOn}
              locationName={g.locationName}
              rosterId={g.rosterId}
              rosterName={g.rosterName}
              finalScore={g.finalScore}
              isWinner={g.isWinner}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<PlayerPageSearchParams>;
}) {
  await requireGroupSession();
  const { id } = await params;
  const { merged, foldedRoster, opponent, streak } = await searchParams;
  const player = await getPlayerPage(id);
  if (!player) notFound();

  if (opponent) {
    return renderHeadToHeadDrillThrough(id, player.displayName, opponent);
  }
  if (streak === "winning" || streak === "drought") {
    return renderPersonalStreakDrillThrough(id, player.displayName, streak);
  }

  return (
    <>
      <AppBar title={player.displayName} back={{ href: "/players", label: "Back to players" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-6">
          {merged ? (
            <Banner tone="ok" title={MERGE_SUCCESS_TITLE}>
              {mergeSuccessBodyPlayer(merged, player.displayName)}
              {foldedRoster ? ` ${rosterFoldNote(foldedRoster)}` : ""}
            </Banner>
          ) : null}

          {player.gamesPlayed === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                <StatBlock label={STAT_LABEL_GAMES_PLAYED} value="0" />
              </div>
              <ButtonLink href={`/players/${player.id}/merge`} variant="ghost" fullWidth>
                {MERGE_ENTRY_POINT_LABEL}
              </ButtonLink>
              <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
                <p className="mb-2 font-bold">{PLAYER_ZERO_GAMES_TITLE}</p>
                <p className="text-text-muted">{playerZeroGamesBody(player.displayName)}</p>
              </div>
            </>
          ) : (
            await renderPopulatedBody(id, player)
          )}
        </div>
      </main>
    </>
  );
}
