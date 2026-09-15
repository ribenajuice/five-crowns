/**
 * `AppBar` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Title + one-line context, at most one icon button. Renders its own
 * `<header>` landmark, and the title is the page's one `h1`. The password
 * screens have no app bar: their display-face `h1` is the wordmark.
 */

import Link from "next/link";

import { EntityLink } from "./EntityLink";

interface AppBarProps {
  title: string;
  /** One line under the title (date · venue, or where you are). */
  context?: string;
  /** An optional back link, rendered as the bar's single icon button. */
  back?: { href: string; label: string };
  /**
   * Criterion 174, "Reaching these pages": on the game view, the title *is*
   * the roster name, so the `h1` itself becomes a link to that roster's page
   * — the one place in this app a page's own heading doubles as navigation.
   * Keeps the title's existing size/weight/colour, adding only the
   * underline (`docs/DESIGN-SYSTEM.md` § "Reaching these pages", point 2).
   * Rendered with `EntityLink`'s own `inherit` variant (code review, M3
   * Stage 4 follow-up) rather than a hand-copied hit-slop CSS constant: that
   * variant is `text-inherit`, no colour override, so this title still reads
   * the same colour as an untappable heading on every other screen, while
   * getting `EntityLink`'s own ≥44px tap-target padding/negative-margin
   * trick for free instead of a second copy of it. QA gap found in Stage 4
   * review: without that padding, this link measured 34px tall at 1280px (a
   * title long enough to sit on one line), below the 44px minimum —
   * criteria 73, 272.
   */
  titleHref?: string;
}

export function AppBar({ title, context, back, titleHref }: AppBarProps) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-read items-center gap-2 px-4 py-3">
        {back ? (
          <Link
            href={back.href}
            aria-label={back.label}
            className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] text-brand"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold">
            {titleHref ? (
              <EntityLink href={titleHref} variant="inherit">
                {title}
              </EntityLink>
            ) : (
              title
            )}
          </h1>
          {context ? (
            <p className="text-sm text-text-muted">{context}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
