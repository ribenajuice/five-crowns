import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ButtonLink } from "@/components/Button";
import { GameRow } from "@/components/GameRow";
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
        {games.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">Nothing in the book yet.</p>
            <p className="mb-6 text-text-muted">
              Photograph a finished sheet and it&apos;ll end up here.
            </p>
            <ButtonLink href="/games/new">Add a game</ButtonLink>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ButtonLink href="/games/new">Add a game</ButtonLink>
            <div className="flex flex-col gap-2">
              {games.map((g) => (
                <GameRow
                  key={g.id}
                  id={g.id}
                  playedOn={g.playedOn}
                  locationName={g.locationName}
                  rosterName={g.rosterName}
                  winners={g.winners}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
