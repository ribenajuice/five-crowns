import { AppBar } from "@/components/AppBar";
import { Banner } from "@/components/Banner";
import { ButtonLink } from "@/components/Button";
import {
  NOT_FOUND_APPBAR_TITLE,
  NOT_FOUND_BACK_LABEL,
  NOT_FOUND_BANNER_BODY,
  NOT_FOUND_BANNER_TITLE,
  NOT_FOUND_BUTTON_LABEL,
} from "@/lib/ui/copy";

/**
 * Next's global 404 (`app/not-found.tsx`) — reached alike for a deleted
 * game's old URL, a mistyped one, or a made-up player/roster/location
 * address (PRD criterion 130). It never knows which of the three happened,
 * so the copy is written to be honestly true of all three at once
 * (docs/DESIGN-SYSTEM.md § "A game that no longer exists — the 404 screen").
 *
 * No session check here, and none is needed: `middleware.ts` denies by
 * default and redirects an unauthenticated request to `/login` *before* Next
 * ever resolves it to "no matching route", so this file only renders for a
 * request that already carries a valid group session. Every page that calls
 * `notFound()` itself (e.g. the game view, the delete confirmation screen)
 * has already called `requireGroupSession()` first, for the same reason.
 * Either way, this page itself reveals nothing of the record (criterion 1).
 */
export default function NotFound() {
  return (
    <>
      <AppBar title={NOT_FOUND_APPBAR_TITLE} back={{ href: "/games", label: NOT_FOUND_BACK_LABEL }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-4">
          <Banner tone="error" title={NOT_FOUND_BANNER_TITLE}>
            {NOT_FOUND_BANNER_BODY}
          </Banner>
          <ButtonLink href="/games" variant="primary" fullWidth>
            {NOT_FOUND_BUTTON_LABEL}
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
