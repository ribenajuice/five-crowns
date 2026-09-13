import { hasSession, requireGroupSession } from "@/lib/auth/session";
import { AdminKeyPanel } from "@/components/AdminKeyPanel";
import { AdminPasswordPanel } from "@/components/AdminPasswordPanel";
import { AppBar } from "@/components/AppBar";
import { GroupPasswordPanel } from "@/components/GroupPasswordPanel";
import { PasswordGate } from "@/components/PasswordGate";
import { ScoreDownloadCard } from "@/components/ScoreDownloadCard";
import { UsagePanel } from "@/components/UsagePanel";
import { ADMIN_LOGIN_RECOVERY_LINK } from "@/lib/ui/copy";

/**
 * `/admin` — the second password, then the API key panel, the two password-
 * change forms, the score download and the usage/spend summary (Stage 1 of
 * Milestone 2; PRD criteria 87-114).
 *
 * Middleware has checked the group cookie's signature, but not its epoch, so
 * the full group check runs first: a device logged out by a group-password
 * rotation goes back to `/login` and never sees the admin prompt. Being in the
 * group still grants nothing here (PRD criteria 4, 74).
 *
 * Every panel below is a client component: each does its own fetch on mount
 * (where it has one) and owns every state from there — this page only gets
 * the founder past both passwords first, in the read order the design system
 * fixes: API key, group password, admin password, score download, usage.
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
        secondaryLink={{
          href: "https://github.com/ribenajuice/five-crowns/blob/main/README.md#forgotten-the-admin-password",
          label: ADMIN_LOGIN_RECOVERY_LINK,
        }}
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
      <main className="mx-auto flex w-full max-w-read flex-col gap-8 px-4 py-6">
        <section aria-label="API key">
          <AdminKeyPanel />
        </section>
        <section aria-label="Group password">
          <GroupPasswordPanel />
        </section>
        <section aria-label="Admin password">
          <AdminPasswordPanel />
        </section>
        <section aria-label="Score download">
          <ScoreDownloadCard />
        </section>
        <section aria-label="Usage and spend">
          <UsagePanel />
        </section>
      </main>
    </>
  );
}
