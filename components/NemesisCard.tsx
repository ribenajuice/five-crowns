/**
 * `NemesisCard` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 2),
 * § "The nemesis card".
 *
 * Same visual grammar as `RecordCard` — uppercase label, the opponent's name
 * in the display face, one sentence of detail, a chevron tap target through
 * to that opponent's `HeadToHeadRow` (criterion 206) — but personal rather
 * than board-wide: no per-holder sample line (there's only ever one subject,
 * the page it's on), and no joint-holder list rendered separately even though
 * criterion 199 allows joint nemeses (multiple names simply join with "&").
 *
 * **The founder's pick (open question 10)**: the flat "Nemesis" title,
 * candidate 1 of the five the ui-designer laid out — no banter layered on top
 * of the title itself, and the detail sentence is the founder-approved
 * template verbatim (`lib/ui/copy.ts`'s `nemesisDetailSentence`).
 *
 * **No nemesis** (criterion 201 — every above-rate is zero, or no shared
 * games at all) renders the `RecordCard` no-holder variant verbatim: the
 * value and chevron drop, `BOARD_NO_HOLDER_SENTENCE` takes their place —
 * reused rather than a second string invented for the same shape.
 */
import Link from "next/link";

import { ChevronRightIcon } from "./icons";
import { BOARD_NO_HOLDER_SENTENCE, NEMESIS_CARD_TITLE } from "@/lib/ui/copy";

export interface NemesisCardProps {
  /** `null` when nobody qualifies (criterion 201) — renders the no-holder variant. */
  opponentName: string | null;
  detail: string | null;
  href: string | null;
}

export function NemesisCard({ opponentName, detail, href }: NemesisCardProps) {
  if (!opponentName || !detail || !href) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
        <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
          {NEMESIS_CARD_TITLE}
        </span>
        <p className="mt-2 font-display text-base italic text-text-muted">
          {BOARD_NO_HOLDER_SENTENCE}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`${NEMESIS_CARD_TITLE}: ${opponentName}. ${detail}`}
      className="block rounded-[var(--radius)] border border-line bg-surface p-4 text-inherit no-underline hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-label text-text-muted">
          {NEMESIS_CARD_TITLE}
        </span>
        <ChevronRightIcon className="mt-0.5 shrink-0 text-brand" />
      </div>
      <p className="mt-1.5 font-display text-lg font-bold leading-tight">{opponentName}</p>
      <p className="mt-1.5 text-sm leading-snug text-text-muted">{detail}</p>
    </Link>
  );
}
