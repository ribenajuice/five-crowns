import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlayerPage, listPlayers } from "@/lib/players/queries";
import { AppBar } from "@/components/AppBar";
import { MergeTargetRow } from "@/components/MergeTargetRow";
import { MERGE_PICK_EMPTY_TITLE, mergePickEmptyBodyPlayer, mergeTargetHeadingPlayer } from "@/lib/ui/copy";

/**
 * `/players/{id}/merge` — "which player?" (PRD criterion 155;
 * docs/DESIGN-SYSTEM.md § `MergeTargetPicker`). Every *other* player, with
 * their own games-played count as secondary text — no "add new" row, since
 * there's no "someone new" concept for a merge target.
 *
 * ⚠️ Implemented as a dedicated screen rather than an overlay `BottomSheet`:
 * unlike the review screen's pick-lists (which already hold the player roster
 * client-side), this needs each candidate's games-played count, which no
 * existing client-fetchable endpoint carries — a server component reusing
 * `listPlayers()` directly is simpler than adding one. Reached in one tap
 * from the player page, same as any other navigation in this app; the back
 * arrow returns the same one tap.
 */
export const dynamic = "force-dynamic";

export default async function PlayerMergePickPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGroupSession();
  const { id } = await params;
  const player = await getPlayerPage(id);
  if (!player) notFound();

  const others = (await listPlayers()).filter((p) => p.id !== id);

  return (
    <>
      <AppBar
        title={mergeTargetHeadingPlayer(player.displayName)}
        back={{ href: `/players/${id}`, label: `Back to ${player.displayName}` }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {others.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{MERGE_PICK_EMPTY_TITLE}</p>
            <p className="text-text-muted">{mergePickEmptyBodyPlayer(player.displayName)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((o) => (
              <MergeTargetRow
                key={o.id}
                href={`/players/${id}/merge/${o.id}`}
                name={o.displayName}
                gamesPlayed={o.gamesPlayed}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
