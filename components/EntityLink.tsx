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
 *
 * Every `EntityLink` gets a real 44px-tall tap target via padding (not by
 * resizing the visible text) — `py-3`/`-my-3` add invisible hit-slop above
 * and below the line without growing the row's own layout.
 */

import Link from "next/link";

export type EntityLinkVariant = "brand" | "muted" | "success";

const VARIANT_CLASSES: Record<EntityLinkVariant, string> = {
  brand: "text-brand",
  muted: "text-text decoration-brand",
  success: "text-success",
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
      className={`-my-3 -mx-1 inline-block px-1 py-3 font-bold underline underline-offset-2 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
