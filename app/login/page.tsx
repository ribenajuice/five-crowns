import { redirect } from "next/navigation";

import { hasSession } from "@/lib/auth/session";
import { PasswordGate } from "@/components/PasswordGate";

/**
 * The front page: one shared password, no accounts.
 *
 * ⚠️ Nothing of the record is on this page, and nothing may ever be added to
 * it — it is the one route reachable without a session (PRD criterion 1).
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already in? Don't make them look at a password box.
  if (await hasSession("group")) redirect("/games");

  return (
    <PasswordGate
      title="Five Crowns Ledger"
      hint="One password, shared. Ask whoever set it up."
      action="/api/login"
      next="/games"
      label="Password"
    />
  );
}
