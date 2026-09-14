import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlace } from "@/lib/locations/queries";
import { AppBar } from "@/components/AppBar";
import { PlaceMergeConfirm } from "@/components/PlaceMergeConfirm";
import { MERGE_CONFIRM_TITLE_PLACE } from "@/lib/ui/copy";

/**
 * `/places/{id}/merge/{otherId}` — `MergeConfirmScreen`, places (PRD criteria
 * 163–166; docs/DESIGN-SYSTEM.md § "Merging two places"). ⚠️ No preview
 * endpoint and no same-game refusal for places — both places' games-played
 * counts are fetched here, server-side, and handed straight to the client
 * confirm component; there's nothing further to check before it renders.
 */
export const dynamic = "force-dynamic";

export default async function PlaceMergeConfirmPage({
  params,
}: {
  params: Promise<{ id: string; otherId: string }>;
}) {
  await requireGroupSession();
  const { id, otherId } = await params;
  if (id === otherId) notFound();

  const [a, b] = await Promise.all([getPlace(id), getPlace(otherId)]);
  if (!a || !b) notFound();

  return (
    <>
      <AppBar title={MERGE_CONFIRM_TITLE_PLACE} back={{ href: "/places", label: "Back to places" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <PlaceMergeConfirm a={a} b={b} />
      </main>
    </>
  );
}
