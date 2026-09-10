import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ButtonLink } from "@/components/Button";

/**
 * The games list.
 *
 * ⚠️ **Stage 1 builds the empty state only** (PRD criterion 72). The list
 * itself and the rows are stage 2; "Add a game" leads to a holding page until
 * capture exists.
 */
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  await requireGroupSession();

  return (
    <>
      <AppBar title="Games" context="Five Crowns Ledger" />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
          <p className="mb-2 font-bold">Nothing in the book yet.</p>
          <p className="mb-6 text-text-muted">
            Photograph a finished sheet and it&apos;ll end up here.
          </p>
          <ButtonLink href="/games/new">Add a game</ButtonLink>
        </div>
      </main>
    </>
  );
}
