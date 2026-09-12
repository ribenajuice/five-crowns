/**
 * `PairedFlag` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Both cells of a broken pair get the `err` border and tint on the grid
 * itself; this is the sentence that goes with them — border, tint, icon
 * *and* wording together, because colour is never the only signal
 * (PRD criterion 21).
 */

import { WarningTriangleIcon } from "./icons";

export function PairedFlag({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-2 flex items-start gap-1.5 rounded-[var(--radius)] border border-error bg-error-soft px-3 py-2 text-sm text-error"
    >
      <WarningTriangleIcon />
      <p>{children}</p>
    </div>
  );
}
