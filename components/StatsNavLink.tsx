/**
 * `StatsNavLink` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 3,
 * criterion 236). A single full-width `ghost` button, directly under
 * `BoardNav` on the board and directly under `IndexNav` on the games list —
 * `/stats` is one page, not an index of many entities, so it gets its own
 * link rather than being folded into either fixed component. Rendered on
 * every state of both screens it appears on, same "always reachable"
 * precedent its neighbours already set.
 */
import { ButtonLink } from "./Button";
import { STATS_NAV_LINK_LABEL } from "@/lib/ui/copy";

export function StatsNavLink() {
  return (
    <ButtonLink href="/stats" variant="ghost" fullWidth>
      {STATS_NAV_LINK_LABEL}
    </ButtonLink>
  );
}
