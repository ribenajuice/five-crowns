/**
 * `AppBar` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Title + one-line context, at most one icon button. Renders its own
 * `<header>` landmark, and the title is the page's one `h1`. The password
 * screens have no app bar: their display-face `h1` is the wordmark.
 */

import Link from "next/link";

interface AppBarProps {
  title: string;
  /** One line under the title (date · venue, or where you are). */
  context?: string;
  /** An optional back link, rendered as the bar's single icon button. */
  back?: { href: string; label: string };
}

export function AppBar({ title, context, back }: AppBarProps) {
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
          <h1 className="font-display text-xl font-bold">{title}</h1>
          {context ? (
            <p className="text-sm text-text-muted">{context}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
