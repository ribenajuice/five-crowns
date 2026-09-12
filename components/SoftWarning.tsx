/**
 * `SoftWarning` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Same visual grammar as `PairedFlag`, in `warn` colours. ⚠️ It never disables
 * `SaveBar` — a soft warning is information, not a gate (PRD criterion 27).
 */

import { WarningTriangleIcon } from "./icons";

export function SoftWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-[var(--radius)] border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
      <WarningTriangleIcon />
      <p>{children}</p>
    </div>
  );
}
