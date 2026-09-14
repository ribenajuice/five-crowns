/**
 * `BoardNav` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 1).
 *
 * Two fixed buttons side by side, directly under `ArchiveLine`: `ghost`
 * "Games", `primary` "Add a game" — rendered on every board state including
 * the empty one (criteria 179, 191), the same "always reachable" precedent
 * `IndexNav` set on the games list.
 */
import { ButtonLink } from "./Button";
import { BOARD_NAV_ADD_GAME_LABEL, BOARD_NAV_GAMES_LABEL } from "@/lib/ui/copy";

export function BoardNav() {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <ButtonLink href="/games" variant="ghost" fullWidth>
          {BOARD_NAV_GAMES_LABEL}
        </ButtonLink>
      </div>
      <div className="flex-1">
        <ButtonLink href="/games/new" variant="primary" fullWidth>
          {BOARD_NAV_ADD_GAME_LABEL}
        </ButtonLink>
      </div>
    </div>
  );
}
