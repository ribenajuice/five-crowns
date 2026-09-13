"use client";

import { AppBar } from "@/components/AppBar";
import { Banner } from "@/components/Banner";
import { ButtonLink, buttonClasses } from "@/components/Button";
import {
  ERROR_BACK_BUTTON_LABEL,
  ERROR_BACK_LABEL,
  ERROR_BANNER_BODY,
  ERROR_BANNER_TITLE,
  ERROR_RETRY_BUTTON_LABEL,
  ERROR_APPBAR_TITLE,
} from "@/lib/ui/copy";

/**
 * Next's route-segment error boundary (`app/error.tsx`), required to be a
 * Client Component and to accept `{ error, reset }` (Next 15). PRD criterion
 * 131: ⚠️ no stack trace, no file path, no library name — ever. The copy
 * below is entirely fixed and never reads `error.message` or `error.stack`,
 * so `error` itself is deliberately never destructured; there is nothing
 * here a rendering bug could leak.
 *
 * Title is the app's own wordmark, not a page-specific one
 * (docs/DESIGN-SYSTEM.md § "An unhandled error"): this boundary can be
 * reached from anywhere, so any other title would be dishonest about where
 * the visitor actually is.
 *
 * Nested under the root layout — not `app/global-error.tsx` — so it does not
 * render its own `<html>`/`<body>`; the root layout's are still in place.
 */
export default function ErrorScreen({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <AppBar title={ERROR_APPBAR_TITLE} back={{ href: "/games", label: ERROR_BACK_LABEL }} />
      <main className="mx-auto w-full max-w-read px-4 py-6">
        <div className="flex flex-col gap-4">
          <Banner tone="error" title={ERROR_BANNER_TITLE}>
            {ERROR_BANNER_BODY}
          </Banner>
          <button
            type="button"
            onClick={reset}
            className={buttonClasses("primary", { fullWidth: true })}
          >
            {ERROR_RETRY_BUTTON_LABEL}
          </button>
          <ButtonLink href="/games" variant="ghost" fullWidth>
            {ERROR_BACK_BUTTON_LABEL}
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
