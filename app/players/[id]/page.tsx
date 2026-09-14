import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlayerPage } from "@/lib/players/queries";
import { AppBar } from "@/components/AppBar";
import { PlayerGameRow } from "@/components/PlayerGameRow";
import { StatBlock } from "@/components/StatBlock";
import {
  PLAYER_ZERO_GAMES_TITLE,
  STAT_LABEL_GAMES_PLAYED,
  STAT_LABEL_WINS,
  STAT_LABEL_WIN_RATE,
  formatWinRatePercent,
  playerGamesHeading,
  playerZeroGamesBody,
  statSampleCaption,
} from "@/lib/ui/copy";

/**
 * A player page — PRD criteria 133–136: name, games played/wins/win rate
 * (one decimal place, each with its sample), then that player's games newest
 * first. `notFound()` for a made-up id (criterion 130), same as the game
 * view. `docs/DESIGN-SYSTEM.md` § "Player page".
 */
export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireGroupSession();
  const { id } = await params;
  const player = await getPlayerPage(id);
  if (!player) notFound();

  return (
    <>
      <AppBar title={player.displayName} back={{ href: "/players", label: "Back to players" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-6">
          {player.gamesPlayed === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                <StatBlock label={STAT_LABEL_GAMES_PLAYED} value="0" />
              </div>
              <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
                <p className="mb-2 font-bold">{PLAYER_ZERO_GAMES_TITLE}</p>
                <p className="text-text-muted">{playerZeroGamesBody(player.displayName)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatBlock
                  label={STAT_LABEL_GAMES_PLAYED}
                  value={String(player.gamesPlayed)}
                />
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

              <div>
                <h2 className="mb-3 font-display text-lg font-bold">
                  {playerGamesHeading(player.displayName)}
                </h2>
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
          )}
        </div>
      </main>
    </>
  );
}
