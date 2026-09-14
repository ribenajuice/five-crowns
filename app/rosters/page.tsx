import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { IndexRow } from "@/components/IndexRow";
import { listRosters } from "@/lib/rosters/queries";
import { rosterDisplayName } from "@/lib/scoring";
import {
  ROSTERS_INDEX_EMPTY_BODY,
  ROSTERS_INDEX_EMPTY_TITLE,
  ROSTERS_INDEX_TITLE,
  ROSTER_AUTO_NAMED_CAPTION,
} from "@/lib/ui/copy";

/**
 * The rosters index — PRD criterion 137: every roster with at least one
 * game, its name (custom or auto), its members, and games played.
 * `docs/DESIGN-SYSTEM.md` § "Rosters index".
 */
export const dynamic = "force-dynamic";

export default async function RostersIndexPage() {
  await requireGroupSession();
  const rosters = await listRosters();

  return (
    <>
      <AppBar title={ROSTERS_INDEX_TITLE} back={{ href: "/games", label: "Back to games" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {rosters.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{ROSTERS_INDEX_EMPTY_TITLE}</p>
            <p className="text-text-muted">{ROSTERS_INDEX_EMPTY_BODY}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rosters.map((r) => (
              <IndexRow
                key={r.id}
                href={`/rosters/${r.id}`}
                name={r.displayName}
                // A custom name shows its members below; an auto-named
                // roster's display name already *is* the joined member list,
                // so repeating it would be a bare duplicate.
                meta={r.name ? rosterDisplayName(r.members) : ROSTER_AUTO_NAMED_CAPTION}
                count={r.gamesPlayed}
                countLabel="games"
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
