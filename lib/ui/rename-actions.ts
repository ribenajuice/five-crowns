/**
 * Fetch wrappers for the roster and location rename routes — `RosterRenameControl`
 * and `LocationRenameControl` (PRD criteria 141–146).
 *
 * Same shape as `lib/ui/game-actions.ts`: `rejectCrossSitePost`
 * (`lib/http/same-origin.ts`) 415s any mutating request without a
 * `Content-Type: application/json` header, so every fetch here sends it —
 * split into named functions so the exact request shape is covered by a unit
 * test (`tests/ui/rename-actions.test.ts`) rather than trusted by inspection.
 */
export function requestRosterRename(
  rosterId: string,
  name: string,
  dryRun: boolean,
): Promise<Response> {
  return fetch(`/api/rosters/${rosterId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, dryRun }),
  });
}

export function requestLocationRename(locationId: string, name: string): Promise<Response> {
  return fetch(`/api/locations/${locationId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}
