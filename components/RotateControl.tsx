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
          <path d="M4 4v6h6" />
          <path d="M20 20a9 9 0 1 0-2.6-13.4L4 10" />
        </svg>
      </button>
      <p className="text-center text-sm text-text-muted">{ROTATE_CAPTION}</p>
    </div>
  );
}
