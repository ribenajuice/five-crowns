"use client";

/**
 * `ColumnReorderList` — docs/DESIGN-SYSTEM.md § Component inventory, inside
 * `StructureMenu`'s "Reorder columns" step.
 *
 * A vertical list, one 44px+ row per column in current left-to-right order,
 * each row a status dot + player name plus two 44×44 `IconButton`s (up/down)
 * that swap it with its neighbour. ⚠️ **Decision: up/down buttons, not
 * drag-and-drop** (docs/DESIGN-SYSTEM.md § "Reordering columns", criterion
 * 32) — fiddly with fat thumbs, and this reuses `PickList`'s row shape with a
 * real 44×44 target per direction that works with a keyboard or screen reader
 * for free. A boundary row's inapplicable direction is `disabled`, never a
 * dead tap.
 */

import { REORDER_MOVE_DOWN_ARIA_LABEL, REORDER_MOVE_UP_ARIA_LABEL } from "@/lib/ui/copy";
import type { ColumnStatus } from "./ColumnPager";

export interface ColumnReorderItem {
  id: string;
  label: string;
  status: ColumnStatus;
}

const DOT_CLASSES: Record<ColumnStatus, string> = {
  ok: "bg-success",
  warn: "bg-warn",
  err: "bg-error",
  todo: "border-2 border-text-muted bg-transparent",
  reading: "border-2 border-accent bg-transparent",
};

function MoveIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === "up" ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M5 12l7 7 7-7"} />
    </svg>
  );
}

export function ColumnReorderList({
  items,
  onMoveUp,
  onMoveDown,
}: {
  items: ColumnReorderItem[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li
          key={item.id}
          className="flex min-h-13 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-2 py-1"
        >
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${DOT_CLASSES[item.status]}`}
          />
          <span className="min-w-0 flex-1 truncate text-base">{item.label}</span>
          <button
            type="button"
            aria-label={`${REORDER_MOVE_UP_ARIA_LABEL}: ${item.label}`}
            disabled={i === 0}
            onClick={() => onMoveUp(item.id)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-text disabled:opacity-30"
          >
            <MoveIcon direction="up" />
          </button>
          <button
            type="button"
            aria-label={`${REORDER_MOVE_DOWN_ARIA_LABEL}: ${item.label}`}
            disabled={i === items.length - 1}
            onClick={() => onMoveDown(item.id)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-text disabled:opacity-30"
          >
            <MoveIcon direction="down" />
          </button>
        </li>
      ))}
    </ul>
  );
}
