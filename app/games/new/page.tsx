import { requireGroupSession } from "@/lib/auth/session";
import { AppBar } from "@/components/AppBar";

import { AddGameFlow } from "./AddGameFlow";

/**
 * `/games/new` — photograph the finished sheet, then type it in by hand
 * (Stage 3 adds the automatic read). Private like every other page:
 * middleware denies by default, and the full session check runs here before
 * anything renders.
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
        <AddGameFlow />
      </main>
    </>
  );
}
