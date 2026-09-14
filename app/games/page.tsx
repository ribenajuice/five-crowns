import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ButtonLink } from "@/components/Button";
import { GameRow } from "@/components/GameRow";
import { IndexNav } from "@/components/IndexNav";
import { StatsNavLink } from "@/components/StatsNavLink";
import { listGames } from "@/lib/games/queries";

/**
 * The games list — newest first: date, venue or "No location", roster name,
 * and the winner or winners (PRD criterion 69). Empty state offers "add a
 * game" rather than rendering blank (criterion 72).
 */
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  await requireGroupSession();
  const games = await listGames();

  return (
    <>
      <AppBar title="Games" context="Five Crowns Ledger" />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-4">
          <ButtonLink href="/games/new">Add a game</ButtonLink>
          {/* Criterion 174: always rendered, even against the empty state below —
              the three index pages are worth reaching before the archive has a
              single game in it (docs/DESIGN-SYSTEM.md § "Reaching these pages"). */}
          <IndexNav />
          {/* Criterion 236: reachable in one tap from the games list too, same
              "always reachable" precedent as IndexNav above it. */}
          <StatsNavLink />
          {games.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
              <p className="mb-2 font-bold">Nothing in the book yet.</p>
              <p className="text-text-muted">
                Photograph a finished sheet and it&apos;ll end up here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {games.map((g) => (
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
          )}
        </div>
      </main>
    </>
  );
}
