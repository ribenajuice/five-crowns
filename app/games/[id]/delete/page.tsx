import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getGame } from "@/lib/games/queries";
import { AppBar } from "@/components/AppBar";
import { DELETE_CONFIRM_APPBAR_TITLE, DELETE_CONFIRM_BACK_LABEL } from "@/lib/ui/copy";
import { DeleteGameCard } from "./DeleteGameCard";

/**
 * `/games/{id}/delete` — the dedicated delete confirmation screen
 * (PRD criteria 124–129; `docs/DESIGN-SYSTEM.md` § "Deleting a game").
 *
 * A deliberate second *screen*, not a second tap on the game view: the back
 * arrow doubles as Cancel, and the actual delete only happens from the
 * commit button on `DeleteGameCard` below. `notFound()` for an unknown or
 * already-deleted id, same as the game view itself.
 */
export const dynamic = "force-dynamic";

export default async function DeleteGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGroupSession();
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return (
    <>
      <AppBar
        title={DELETE_CONFIRM_APPBAR_TITLE}
        back={{ href: `/games/${id}`, label: DELETE_CONFIRM_BACK_LABEL }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <DeleteGameCard gameId={id} playedOn={game.playedOn} rosterName={game.rosterName} />
      </main>
    </>
  );
}
