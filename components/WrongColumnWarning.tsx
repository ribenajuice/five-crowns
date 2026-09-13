/**
 * `WrongColumnWarning` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * A `Banner warn` above `ReadingCompare`'s grid — non-blocking, same shape as
 * everywhere else `Banner` is used — for when the close-up's own read of the
 * handwritten name disagrees with the column it was shot for (PRD criterion
 * 42). Neither of `ReadingCompare`'s footer buttons is disabled underneath it;
 * this component has no opinion on that, it just says what it noticed.
 */

import { Banner } from "./Banner";
import { WRONG_COLUMN_WARNING_MESSAGE, wrongColumnWarningTitle } from "@/lib/ui/copy";

export function WrongColumnWarning({
  sheetPlayer,
  assignedPlayer,
}: {
  sheetPlayer: string;
  assignedPlayer: string;
}) {
  return (
    <Banner tone="warn" title={wrongColumnWarningTitle(sheetPlayer, assignedPlayer)}>
      {WRONG_COLUMN_WARNING_MESSAGE}
    </Banner>
  );
}
