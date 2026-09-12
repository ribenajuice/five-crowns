/**
 * Roster identity.
 *
 * A roster is the **exact, order-independent set** of players in a game — the
 * founder's "how do we do when it's exactly these four?". Its identity is a
 * signature so the same set of people always resolves to the same roster row
 * (docs/DECISIONS.md, "Roster identity: a sorted-player-id signature").
 *
 *   signature = the roster's player IDs, sorted ascending, joined with ':'
 *   e.g. p_3f2a:p_9ab1:p_c410
 *
 * - **Order-independent**, because we sort before joining.
 * - **Rename-proof**, because it is built from immutable `player.id`, never
 *   from names. Renaming a player cannot fork a roster.
 * - **Exact-match only**: a 4-player and a 5-player signature are different
 *   strings and cannot collide. No subset grouping, by design.
 *
 * Pure and dependency-free.
 */

import { MIN_PLAYERS } from "./constants";

/** The separator is part of the stored format. Changing it is a migration. */
export const ROSTER_SIGNATURE_SEPARATOR = ":";

export class RosterSignatureError extends Error {
  override name = "RosterSignatureError";
}

/**
 * Build a roster signature from a set of player ids.
 *
 * Duplicates are collapsed — the same person listed twice is still one member —
 * and the result is stable regardless of the order the ids arrive in.
 *
 * @throws {RosterSignatureError} if any id is empty or contains the separator,
 * which would make the signature ambiguous, or if no ids are supplied.
 */
export function rosterSignature(playerIds: readonly string[]): string {
  const unique = new Set<string>();

  for (const raw of playerIds) {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new RosterSignatureError("A roster member id must be a non-empty string.");
    }
    if (raw.includes(ROSTER_SIGNATURE_SEPARATOR)) {
      throw new RosterSignatureError(
        `A roster member id must not contain "${ROSTER_SIGNATURE_SEPARATOR}".`,
      );
    }
    unique.add(raw);
  }

  if (unique.size === 0) {
    throw new RosterSignatureError("A roster needs at least one member.");
  }

  // Sorted ascending by code unit, which is what the stored signatures are
  // ordered by. Deliberately not locale-aware: this is an identity, not text.
  return [...unique].sort().join(ROSTER_SIGNATURE_SEPARATOR);
}

/** The member ids in a signature, in signature order. */
export function rosterMembers(signature: string): string[] {
  if (signature.length === 0) return [];
  return signature.split(ROSTER_SIGNATURE_SEPARATOR);
}

/**
 * The denormalised `roster.size`, so "all our four-player nights" stays a cheap
 * query. Derived from the same de-duplicated set as the signature.
 */
export function rosterSize(playerIds: readonly string[]): number {
  return rosterMembers(rosterSignature(playerIds)).length;
}

/** Two sets of players are the same roster when their signatures match. */
export function isSameRoster(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return rosterSignature(a) === rosterSignature(b);
}

/** A roster below this is a transcription failure, not a game. */
export function isPlayableRoster(playerIds: readonly string[]): boolean {
  return new Set(playerIds).size >= MIN_PLAYERS;
}

/**
 * A roster's default display name, built from its members — used whenever
 * `roster.name` is null (PRD criterion 68). Format per `docs/DESIGN-SYSTEM.md`:
 * **alphabetical order, joined "A, B, C & D"**.
 *
 * ⚠️ The sort is case-insensitive (`sensitivity: "base"`): a raw code-point
 * sort puts every capital letter before every lower-case one, so "Player D"
 * would sort before "player c" — wrong alphabetically, and a roster whose
 * order looks like a bug the moment two names differ only in case.
 */
export function rosterDisplayName(memberDisplayNames: readonly string[]): string {
  const names = [...memberDisplayNames].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
