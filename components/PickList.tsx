"use client";

/**
 * `PickList` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Existing entries as 52px rows, one pinned "add new" row always last. Picking
 * "add new" records a **pending** entry (shown with the `new` Pill) rather
 * than writing free text — it becomes a real row only when the game saves
 * (criteria 60, 62, 63). Meant to be rendered inside a `BottomSheet`.
 */

import { useState } from "react";

import { Pill } from "./Pill";
import { buttonClasses } from "./Button";

export interface PickListItem {
  id: string;
  label: string;
}

interface PickListProps {
  items: PickListItem[];
  selectedId: string | null;
  /** A pending name typed this session, not yet a row (criterion 63). */
  pendingLabel: string | null;
  addNewLabel: string;
  /** Shown above the list when there's nothing in it yet. */
  emptyMessage?: string;
  /** The venue field's explicit "No location" row (criterion 61). */
  clearRowLabel?: string;
  onSelect: (id: string) => void;
  onAddNew: (name: string) => void;
  onClear?: () => void;
}

export function PickList({
  items,
  selectedId,
  pendingLabel,
  addNewLabel,
  emptyMessage,
  clearRowLabel,
  onSelect,
  onAddNew,
  onClear,
}: PickListProps) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");

  function confirmAdd() {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) return;
    onAddNew(trimmed);
    setAdding(false);
    setDraftName("");
  }

  return (
    <div>
      {items.length === 0 && emptyMessage ? (
        <p className="mb-3 text-sm text-text-muted">{emptyMessage}</p>
      ) : null}

      <ul className="flex flex-col gap-1">
        {clearRowLabel ? (
          <li>
            <button
              type="button"
              onClick={onClear}
              aria-pressed={selectedId === null && pendingLabel === null}
              className="flex min-h-13 w-full items-center rounded-[var(--radius)] px-3 text-left text-base aria-pressed:bg-sunk aria-pressed:font-bold"
            >
              {clearRowLabel}
            </button>
          </li>
        ) : null}

        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selectedId === item.id}
              className="flex min-h-13 w-full items-center rounded-[var(--radius)] px-3 text-left text-base aria-pressed:bg-sunk aria-pressed:font-bold"
            >
              {item.label}
            </button>
          </li>
        ))}

        {pendingLabel ? (
          <li>
            <button
              type="button"
              aria-pressed="true"
              className="flex min-h-13 w-full items-center gap-2 rounded-[var(--radius)] bg-sunk px-3 text-left text-base font-bold"
              onClick={() => setAdding(true)}
            >
              {pendingLabel}
              <Pill tone="new">new</Pill>
            </button>
          </li>
        ) : null}

        <li className="mt-1 border-t border-line pt-1">
          {adding ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmAdd();
              }}
              className="flex items-center gap-2 px-1 py-1"
            >
              <label className="sr-only" htmlFor="picklist-new-name">
                {addNewLabel}
              </label>
              <input
                id="picklist-new-name"
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-[var(--radius)] border border-text-muted bg-surface px-3 text-base text-text"
                placeholder={addNewLabel}
              />
              <button type="submit" className={buttonClasses("primary")} style={{ width: "auto" }}>
                Add
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-13 w-full items-center rounded-[var(--radius)] px-3 text-left text-base font-bold text-brand"
            >
              {addNewLabel}
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}
