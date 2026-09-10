import { hasSession } from "@/lib/auth/session";
import { PasswordGate } from "@/components/PasswordGate";

/**
 * `/admin` — the second password.
 *
 * ⚠️ **Stage 1 is the prompt only.** Holding a valid group session produces
 * this prompt, not a panel (PRD criteria 4 and 74). The panel — set the
 * transcription API key — is stage 3.
 *
 * The group middleware has already run, so anyone reaching this page is in the
 * group. That grants nothing here.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await hasSession("admin");

  if (!isAdmin) {
    return (
      <PasswordGate
        title="Admin"
        hint="This needs the admin password, which is not the group one."
        action="/api/admin/login"
        next="/admin"
        label="Admin password"
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-8">
      <h1
        className="mb-6 text-[28px] font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Admin
      </h1>
      <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <p className="mb-2 font-bold">Nothing here yet.</p>
        <p className="text-[var(--color-text-muted)]">
          Setting the transcription API key arrives with transcription itself.
        </p>
      </div>
    </main>
  );
}
