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
      // h-14 (56px), minus the 1px border on each edge and the 4px padding
      // on each edge, leaves each button 46px tall — the border was the part
      // the previous h-13 (52px) comment missed, landing tabs at 42px
      // (PRD criterion 73: every touch target at least 44px).
      className="inline-flex h-14 rounded-[var(--radius)] border border-line bg-sunk p-1"
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
