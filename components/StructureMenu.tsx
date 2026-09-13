"use client";

/**
 * `StructureMenu` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Opened from the "Fix something" ghost link right-aligned above
 * `ActiveColumnCard`. Bottom sheet, six equal-weight 52px rows in the
 * `PickList` row shape: add a missing column · remove this column · reassign
 * this column's player · reorder columns · insert or delete a value · type it
 * in by hand — the last set off by a dashed divider but never styled as a
 * last resort (criterion 47). Picking "Reorder columns" swaps the sheet's own
 * content in place (the same step-swapping convention `ReviewScreen` already
 * uses for the player-picker → `CropFrame` handoff) rather than opening a
 * second, nested sheet.
 *
 * ⚠️ **Deviation from a literal reading of the inventory row**: "Insert or
 * delete a value" hands off to the existing `CellEditor`'s own "Fix the
 * shape" flow (closing this sheet and opening that one) instead of
 * re-implementing a second, parallel row-picker inside this sheet. The
 * design system's screen rules are explicit that the repair "lives inside
 * `CellEditor`, not a separate screen" and reuses its own previous/next-line
 * controls as the row picker — building a duplicate picker here would give
 * the founder two different ways to reach the same action with two different
 * pickers, for no benefit. See the PR notes for the full reasoning.
 */

import {
  STRUCTURE_MENU_ADD_COLUMN_ROW,
  STRUCTURE_MENU_ADD_COLUMN_SUBCAPTION,
  STRUCTURE_MENU_HAND_ENTRY_ROW,
  STRUCTURE_MENU_HAND_ENTRY_SUBCAPTION,
  STRUCTURE_MENU_INSERT_DELETE_ROW,
  STRUCTURE_MENU_INSERT_DELETE_SUBCAPTION,
  STRUCTURE_MENU_REASSIGN_ROW,
  STRUCTURE_MENU_REASSIGN_SUBCAPTION,
  STRUCTURE_MENU_REMOVE_COLUMN_ROW,
  STRUCTURE_MENU_REMOVE_COLUMN_SUBCAPTION,
  STRUCTURE_MENU_REORDER_ROW,
  STRUCTURE_MENU_REORDER_SUBCAPTION,
} from "@/lib/ui/copy";

interface StructureMenuRow {
  label: string;
  subcaption: string;
  onSelect: () => void;
  disabled?: boolean;
}

function Row({ label, subcaption, onSelect, disabled }: StructureMenuRow) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="flex min-h-13 w-full flex-col items-start justify-center rounded-[var(--radius)] px-3 py-1.5 text-left disabled:opacity-40"
      >
        <span className="text-base font-bold">{label}</span>
        <span className="text-sm text-text-muted">{subcaption}</span>
      </button>
    </li>
  );
}

export interface StructureMenuProps {
  canAddColumn: boolean;
  canRemoveColumn: boolean;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onReassignPlayer: () => void;
  onReorder: () => void;
  onInsertOrDelete: () => void;
  onHandEntry: () => void;
}

export function StructureMenu({
  canAddColumn,
  canRemoveColumn,
  onAddColumn,
  onRemoveColumn,
  onReassignPlayer,
  onReorder,
  onInsertOrDelete,
  onHandEntry,
}: StructureMenuProps) {
  return (
    <ul className="flex flex-col gap-1">
      <Row
        label={STRUCTURE_MENU_ADD_COLUMN_ROW}
        subcaption={STRUCTURE_MENU_ADD_COLUMN_SUBCAPTION}
        onSelect={onAddColumn}
        disabled={!canAddColumn}
      />
      <Row
        label={STRUCTURE_MENU_REMOVE_COLUMN_ROW}
        subcaption={STRUCTURE_MENU_REMOVE_COLUMN_SUBCAPTION}
        onSelect={onRemoveColumn}
        disabled={!canRemoveColumn}
      />
      <Row
        label={STRUCTURE_MENU_REASSIGN_ROW}
        subcaption={STRUCTURE_MENU_REASSIGN_SUBCAPTION}
        onSelect={onReassignPlayer}
      />
      <Row
        label={STRUCTURE_MENU_REORDER_ROW}
        subcaption={STRUCTURE_MENU_REORDER_SUBCAPTION}
        onSelect={onReorder}
      />
      <Row
        label={STRUCTURE_MENU_INSERT_DELETE_ROW}
        subcaption={STRUCTURE_MENU_INSERT_DELETE_SUBCAPTION}
        onSelect={onInsertOrDelete}
      />
      <li className="mt-1 border-t border-dashed border-line pt-1">
        <Row
          label={STRUCTURE_MENU_HAND_ENTRY_ROW}
          subcaption={STRUCTURE_MENU_HAND_ENTRY_SUBCAPTION}
          onSelect={onHandEntry}
        />
      </li>
    </ul>
  );
}
