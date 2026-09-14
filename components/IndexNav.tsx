/**
 * `IndexNav` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3),
 * criterion 174's answer to "all three index pages reachable from the games
 * list". Three equal-width `ghost`-shaped tiles — Players, Rosters, Places —
 * each ≥48px tall with a brand-coloured glyph above the (always-visible)
 * label. Always rendered, even against the games list's empty state.
 */

import Link from "next/link";

import { PlacesIcon, PlayersIcon, RostersIcon } from "./icons";
import { INDEX_NAV_ARIA_LABEL, INDEX_NAV_PLACES_LABEL, INDEX_NAV_PLAYERS_LABEL, INDEX_NAV_ROSTERS_LABEL } from "@/lib/ui/copy";

const TILE_CLASSES =
  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-line bg-surface px-1 py-2 text-sm font-bold text-brand";

export function IndexNav() {
  return (
    <nav aria-label={INDEX_NAV_ARIA_LABEL} className="grid grid-cols-3 gap-2">
      <Link href="/players" className={TILE_CLASSES}>
        <PlayersIcon />
        {INDEX_NAV_PLAYERS_LABEL}
      </Link>
      <Link href="/rosters" className={TILE_CLASSES}>
        <RostersIcon />
        {INDEX_NAV_ROSTERS_LABEL}
      </Link>
      <Link href="/places" className={TILE_CLASSES}>
        <PlacesIcon />
        {INDEX_NAV_PLACES_LABEL}
      </Link>
    </nav>
  );
}
