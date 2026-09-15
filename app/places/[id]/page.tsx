import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getVenuePage } from "@/lib/locations/queries";
import { AppBar } from "@/components/AppBar";
import { GameRow } from "@/components/GameRow";
import { StatBlock } from "@/components/StatBlock";
import { VenuePlayerRow } from "@/components/VenuePlayerRow";
import {
  NO_DATA_VALUE,
  ROSTER_TABLE_AVERAGE_LABEL,
  STAT_LABEL_GAMES_PLAYED,
  VENUE_PAGE_BACK_LABEL,
  VENUE_PLAYERS_HEADING,
  VENUE_ZERO_GAMES_TITLE,
  rosterAverageSampleCaption,
  venueGamesHeading,
  venuePlayersSampleLine,
  venueZeroGamesBody,
} from "@/lib/ui/copy";

/**
 * A venue page — PRD criteria 260–261, open question 9's answer (c),
 * mirroring the player and roster pages' own shape exactly: a stat row, then
 * a per-entity table, then that entity's games. `notFound()` for a made-up
 * or deleted venue id (M2 criterion 130), same as every other entity page.
 * `docs/DESIGN-SYSTEM.md` § "A venue page exists at `/places/{id}`".
 */
export const dynamic = "force-dynamic";

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireGroupSession();
  const { id } = await params;
  const venue = await getVenuePage(id);
  if (!venue) notFound();

  return (
    <>
      <AppBar title={venue.name} back={{ href: "/places", label: VENUE_PAGE_BACK_LABEL }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-6">
          {venue.gamesPlayed === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                <StatBlock label={STAT_LABEL_GAMES_PLAYED} value="0" />
              </div>
              <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
                <p className="mb-2 font-bold">{VENUE_ZERO_GAMES_TITLE}</p>
                <p className="text-text-muted">{venueZeroGamesBody(venue.name)}</p>
              </div>
            </>
          ) : (
            <>
              {/* Criterion 252: the venue's table average sits beside "Games
                  played", stated with both the games and the scores behind
                  it, the same pairing the roster page already uses. */}
              <div className="grid grid-cols-2 gap-2">
                <StatBlock label={STAT_LABEL_GAMES_PLAYED} value={String(venue.gamesPlayed)} />
                <StatBlock
                  label={ROSTER_TABLE_AVERAGE_LABEL}
                  value={venue.tableAverage ? venue.tableAverage.average.toFixed(1) : NO_DATA_VALUE}
                  sample={
                    venue.tableAverage
                      ? rosterAverageSampleCaption(
                          venue.tableAverage.gamesPlayed,
                          venue.tableAverage.scoresCount,
                        )
                      : undefined
                  }
                />
              </div>

              <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
                <h2 className="font-display text-lg font-bold">{VENUE_PLAYERS_HEADING}</h2>
                <p className="mb-2 text-sm text-text-muted">{venuePlayersSampleLine(venue.name)}</p>
                <ul>
                  {venue.players.map((p) => (
                    <VenuePlayerRow
                      key={p.playerId}
                      playerId={p.playerId}
                      displayName={p.displayName}
                      gamesPlayed={p.gamesPlayed}
                      wins={p.wins}
                      winRate={p.winRate}
                      average={p.average}
                    />
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="mb-3 font-display text-lg font-bold">{venueGamesHeading(venue.name)}</h2>
                <div className="flex flex-col gap-2">
                  {venue.games.map((g) => (
                    <GameRow
                      key={g.id}
                      id={g.id}
                      playedOn={g.playedOn}
                      locationName={venue.name}
                      rosterId={g.rosterId}
                      rosterName={g.rosterName}
                      winners={g.winners}
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
