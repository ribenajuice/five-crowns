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
      </main>
    </>
  );
}
