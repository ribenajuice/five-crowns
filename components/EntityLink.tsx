/**
 * `EntityLink` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3).
 *
 * A player or roster name appearing away from its own page: `--brand`,
 * underlined (`text-underline-offset: 2px`), colour never the only signal
 * that it's tappable. Three variants, matching the mockup
 * (`docs/mockups/stage-3-people-sets-places.html`):
 * - `brand` (default) — full brand-coloured link, used wherever a roster
 *   name appears (games list, player/roster pages' own games lists, the game
 *   view's `AppBar` title).
 * - `muted` — body-coloured text with a brand-coloured underline, used for a
 *   player name inside an already-styled row (`FinalRow`'s non-winner rows,
 *   the roster page's per-member list) where full brand blue on every name
 *   would fight the row's own colour.
 * - `success` — inherits `FinalRow`'s winner treatment: the link recolours
 *   to `--success` but *keeps* its underline, so "this is a link" and "this
 *   is the winner" stay two separate signals on the same text, never
 *   collapsed into one.
 * - `inherit` — `text-inherit`, no colour override at all, for a heading
 *   that doubles as a link (`AppBar`'s `titleHref`) and must read exactly
 *   like every other, untappable `AppBar` title — colour never signals
 *   tappability there, only the underline does. Added in the M3 Stage 4
 *   code-review follow-up so `AppBar` could reuse this component's hit-slop
 *   technique instead of hand-copying it (below).
 *
 * Every `EntityLink` gets a real ≥44px-tall tap target via padding (not by
 * resizing the visible text) — `py-3.5`/`-my-3.5` add invisible hit-slop
 * above and below the line without growing the row's own layout. `py-3.5`
 * (14px top + 14px bottom = 28px) is deliberately more than the 20px a naive
 * "44px minus a `text-base` line" calculation would suggest: the tightest
 * real call site wraps this in `text-sm` (13px / 1.45 line-height ≈ 18.85px
 * computed), where 28px of padding is what actually clears 44px (46.85px) —
 * `py-3` (24px) measured 42.85px there and failed the touch-target audit.
 */

import Link from "next/link";

export type EntityLinkVariant = "brand" | "muted" | "success" | "inherit";

const VARIANT_CLASSES: Record<EntityLinkVariant, string> = {
  brand: "text-brand",
  muted: "text-text decoration-brand",
  success: "text-success",
  inherit: "text-inherit",
};

interface EntityLinkProps {
  href: string;
  variant?: EntityLinkVariant;
  className?: string;
  children: React.ReactNode;
}

export function EntityLink({ href, variant = "brand", className, children }: EntityLinkProps) {
  return (
    <Link
      href={href}
      className={`-my-3.5 -mx-1 inline-block px-1 py-3.5 font-bold underline underline-offset-2 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
