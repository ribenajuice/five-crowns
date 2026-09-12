"use client";

/**
 * The bottom-sheet shell behind `PickList`, `CellEditor` and `CropFrame`.
 * Built on `<dialog>` — the platform primitive, per `CLAUDE.md`'s "prefer the
 * platform over libraries" — which gives us focus trapping, `Esc`-to-close
 * and a backdrop for free.
 */

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Taller sheets (CellEditor) get more room before scrolling kicks in. */
  tall?: boolean;
}

export function BottomSheet({ open, onClose, title, children, tall }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={title}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-read rounded-t-[var(--radius)] border-0 bg-surface p-0 backdrop:bg-black/40 sm:inset-x-0 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:mx-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius)]"
    >
      <div className={`${tall ? "max-h-[92dvh]" : "max-h-[80dvh]"} overflow-y-auto p-4`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] text-text-muted"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
