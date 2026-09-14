import { notFound } from "next/navigation";

import { requireGroupSession } from "@/lib/auth/session";
import { getPlace, listPlaces } from "@/lib/locations/queries";
import { AppBar } from "@/components/AppBar";
import { MergeTargetRow } from "@/components/MergeTargetRow";
import { MERGE_PICK_EMPTY_TITLE, mergePickEmptyBodyPlace, mergeTargetHeadingPlace } from "@/lib/ui/copy";

/**
 * `/places/{id}/merge` — "which place?" (PRD criterion 163;
 * docs/DESIGN-SYSTEM.md § `MergeTargetPicker`). Every *other* place, with its
 * own games-played count — no "add new" row.
 *
 * ⚠️ Implemented as a dedicated screen rather than an overlay `BottomSheet`,
 * same reasoning as `/players/{id}/merge`. There is still no "place page" —
 * this route exists only for the merge flow, not as a destination to link a
 * place's name to (criterion 140 stands).
 */
export const dynamic = "force-dynamic";

export default async function PlaceMergePickPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGroupSession();
  const { id } = await params;
  const place = await getPlace(id);
  if (!place) notFound();

  const others = (await listPlaces()).filter((p) => p.id !== id);

  return (
    <>
      <AppBar
        title={mergeTargetHeadingPlace(place.name)}
        back={{ href: "/places", label: "Back to places" }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {others.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{MERGE_PICK_EMPTY_TITLE}</p>
            <p className="text-text-muted">{mergePickEmptyBodyPlace(place.name)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((o) => (
              <MergeTargetRow
                key={o.id}
                href={`/places/${id}/merge/${o.id}`}
                name={o.name}
                gamesPlayed={o.gamesPlayed}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
