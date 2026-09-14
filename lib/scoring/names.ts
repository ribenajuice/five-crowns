/**
 * Case-insensitive display-name comparator.
 *
 * The one comparator every alphabetical-by-display-name list in this app
 * sorts with: the players index, the rosters index, the places index, a
 * roster's own auto-name (`rosterDisplayName`, below), and the records
 * board's holder list. Extracted here — pure and dependency-free, same as
 * the rest of `lib/scoring` — so all five agree, instead of five separately
 * maintained copies of the same `localeCompare` call.
 *
 * ⚠️ `sensitivity: "base"` is deliberate: a raw code-point sort puts every
 * capital letter before every lower-case one, so "Zoe" would sort before
 * "abby" — wrong alphabetically, and a list whose order looks like a bug the
 * moment two names differ only in case.
 */
export function compareDisplayNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}
