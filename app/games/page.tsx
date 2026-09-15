import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { listGames, resolveGamesFilter } from "@/lib/games/queries";
import { AppBar } from "@/components/AppBar";
import { ButtonLink } from "@/components/Button";
import { GameRow } from "@/components/GameRow";
import { IndexNav } from "@/components/IndexNav";
import { StatsNavLink } from "@/components/StatsNavLink";
import {
  GAMES_FILTER_CLEAR_BUTTON,
  GAMES_FILTER_ZERO_MATCHES_TITLE,
  gamesFilterClauses,
  gamesFilterContext,
  gamesFilterZeroMatchesBody,
} from "@/lib/ui/copy";

/**
 * The games list — newest first: date, venue or "No location", roster name,
 * and the winner or winners (PRD criterion 69). Empty state offers "add a
 * game" rather than rendering blank (criterion 72).
 *
 * M3 Stage 4 (criteria 262–264): `?location=`/`?roster=`, URL-addressable and
 * combinable, narrow which rows this same list fetches — never how a row
 * renders, and never a second list format (this is the identical component
 * every board drill-through and the venue page's own games list already
 * render through). An unknown, deleted or malformed value 404s rather than
 * silently falling back to the unfiltered list (criterion 263).
 */
export const dynamic = "force-dynamic";

interface GamesPageSearchParams {
  location?: string;
  roster?: string;
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<GamesPageSearchParams>;
}) {
  await requireGroupSession();
  const { location, roster } = await searchParams;

  const hasFilterParams = location !== undefined || roster !== undefined;
  const resolvedFilter = hasFilterParams ? await resolveGamesFilter({ location, roster }) : undefined;
  if (hasFilterParams && !resolvedFilter) notFound();

  const clauses = resolvedFilter ? gamesFilterClauses(resolvedFilter) : [];
  const isFiltered = clauses.length > 0;

  const games = await listGames(
    resolvedFilter
      ? { location: resolvedFilter.location, rosterId: resolvedFilter.roster?.id }
      : undefined,
  );

  return (
    <>
      <AppBar
        title="Games"
        context={isFiltered ? gamesFilterContext(clauses, games.length) : "Five Crowns Ledger"}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-4">
          {isFiltered ? (
            <ButtonLink href="/games" variant="ghost" fullWidth>
              {GAMES_FILTER_CLEAR_BUTTON}
            </ButtonLink>
          ) : null}
          <ButtonLink href="/games/new">Add a game</ButtonLink>
          {/* Criterion 174: always rendered, even against the empty state below —
              the three index pages are worth reaching before the archive has a
              single game in it (docs/DESIGN-SYSTEM.md § "Reaching these pages"). */}
          <IndexNav />
          {/* Criterion 236: reachable in one tap from the games list too, same
              "always reachable" precedent as IndexNav above it. */}
          <StatsNavLink />
          {isFiltered && games.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
              <p className="mb-2 font-bold">{GAMES_FILTER_ZERO_MATCHES_TITLE}</p>
              <p className="text-text-muted">{gamesFilterZeroMatchesBody(clauses)}</p>
            </div>
          ) : games.length === 0 ? (
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
