"use client";

/**
 * `ScoreTable` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * The eleven running totals in the paper's column order, with `Seg` bringing
 * the derived hand scores alongside without losing the transcribed layer
 * (PRD criterion 70).
 */

import { useState } from "react";

import { HAND_LABELS } from "@/lib/scoring";
import type { GameColumn } from "@/lib/games/types";
import { Seg } from "./Seg";

type View = "written" | "hand";

export function ScoreTable({ columns }: { columns: GameColumn[] }) {
  const [view, setView] = useState<View>("written");
  const sorted = [...columns].sort((a, b) => a.columnOrder - b.columnOrder);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Seg<View>
          value={view}
          onChange={setView}
          options={[
            { value: "written", label: "As written" },
            { value: "hand", label: "Per hand" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-line bg-sunk">
              <th className="px-2 py-2 text-left text-xs font-bold uppercase tracking-label text-text-muted">
                Hand
              </th>
              {sorted.map((column) => (
                <th
                  key={column.playerId}
                  scope="col"
                  className={`px-3 py-2 text-right text-xs font-bold uppercase tracking-label ${
                    column.isWinner ? "text-success" : "text-text-muted"
                  }`}
                >
                  {column.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HAND_LABELS.map((label, index) => (
              <tr key={label} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  className="px-2 py-1.5 text-left text-xs font-bold uppercase tracking-label text-text-muted"
                >
                  {label}
                </th>
                {sorted.map((column) => (
                  <td
                    key={column.playerId}
                    className="tabular px-3 py-1.5 text-right text-base font-bold text-text"
                  >
                    {view === "written" ? column.runningTotals[index] : column.handScores[index]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-sunk">
              <th scope="row" className="px-2 py-2 text-left text-xs font-bold uppercase tracking-label text-text-muted">
                Final
              </th>
              {sorted.map((column) => (
                <td
                  key={column.playerId}
                  className={`tabular px-3 py-2 text-right text-num font-black ${
                    column.isWinner ? "text-success" : "text-text"
                  }`}
                >
                  {column.finalScore}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
