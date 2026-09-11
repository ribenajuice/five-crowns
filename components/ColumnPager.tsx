/**
 * `ColumnPager` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Chips per player with a status dot. 44px tall, horizontally scrollable —
 * `sheet-02`'s five columns must fit with no horizontal scrolling of the
 * *grid* at 375px (PRD criterion 13), but the pager itself may scroll.
 */

export type ColumnStatus = "ok" | "warn" | "err" | "todo";

export interface ColumnPagerItem {
  id: string;
  label: string;
  status: ColumnStatus;
}

const DOT_CLASSES: Record<ColumnStatus, string> = {
  ok: "bg-success",
  warn: "bg-warn",
  err: "bg-error",
  todo: "border-2 border-text-muted bg-transparent",
};

export function ColumnPager({
  columns,
  activeId,
  onSelect,
  onAddColumn,
}: {
  columns: ColumnPagerItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** A missed player column — reaches for it without a configuration step. */
  onAddColumn?: () => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Columns"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {columns.map((column) => {
        const active = column.id === activeId;
        return (
          <button
            key={column.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active || undefined}
            onClick={() => onSelect(column.id)}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold ${
              active
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-text"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${DOT_CLASSES[column.status]}`}
            />
            {column.label}
          </button>
        );
      })}
      {onAddColumn ? (
        <button
          type="button"
          onClick={onAddColumn}
          aria-label="Add a player column"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-text-muted text-text-muted"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
