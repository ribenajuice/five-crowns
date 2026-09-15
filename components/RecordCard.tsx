/**
 * `RecordCard` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 1),
 * extended by M3 Stage 3 with the instance-list variant (criteria 228,
 * 230–231, 233).
 *
 * Flat, equal-weight — title, holder(s), value, per-holder sample. No
 * ranking styling (no crowns, no medal colour, no 1st/2nd/3rd): this is five
 * (now twelve) independent facts, not a leaderboard (criterion 180). The
 * whole card is the tap target to its drill-through; a small chevron is the
 * only visual affordance, and the link's own `aria-label` states the claim so
 * a screen reader doesn't need the chevron to know it's tappable.
 *
 * Joint holders (criterion 181): every holder's name, alphabetical, joined
 * with the same "A, B & C" grammar `rosterDisplayName` already establishes
 * for `GameRow`'s shared-win label and an auto-named roster.
 *
 * ⚠️ The stalwart's card is the one documented exception (criterion 196,
 * design system "the records board"): its value *is* the holder's own game
 * count, so a second "from N games" sentence would repeat the same figure —
 * `sample` is simply omitted by the caller for that record.
 *
 * ⚠️ **The instance-list variant** (`instances`, M3 Stage 3): when a
 * single-event record (best/worst game ever, the catastrophe, cleanest
 * sheet, biggest hammering) is tied, criterion 181's "list every holder's
 * name against one shared number" grammar doesn't hold — the same player can
 * be one of two *instances* (two different games at the tied score, or for
 * the catastrophe, two different hands). When `instances` is supplied and
 * non-empty, the holder-name and sample lines are replaced by a stacked list
 * of instance rows (name left, date — or "{hand} · {date}" — right), under
 * the one shared number. The caller decides which variant applies: a
 * single-instance single-event record still renders through the ordinary
 * path below (`holderNames` + a date-based `sample`, criterion 233).
 *
 * A `holders.length === 0` record (criterion 185) drops the value and
 * chevron for a plain italic sentence, never styled as a warning — not
 * reachable by any of Stage 1's five records over a non-empty archive, but
 * handled here because the board renders through one shared path regardless.
 *
 * ⚠️ **`noHolderSentence`** (M4 second slice, QA fix): the generic
 * `BOARD_NO_HOLDER_SENTENCE` remains the default for every record that has
 * never had a bespoke no-holder line, but criterion 312 fixes four of its own
 * — "Nobody's numbers look suspicious yet.", "Nobody's currently getting
 * wrecked.", "Nobody's clawed one back yet." and "Nobody's earned a range
 * yet — two games gets you in." — verbatim, not this shared fallback. The
 * caller passes its own record's string when it has one.
 */
import Link from "next/link";

import { ChevronRightIcon } from "./icons";
import { BOARD_NO_HOLDER_SENTENCE } from "@/lib/ui/copy";

export interface RecordCardInstance {
  /** One holder's name, or a criterion-181 joint name when the instance is itself a shared win (biggest hammering's own documented case). */
  label: string;
  /** The instance's own date, or "{hand} · {date}" for the catastrophe. */
  date: string;
}

export interface RecordCardProps {
  title: string;
  holderNames: string;
  value: string | null;
  unit: string;
  sample: string | null;
  href: string;
  /** The claim, stated in full, for the card's own `aria-label`. */
  claim: string;
  /** The instance-list variant (M3 Stage 3) — see this file's own doc comment. `undefined`/empty renders the ordinary card. */
  instances?: readonly RecordCardInstance[];
  /** This record's own fixed no-holder sentence (criterion 312), when it has one. Falls back to `BOARD_NO_HOLDER_SENTENCE` — see this file's own doc comment. */
  noHolderSentence?: string;
}

export function RecordCard({
  title,
  holderNames,
  value,
  unit,
  sample,
  href,
  claim,
  instances,
  noHolderSentence,
}: RecordCardProps) {
  if (value === null) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
        <span className="block text-xs font-bold uppercase tracking-label text-text-muted">
          {title}
        </span>
        <p className="mt-2 font-display text-base italic text-text-muted">
          {noHolderSentence ?? BOARD_NO_HOLDER_SENTENCE}
        </p>
      </div>
    );
  }

  const isInstanceList = instances && instances.length > 0;

  return (
    <Link
      href={href}
      aria-label={claim}
      className="block rounded-[var(--radius)] border border-line bg-surface p-4 text-inherit no-underline hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-label text-text-muted">
          {title}
        </span>
        <ChevronRightIcon className="mt-0.5 shrink-0 text-brand" />
      </div>

      {isInstanceList ? (
        <>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="tabular text-num-lg font-black">{value}</span>
            <span className="text-sm font-bold text-text-muted">{unit}</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {instances.map((instance, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span className="font-display text-base font-bold leading-tight">
                  {instance.label}
                </span>
                <span className="shrink-0 text-xs text-text-muted">{instance.date}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 font-display text-lg font-bold leading-tight">{holderNames}</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="tabular text-num-lg font-black">{value}</span>
            <span className="text-sm font-bold text-text-muted">{unit}</span>
          </div>
          {sample ? <p className="mt-2 text-sm leading-snug text-text-muted">{sample}</p> : null}
        </>
      )}
    </Link>
  );
}
