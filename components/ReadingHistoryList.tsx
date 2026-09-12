"use client";

/**
 * `ReadingHistoryList` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Bottom sheet, `PickList`-shaped rows: source (full sheet / close-up), a
 * timestamp, and an **"Active"** `ok` `Pill` on the one currently in use.
 * Every reading a column has ever had is listed, not only the one directly
 * before the newest (PRD criterion 41) — tapping any other row opens
 * `ReadingCompare` against it.
 */

import { Pill } from "./Pill";
import { READING_HISTORY_ACTIVE_PILL, readingHistoryRowLabel } from "@/lib/ui/copy";

export interface ReadingHistoryItem {
  id: string;
  source: "sheet" | "close-up";
  /** ISO timestamp. */
  at: string;
  active: boolean;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ReadingHistoryList({
  readings,
  onSelect,
}: {
  /** Oldest first — `n` in "Reading {n}" is this array's 1-based position. */
  readings: readonly ReadingHistoryItem[];
  onSelect: (readingId: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {readings.map((reading, index) => (
        <li key={reading.id}>
          <button
            type="button"
            onClick={() => onSelect(reading.id)}
            className="flex min-h-13 w-full items-center justify-between gap-2 rounded-[var(--radius)] px-3 text-left text-base hover:bg-sunk"
          >
            <span>{readingHistoryRowLabel(index + 1, reading.source, formatWhen(reading.at))}</span>
            {reading.active ? <Pill tone="ok">{READING_HISTORY_ACTIVE_PILL}</Pill> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
