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
  /**
   * Criterion 174, "Reaching these pages": on the game view, the title *is*
   * the roster name, so the `h1` itself becomes a link to that roster's page
   * — the one place in this app a page's own heading doubles as navigation.
   * Keeps the title's existing size/weight/colour, adding only the
   * underline (`docs/DESIGN-SYSTEM.md` § "Reaching these pages", point 2).
   * ⚠️ **`EntityLink`'s own hit-slop technique, applied by hand rather than
   * by using that component directly** — `-my-3.5 -mx-1 px-1 py-3.5` grows
   * the invisible tap target to ≥44px tall without moving the visible line,
   * the exact trick `EntityLink`'s own doc comment explains. Reusing
   * `EntityLink` itself was rejected here: its `brand`/`muted`/`success`
   * variants all recolour either the text or the underline, and this title
   * needs to stay `text-inherit` — the same colour as an untappable heading
   * — matching every other `AppBar` title on every other screen. QA gap
   * found in Stage 4 review: without the padding/negative-margin pair, this
   * link measured 34px tall at 1280px (a title long enough to sit on one
   * line), below the 44px minimum — criteria 73, 272.
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
              <Link
                href={titleHref}
                className="-my-3.5 -mx-1 inline-block px-1 py-3.5 text-inherit underline underline-offset-2"
              >
                {title}
              </Link>
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
