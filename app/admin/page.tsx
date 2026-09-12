import { hasSession, requireGroupSession } from "@/lib/auth/session";
import { AdminKeyPanel } from "@/components/AdminKeyPanel";
import { AppBar } from "@/components/AppBar";
import { PasswordGate } from "@/components/PasswordGate";

/**
 * `/admin` — the second password, then the API key panel.
 *
 * Middleware has checked the group cookie's signature, but not its epoch, so
 * the full group check runs first: a device logged out by a group-password
 * rotation goes back to `/login` and never sees the admin prompt. Being in the
 * group still grants nothing here (PRD criteria 4, 74).
 *
 * The panel itself (`AdminKeyPanel`) is a client component: it does its own
 * `GET /api/admin/key` on mount and owns every state from there — this page
 * only gets the founder past both passwords first.
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
        <AdminKeyPanel />
      </main>
    </>
  );
}
