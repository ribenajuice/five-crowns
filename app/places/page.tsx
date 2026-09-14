import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { PlaceRow } from "@/components/PlaceRow";
import { listPlaces } from "@/lib/locations/queries";
import { PLACES_INDEX_EMPTY_BODY, PLACES_INDEX_EMPTY_TITLE, PLACES_INDEX_TITLE } from "@/lib/ui/copy";

/**
 * The places index — PRD criterion 140: every location, including one that
 * has never hosted a game (still listed, still pickable), plus its rename
 * control (criteria 145–146). `docs/DESIGN-SYSTEM.md` § "Places index, and
 * renaming a location". There is no place page — a row is never a `Link`.
 */
export const dynamic = "force-dynamic";

export default async function PlacesIndexPage() {
  await requireGroupSession();
  const places = await listPlaces();

  return (
    <>
      <AppBar title={PLACES_INDEX_TITLE} back={{ href: "/games", label: "Back to games" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {places.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{PLACES_INDEX_EMPTY_TITLE}</p>
            <p className="text-text-muted">{PLACES_INDEX_EMPTY_BODY}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {places.map((p) => (
              <PlaceRow key={p.id} id={p.id} name={p.name} gamesPlayed={p.gamesPlayed} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
