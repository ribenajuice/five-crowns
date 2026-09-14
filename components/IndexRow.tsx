/**
 * `IndexRow` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3).
 *
 * The whole row is a `Link` (unlike `PlaceRow`, which isn't one) — 52px+
 * tall, `PickList`-row shaped: a name in the display face, an optional muted
 * second line, and a right-aligned games-played count in the uppercase-label
 * over `--num`-value shape `StatBlock` also uses. Players index: name only.
 * Rosters index: name plus its members (or "auto-named") on a second line.
 */

import Link from "next/link";

export interface IndexRowProps {
  href: string;
  name: string;
  /** Members list, or "auto-named" — omitted on the players index. */
  meta?: string;
  count: number;
  countLabel: string;
}

export function IndexRow({ href, name, meta, count, countLabel }: IndexRowProps) {
  return (
    <Link
      href={href}
      className="flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">{name}</p>
        {meta ? <p className="mt-0.5 truncate text-sm text-text-muted">{meta}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <span className="tabular block text-num font-black">{count}</span>
        <span className="block text-xs uppercase tracking-label text-text-muted">
          {countLabel}
        </span>
      </div>
    </Link>
  );
}
