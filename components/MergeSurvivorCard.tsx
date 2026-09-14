"use client";

/**
 * `MergeConfirmScreen`'s `survivor-card` — docs/DESIGN-SYSTEM.md § component
 * inventory: a radio-style row (`aria-pressed`, `--sunk`-highlight, the same
 * idiom `PickList` already uses for a selected row). Neither card is
 * pre-selected (criterion 156); picking one immediately labels both this one
 * ("Stays") and its sibling ("Deleted") via `state`, decided by the caller.
 */

import { Pill } from "./Pill";
import { SURVIVOR_PILL_DELETED, SURVIVOR_PILL_STAYS } from "@/lib/ui/copy";

export type SurvivorCardState = "unselected" | "stays" | "deleted";

interface MergeSurvivorCardProps {
  name: string;
  gamesLabel: string;
  state: SurvivorCardState;
  onClick: () => void;
}

export function MergeSurvivorCard({ name, gamesLabel, state, onClick }: MergeSurvivorCardProps) {
  const stays = state === "stays";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={stays}
      className={`flex w-full items-center gap-3 rounded-[var(--radius)] border p-4 text-left ${
        stays ? "border-brand bg-sunk" : "border-line bg-surface"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
          stays ? "border-brand" : "border-text-muted"
        }`}
      >
        {stays ? <span className="size-3 rounded-full bg-brand" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-bold">{name}</span>
        <span className="block text-sm text-text-muted">{gamesLabel}</span>
      </span>
      {state === "stays" ? <Pill tone="ok">{SURVIVOR_PILL_STAYS}</Pill> : null}
      {state === "deleted" ? <Pill tone="err">{SURVIVOR_PILL_DELETED}</Pill> : null}
    </button>
  );
}
