"use client";

/**
 * `Seg` — docs/DESIGN-SYSTEM.md § Component inventory. A two-way segmented
 * control, used on the game view to swap `ScoreTable` between "As written"
 * and "Per hand".
 */

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly [{ value: T; label: string }, { value: T; label: string }];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      // h-13 (52px) with p-1 padding leaves each button a 44px+ touch target.
      className="inline-flex h-13 rounded-[var(--radius)] border border-line bg-sunk p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`h-full rounded-[calc(var(--radius)-4px)] px-3 text-sm font-bold ${
              active ? "bg-surface text-brand shadow-sm" : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
