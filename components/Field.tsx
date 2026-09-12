/**
 * `Field` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * 52px tall, label above in the uppercase-xs style, outline `--text-muted`
 * (never `--line`, which is decorative only, so the field stays ≥3:1 against
 * its surface without relying on colour alone).
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, trailing, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-xs font-bold uppercase tracking-label text-text-muted"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={`h-13 w-full rounded-[var(--radius)] border border-text-muted bg-surface px-3 text-base text-text ${trailing ? "pr-11" : ""} ${className ?? ""}`}
          {...rest}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
});
