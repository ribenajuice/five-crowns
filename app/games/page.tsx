import { requireGroupSession } from "@/lib/auth/session";

/**
 * The games list.
 *
 * ⚠️ **Stage 1 builds the empty state only** (PRD criterion 72). The list
 * itself, the rows and the "add a game" flow are stage 2 and belong to the
 * frontend developer.
 */
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  await requireGroupSession();

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-8">
      <h1
        className="mb-6 text-[28px] font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Games
      </h1>

      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <p className="mb-2 font-bold">Nothing in the book yet.</p>
        <p className="text-[var(--color-text-muted)]">
          Photograph a finished sheet and it will end up here.
        </p>
      </div>
    </main>
  );
}
