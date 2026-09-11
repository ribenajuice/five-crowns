import { hasSession, requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";
import { PasswordGate } from "@/components/PasswordGate";

/**
 * `/admin` — the second password.
 *
 * ⚠️ **Stage 1 is the prompt only.** Holding a valid group session produces
 * this prompt, not a panel (PRD criteria 4 and 74). The panel — set the
 * transcription API key — is stage 3.
 *
 * Middleware has checked the group cookie's signature, but not its epoch, so
 * the full group check runs first: a device logged out by a group-password
 * rotation goes back to `/login` and never sees the admin prompt. Being in the
 * group still grants nothing here.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireGroupSession();
  const isAdmin = await hasSession("admin");

  if (!isAdmin) {
    return (
      <PasswordGate
        title="Admin"
        hint="This needs the admin password, which isn't the group one."
        action="/api/admin/login"
        next="/admin"
        label="Admin password"
        back={{ href: "/games", label: "Back to games" }}
      />
    );
  }

  return (
    <>
      <AppBar
        title="Admin"
        context="Five Crowns Ledger"
        back={{ href: "/games", label: "Back to games" }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
          <p className="mb-2 font-bold">Nothing here yet.</p>
          <p className="text-text-muted">
            Setting the transcription API key arrives with transcription itself.
          </p>
        </div>
      </main>
    </>
  );
}
