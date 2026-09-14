/**
 * Roster renaming — PRD criteria 141–144.
 *
 * `docs/DESIGN-SYSTEM.md` § "Renaming a roster": trimmed and capped at 40
 * characters; clearing the field restores the auto-name (there is no state in
 * which a roster displays an empty name); a case-insensitive duplicate of
 * another roster's *displayed* name is accepted after a non-blocking warning
 * naming the other roster **by its members**, never by the now-identical
 * name text; a rename never touches `signature`, so it can never change which
 * roster a re-entered exact set matches (criterion 144 — nothing here writes
 * to `roster_member` or recomputes anything identity-bearing).
 */

import "server-only";

import { eq, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { roster } from "@/lib/db/schema";
import { rosterDisplayName } from "@/lib/scoring";
import { MAX_ROSTER_NAME_LENGTH } from "@/lib/ui/constants";

import { effectiveRosterName, membersByRoster } from "./queries";

/**
 * The roster's own maximum, per criterion 141. Re-exported from
 * `lib/ui/constants.ts` (not declared here) so the rename form — a client
 * component — can use the identical number for its `maxlength` attribute
 * without importing this `server-only` module.
 */
export { MAX_ROSTER_NAME_LENGTH };

export class RosterNotFoundError extends Error {
  override name = "RosterNotFoundError";
}

export interface RosterNameDuplicate {
  rosterId: string;
  memberNames: string[];
  /** `memberNames`, formatted the same way the app renders an auto-name. */
  membersLabel: string;
}

export interface RosterRenameResult {
  id: string;
  /** The stored `roster.name` — `null` when this roster is back on its auto-name. */
  name: string | null;
  /** What actually renders — `name`, or the auto-name built from members. */
  displayName: string;
  /**
   * Set when another roster's *displayed* name matches this one
   * case-insensitively (criterion 143). Never blocks — see `dryRun` below for
   * how the frontend can check before committing.
   */
  duplicate: RosterNameDuplicate | null;
}

export interface RenameRosterOptions {
  /**
   * When true, resolves and reports what would happen — including any
   * duplicate — without writing anything. Lets the frontend show the
   * criterion-143 warning and get a real "Save anyway" confirmation before
   * committing, without a second round-trip re-deriving the same answer.
   */
  dryRun?: boolean;
}

/**
 * Trim and cap at 40 characters; an all-blank result clears the custom name
 * (criterion 142). Never throws on input shape — the field is free text by
 * design, and there is no "invalid roster name" to report.
 */
function normaliseRosterName(raw: string): string | null {
  const trimmed = raw.trim().slice(0, MAX_ROSTER_NAME_LENGTH).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** @throws {RosterNotFoundError} if `id` doesn't name a real roster. */
export async function renameRoster(
  id: string,
  rawName: string,
  options: RenameRosterOptions = {},
): Promise<RosterRenameResult> {
  const db = getDb();

  const rosterRow = (await db.select().from(roster).where(eq(roster.id, id)))[0];
  if (!rosterRow) throw new RosterNotFoundError();

  const byRoster = await membersByRoster();
  const ownMembers = byRoster.get(id) ?? [];

  const newName = normaliseRosterName(rawName);
  const displayName = newName ?? rosterDisplayName(ownMembers.map((m) => m.displayName));

  // Every other roster's displayed name, to find a case-insensitive match.
  // Small scale (a few hundred rosters at the real ceiling), so a full scan
  // is simplest and cheapest to keep correct.
  const others = await db.select().from(roster).where(ne(roster.id, id));
  const target = displayName.trim().toLowerCase();

  let duplicate: RosterNameDuplicate | null = null;
  for (const other of others) {
    const otherMembers = byRoster.get(other.id) ?? [];
    const otherDisplayName = effectiveRosterName(other, otherMembers);
    if (otherDisplayName.trim().toLowerCase() === target) {
      const memberNames = otherMembers.map((m) => m.displayName);
      duplicate = {
        rosterId: other.id,
        memberNames,
        membersLabel: rosterDisplayName(memberNames),
      };
      break;
    }
  }

  if (!options.dryRun) {
    await db.update(roster).set({ name: newName }).where(eq(roster.id, id));
  }

  return { id, name: newName, displayName, duplicate };
}
