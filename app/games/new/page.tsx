import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { ButtonLink } from "@/components/Button";

/**
 * `/games/new` — where "Add a game" leads.
 *
 * ⚠️ **A holding page.** Capture (photograph the sheet) is stage 2. Private
 * like every other page: middleware denies it by default, and the full session
 * check runs here before anything renders.
 */
export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  await requireGroupSession();

  return (
    <>
      <AppBar
        title="Add a game"
        context="Five Crowns Ledger"
        back={{ href: "/games", label: "Back to games" }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
          <p className="mb-2 font-bold">Capture arrives soon.</p>
          <p className="mb-6 text-text-muted">
            You&apos;ll photograph a finished sheet here. It&apos;s not built
            yet.
          </p>
          <ButtonLink href="/games" variant="ghost">
            Back to games
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
