/**
 * `RotateControl` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * One 44×44 `IconButton`. Cycles the preview 0°→90°→180°→270°→0° on tap, one
 * quarter turn per tap (PRD criterion 8). Rotation happens client-side,
 * before upload.
 */

import { ROTATE_ARIA_LABEL, ROTATE_CAPTION } from "@/lib/ui/copy";

export function RotateControl({ onRotate }: { onRotate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={ROTATE_ARIA_LABEL}
        onClick={onRotate}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius)] border border-line bg-surface text-brand"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
      <p className="text-center text-sm text-text-muted">{ROTATE_CAPTION}</p>
    </div>
  );
}
