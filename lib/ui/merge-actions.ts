/**
 * Fetch wrappers for player and place merges (PRD criteria 155–166).
 *
 * Same shape as `lib/ui/rename-actions.ts` / `lib/ui/game-actions.ts`:
 * `rejectCrossSitePost` (`lib/http/same-origin.ts`) 415s any mutating request
 * without a `Content-Type: application/json` header, so every POST here sends
 * it — split into named functions so the exact request shape is covered by a
 * unit test (`tests/ui/merge-actions.test.ts`) rather than trusted by
 * inspection.
 */

export function requestPlayerMergePreview(a: string, b: string): Promise<Response> {
  const params = new URLSearchParams({ a, b });
  return fetch(`/api/players/merge-preview?${params.toString()}`);
}

export function requestPlayerMerge(survivorId: string, loserId: string): Promise<Response> {
  return fetch("/api/players/merge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ survivorId, loserId }),
  });
}

export function requestLocationMerge(survivorId: string, loserId: string): Promise<Response> {
  return fetch("/api/locations/merge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ survivorId, loserId }),
  });
}
