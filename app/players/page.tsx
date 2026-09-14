import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { IndexRow } from "@/components/IndexRow";
import { listPlayers } from "@/lib/players/queries";
import {
  gamesNoun,
  PLAYERS_INDEX_EMPTY_BODY,
  PLAYERS_INDEX_EMPTY_TITLE,
  PLAYERS_INDEX_TITLE,
} from "@/lib/ui/copy";

/**
 * The players index — PRD criterion 132: every player, games played, linking
 * to their page, including one on zero games (a real row, not a special
 * case). `docs/DESIGN-SYSTEM.md` § "Players index".
 */
export const dynamic = "force-dynamic";

export default async function PlayersIndexPage() {
  await requireGroupSession();
  const players = await listPlayers();

  return (
    <>
      <AppBar title={PLAYERS_INDEX_TITLE} back={{ href: "/games", label: "Back to games" }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        {players.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="mb-2 font-bold">{PLAYERS_INDEX_EMPTY_TITLE}</p>
            <p className="text-text-muted">{PLAYERS_INDEX_EMPTY_BODY}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <IndexRow
                key={p.id}
                href={`/players/${p.id}`}
                name={p.displayName}
                count={p.gamesPlayed}
                countLabel={gamesNoun(p.gamesPlayed)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
