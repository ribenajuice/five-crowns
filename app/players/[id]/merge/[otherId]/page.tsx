import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlayerPage } from "@/lib/players/queries";
import { AppBar } from "@/components/AppBar";
import { PlayerMergeConfirm } from "@/components/PlayerMergeConfirm";
import { MERGE_CONFIRM_TITLE_PLAYER } from "@/lib/ui/copy";

/**
 * `/players/{id}/merge/{otherId}` — `MergeConfirmScreen`, players (PRD
 * criteria 156–162; docs/DESIGN-SYSTEM.md § "Merging two players"). Both ids
 * are validated to name real players here (a 404 otherwise, same rule as
 * every other made-up id); the freshness `PlayerMergeConfirm` needs — current
 * games-played counts and criterion 160's same-game check — is fetched
 * client-side on every mount, since it has to be current at the moment this
 * screen opens, not stale from whenever this page last rendered.
 */
export const dynamic = "force-dynamic";

export default async function PlayerMergeConfirmPage({
  params,
}: {
  params: Promise<{ id: string; otherId: string }>;
}) {
  await requireGroupSession();
  const { id, otherId } = await params;
  if (id === otherId) notFound();

  const [me, other] = await Promise.all([getPlayerPage(id), getPlayerPage(otherId)]);
  if (!me || !other) notFound();

  return (
    <>
      <AppBar
        title={MERGE_CONFIRM_TITLE_PLAYER}
        back={{ href: `/players/${id}`, label: `Back to ${me.displayName}` }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <PlayerMergeConfirm meId={id} otherId={otherId} />
      </main>
    </>
  );
}
