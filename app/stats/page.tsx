import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { AverageRow } from "@/components/AverageRow";
import { DisasterRow } from "@/components/DisasterRow";
import { HandTrendBars } from "@/components/HandTrendBars";
import { VillainsTable } from "@/components/VillainsTable";
import { getStatsPage, type DisasterRow as DisasterRowData } from "@/lib/stats/queries";
import { HANDS_PER_GAME } from "@/lib/scoring";
import {
  AVERAGES_HEADING,
  AVERAGES_PLAYERS_SUBHEADING,
  AVERAGES_ROSTERS_SUBHEADING,
  DISASTERS_HEADING,
  DISASTERS_SAMPLE_LINE,
  HAND_DERIVATION_HONESTY_LINE,
  HAND_TREND_HEADING,
  STATS_APPBAR_TITLE,
  STATS_BACK_LABEL,
  STATS_EMPTY_BODY,
  STATS_EMPTY_TITLE,
  VILLAINS_HEADING,
  VILLAINS_SAMPLE_LINE,
  handTrendSampleLine,
  playerAverageSampleCaption,
  rosterAverageSampleCaption,
} from "@/lib/ui/copy";

/**
 * `/stats` — the catalogue index, PRD criteria 236–242. Reachable in one tap
 * from the board and the games list (`StatsNavLink`). No `ArchiveLine`
 * repeats here — each section states its own sample per its own criterion,
 * so a second global count would be the double-statement criterion 182
 * already forbids. `docs/DESIGN-SYSTEM.md` § "`/stats` — the catalogue
 * index".
 *
 * An unauthenticated request still 307s to `/login` before any of this runs,
 * exactly like every other screen (criterion 236, M1 criterion 1's pattern).
 */
export const dynamic = "force-dynamic";

/**
 * Standard competition ranking (criterion 240: "ties at the last place are
 * all shown" — two rows can both read "9"). `disasters` is already sorted
 * highest-first (`lib/stats/queries.ts`), so a row's rank is exactly the
 * count of strictly-higher scores ahead of it, plus one.
 */
function disasterRank(disasters: readonly DisasterRowData[], index: number): number {
  const score = disasters[index]!.score;
  return disasters.filter((d) => d.score > score).length + 1;
}

export default async function StatsPage() {
  await requireGroupSession();
  const stats = await getStatsPage();

  return (
    <>
      <AppBar title={STATS_APPBAR_TITLE} back={{ href: "/", label: STATS_BACK_LABEL }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {stats.empty ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{STATS_EMPTY_TITLE}</p>
            <p className="text-text-muted">{STATS_EMPTY_BODY}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/*
             * Every "games"/"hands" figure below is derived from data the
             * three bounded queries in `getStatsPage()` already fetched —
             * never a fourth query (criterion 248). A game belongs to
             * exactly one roster (exact-set matching), so the sum of every
             * roster's own game count is the archive's total game count; a
             * player's own game count times eleven is their own share of
             * every round_score row ever posted, so the sum across players
             * is the archive's total hand count.
             */}
            <section>
              <h2 className="mb-2 font-display text-lg font-bold">{HAND_TREND_HEADING}</h2>
              <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
                <p className="mb-3 text-sm text-text-muted">
                  {handTrendSampleLine(
                    stats.rosterAverages.reduce((sum, r) => sum + r.gamesPlayed, 0),
                    stats.playerAverages.reduce((sum, p) => sum + p.gamesPlayed, 0) * HANDS_PER_GAME,
                  )}
                </p>
                <HandTrendBars hands={stats.trend} />
                <p className="mt-3 border-t border-dashed border-line pt-3 text-sm text-text-muted">
                  {HAND_DERIVATION_HONESTY_LINE}
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-display text-lg font-bold">{VILLAINS_HEADING}</h2>
              <p className="mb-2 text-sm text-text-muted">{VILLAINS_SAMPLE_LINE}</p>
              <VillainsTable rows={stats.villains} />
            </section>

            <section>
              <h2 className="mb-2 font-display text-lg font-bold">{DISASTERS_HEADING}</h2>
              <p className="mb-2 text-sm text-text-muted">{DISASTERS_SAMPLE_LINE}</p>
              <div className="flex flex-col gap-2">
                {stats.disasters.map((d, i) => (
                  <DisasterRow
                    key={`${d.gameId}-${d.playerId}-${d.hand}`}
                    rank={disasterRank(stats.disasters, i)}
                    gameId={d.gameId}
                    displayName={d.displayName}
                    hand={d.hand}
                    playedOn={d.playedOn}
                    score={d.score}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-display text-lg font-bold">{AVERAGES_HEADING}</h2>
              <div className="flex flex-col gap-4">
                <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-label text-text">
                    {AVERAGES_PLAYERS_SUBHEADING}
                  </p>
                  <ul>
                    {stats.playerAverages.map((p) => (
                      <AverageRow
                        key={p.playerId}
                        href={`/players/${p.playerId}`}
                        name={p.displayName}
                        sample={playerAverageSampleCaption(p.gamesPlayed)}
                        average={p.average}
                      />
                    ))}
                  </ul>
                </div>
                <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-label text-text">
                    {AVERAGES_ROSTERS_SUBHEADING}
                  </p>
                  <ul>
                    {stats.rosterAverages.map((r) => (
                      <AverageRow
                        key={r.rosterId}
                        href={`/rosters/${r.rosterId}`}
                        name={r.displayName}
                        sample={rosterAverageSampleCaption(r.gamesPlayed, r.scoresCount)}
                        average={r.average}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
