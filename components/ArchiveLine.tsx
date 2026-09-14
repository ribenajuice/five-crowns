/**
 * `ArchiveLine` — docs/DESIGN-SYSTEM.md § Component inventory (M3 Stage 1).
 *
 * One line, top of the board's body, above everything else. Two states share
 * one neutral `--sunk` box — never `warn`/`error`, it's a fact, not a problem.
 * Under `EARLY_DAYS_BELOW` games it's criterion 183's line verbatim, which
 * also satisfies criterion 182's archive-size statement while it's showing;
 * at `EARLY_DAYS_BELOW` and above it's absent in favour of a different, plain
 * sentence — never the same sentence reworded.
 */
import { archiveCountLine, earlyDaysLine } from "@/lib/ui/copy";

export interface ArchiveLineProps {
  archiveGameCount: number;
  earlyDays: boolean;
}

export function ArchiveLine({ archiveGameCount, earlyDays }: ArchiveLineProps) {
  return (
    <div
      className={`rounded-[var(--radius)] bg-sunk px-3.5 py-3 text-sm ${
        earlyDays ? "text-text" : "text-text-muted"
      }`}
    >
      {earlyDays ? earlyDaysLine(archiveGameCount) : archiveCountLine(archiveGameCount)}
    </div>
  );
}
