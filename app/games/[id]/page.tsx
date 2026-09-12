import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getGame } from "@/lib/games/queries";
import { AppBar } from "@/components/AppBar";
import { Banner } from "@/components/Banner";
import { FinalRow } from "@/components/FinalRow";
import { ScoreTable } from "@/components/ScoreTable";
import { SheetPhoto } from "@/components/SheetPhoto";
import { NO_LOCATION_GAMES_LIST, winnerConfirmationDetail } from "@/lib/ui/copy";

/**
 * The game view: the eleven running totals in the paper's column order, the
 * derived hands alongside, the final row called out, winner(s) marked, and
 * the sheet photo, pinch-zoomable (PRD criterion 70). `notFound()` for an
 * unknown id (criterion 4 of the games list section / general 404 handling).
 *
 * `docs/DESIGN-SYSTEM.md`: "No toast is used for save in Stage 2 — the
 * confirmation is the game view itself, reached by redirect, carrying the
 * banner text above." `?saved=1` on the redirect from a successful save is
 * what tells this page to show that one-off confirmation.
 */
export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireGroupSession();
  const { id } = await params;
  const { saved } = await searchParams;
  const game = await getGame(id);
  if (!game) notFound();

  const finalItems = game.columns.map((column) => ({
    id: column.playerId,
    label: column.displayName,
    finalScore: column.finalScore,
  }));
  const winnerIds = game.columns.filter((c) => c.isWinner).map((c) => c.playerId);
  const displayNameByPlayerId = new Map(game.columns.map((c) => [c.playerId, c.displayName]));

  return (
    <>
      <AppBar
        title={game.rosterName}
        context={`${game.playedOn} · ${game.locationName ?? NO_LOCATION_GAMES_LIST}`}
        back={{ href: "/games", label: "Back to games" }}
      />
      <main className="mx-auto flex w-full max-w-wide flex-col gap-6 px-4 py-6">
        {saved ? (
          <Banner tone="ok" title="In the book.">
            {winnerConfirmationDetail(game.winners, game.winningScore)}
          </Banner>
        ) : null}
        <ScoreTable columns={game.columns} />
        <FinalRow items={finalItems} winnerIds={winnerIds} />

        <section aria-labelledby="sheet-photo-heading">
          <h2 id="sheet-photo-heading" className="mb-2 font-display text-lg font-bold">
            The sheet
          </h2>
          {game.sheetPhoto ? (
            <SheetPhoto
              url={game.sheetPhoto.url}
              width={game.sheetPhoto.width}
              height={game.sheetPhoto.height}
              alt={`The photographed scoresheet for ${game.rosterName} on ${game.playedOn}`}
            />
          ) : (
            <p className="text-text-muted">
              The photo for this game couldn&apos;t be loaded right now.
            </p>
          )}
        </section>

        {game.closeUps.length > 0 ? (
          <section aria-labelledby="close-ups-heading">
            <h2 id="close-ups-heading" className="mb-2 font-display text-lg font-bold">
              Close-ups
            </h2>
            <div className="flex flex-col gap-4">
              {game.closeUps.map((closeUp, index) => {
                const name = displayNameByPlayerId.get(closeUp.playerId) ?? "a player";
                return (
                  <div key={`${closeUp.playerId}-${index}`}>
                    <p className="mb-2 text-sm text-text-muted">{name}&apos;s column</p>
                    <SheetPhoto
                      url={closeUp.url}
                      width={closeUp.width}
                      height={closeUp.height}
                      alt={`A close-up of ${name}'s column for ${game.rosterName} on ${game.playedOn}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
