import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getRosterPage } from "@/lib/rosters/queries";
import { AppBar } from "@/components/AppBar";
import { EntityLink } from "@/components/EntityLink";
import { RosterGameRow } from "@/components/RosterGameRow";
import { RosterRenameControl } from "@/components/RosterRenameControl";
import { StatBlock } from "@/components/StatBlock";
import {
  ROSTER_MEMBER_AVERAGE_LABEL,
  ROSTER_STATS_HEADING,
  ROSTER_TABLE_AVERAGE_LABEL,
  STAT_LABEL_GAMES_PLAYED,
  formatWinRatePercent,
  rosterAverageSampleCaption,
  rosterGamesHeading,
  rosterStatsSampleLine,
} from "@/lib/ui/copy";

/**
 * A roster page — PRD criteria 138–139, 141–144: name, members, games
 * played, per-member wins/win rate within this roster only, then the
 * roster's games newest first, plus the rename control.
 * `docs/DESIGN-SYSTEM.md` § "Roster page" / "Renaming a roster".
 */
export const dynamic = "force-dynamic";

/** "29 Aug" — the short form used only by the shared-win reassurance note below. */
function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireGroupSession();
  const { id } = await params;
  const roster = await getRosterPage(id);
  if (!roster) notFound();

  const totalRatePercent = roster.members.reduce((sum, m) => sum + m.winRate, 0) * 100;
  // Criterion 134: rates can legitimately sum past 100% when a win was
  // shared — never an error, and this reassurance note only earns its place
  // when it's actually true of this roster's games, naming the first shared
  // win it finds rather than a fixed sentence (docs/DESIGN-SYSTEM.md § "Roster
  // page": "the frontend-developer should treat the exact wording as
  // illustrative, not a fixed string, since it names a specific game").
  const sharedWinGame =
    totalRatePercent > 100.05 ? roster.games.find((g) => g.winners.length > 1) : undefined;

  return (
    <>
      <AppBar
        title={roster.displayName}
        context={roster.members.map((m) => m.displayName).join(", ")}
        back={{ href: "/rosters", label: "Back to rosters" }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-6">
          <RosterRenameControl rosterId={roster.id} initialDisplayName={roster.displayName} />

          {/* Criterion 244: the roster's own table average sits beside "Games
              played" — a fact about the table, stated with both the games
              and the scores behind it (criterion 224). */}
          <div className="grid grid-cols-2 gap-2">
            <StatBlock label={STAT_LABEL_GAMES_PLAYED} value={String(roster.gamesPlayed)} />
            <StatBlock
              label={ROSTER_TABLE_AVERAGE_LABEL}
              value={roster.tableAverage ? roster.tableAverage.average.toFixed(1) : "–"}
              sample={
                roster.tableAverage
                  ? rosterAverageSampleCaption(roster.tableAverage.gamesPlayed, roster.tableAverage.scoresCount)
                  : undefined
              }
            />
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">{ROSTER_STATS_HEADING}</h2>
            <p className="mb-2 text-sm text-text-muted">
              {rosterStatsSampleLine(roster.gamesPlayed)}
            </p>
            <ul>
              {roster.members.map((m) => (
                <li
                  key={m.playerId}
                  className="flex items-center gap-2 border-b border-line py-2.5 last:border-b-0"
                >
                  <span className="flex-1 font-bold">
                    <EntityLink href={`/players/${m.playerId}`} variant="muted">
                      {m.displayName}
                    </EntityLink>
                  </span>
                  <span className="text-right text-sm">
                    <span className="tabular block text-base font-black">
                      {formatWinRatePercent(m.winRate)}
                    </span>
                    <span className="block text-text-muted">
                      {m.wins} of {roster.gamesPlayed}
                    </span>
                  </span>
                  {/* Criterion 244: each member's own average, within this
                      roster only — a third figure, the wins/win-rate columns
                      untouched. */}
                  <span className="text-right text-sm">
                    <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
                      {ROSTER_MEMBER_AVERAGE_LABEL}
                    </span>
                    <span className="tabular block text-base font-black">
                      {m.average ? m.average.average.toFixed(1) : "–"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {sharedWinGame ? (
              <p className="mt-2 text-sm italic text-text-muted">
                {totalRatePercent.toFixed(0)}% total — {sharedWinGame.winners.join(" and ")} shared
                a win on {shortDate(sharedWinGame.playedOn)}, so this is correct, not a bug.
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold">
              {rosterGamesHeading(roster.displayName)}
            </h2>
            <div className="flex flex-col gap-2">
              {roster.games.map((g) => (
                <RosterGameRow
                  key={g.gameId}
                  gameId={g.gameId}
                  playedOn={g.playedOn}
                  locationName={g.locationName}
                  winners={g.winners}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
