/**
 * `SaveBar` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Sticky footer: the save button plus one line of helper text — what's
 * blocking save, or what passing it means (never *checked, validated,
 * verified, confirmed, correct, looks right* or *all good* — PRD criterion 24).
 * Disabled only by the hard checks, never by an empty optional field.
 */

import { SAVE_BUTTON_BUSY_LABEL, SAVE_BUTTON_LABEL } from "@/lib/ui/copy";

export function SaveBar({
  disabled,
  busy,
  message,
  onSave,
}: {
  disabled: boolean;
  busy: boolean;
  message: string;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto w-full max-w-read">
        <button
          type="button"
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          onClick={onSave}
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-brand text-base font-bold text-on-brand disabled:opacity-60"
        >
          {busy ? SAVE_BUTTON_BUSY_LABEL : SAVE_BUTTON_LABEL}
        </button>
        <p className="mt-2 text-center text-sm text-text-muted" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}
