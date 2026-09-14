/**
 * `FunFactCard` — Milestone 4, first slice (PRD criteria 281–293).
 *
 * Deliberately *not* `RecordCard` and *not* `ArchiveLine` (criterion 292's
 * own instruction: this is flavour, not a record, and shouldn't look like a
 * thirteenth board card or a second archive-size line): a single line of
 * italic display-face text in a dashed-border well, no uppercase label, no
 * chevron, no big mono number — the visual grammar this design system
 * otherwise reserves for a stated fact ("an aside," not "another statistic").
 *
 * `href === null` (overdue, collective trivia — criterion 292's own
 * carve-out, neither has a single game or player to point at) renders as
 * plain text in a `<div>`. Everywhere else the whole card is the tap target,
 * `aria-label`led with the sentence itself so a screen reader gets the full
 * claim without depending on any visual affordance, same reasoning
 * `RecordCard`'s `claim` prop already establishes. `min-h-11` (44px) keeps a
 * short one-line fact's tap target at the project's touch-target floor even
 * though the text itself would wrap short of it.
 */
import Link from "next/link";

export interface FunFactCardProps {
  sentence: string;
  href: string | null;
}

export function FunFactCard({ sentence, href }: FunFactCardProps) {
  const text = (
    <p className="font-display text-base italic leading-snug text-text">{sentence}</p>
  );

  if (!href) {
    return (
      <div className="flex min-h-11 items-center rounded-[var(--radius)] border border-dashed border-line bg-surface px-4 py-3">
        {text}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={sentence}
      className="flex min-h-11 items-center rounded-[var(--radius)] border border-dashed border-line bg-surface px-4 py-3 text-inherit no-underline hover:border-brand"
    >
      {text}
    </Link>
  );
}
