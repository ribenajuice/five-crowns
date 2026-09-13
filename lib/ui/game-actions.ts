"use client";

/**
 * Fetch wrappers for the two game-view mutations: "Edit this game"
 * (`GameActions`) and "Delete permanently" (`DeleteGameCard`).
 *
 * ⚠️ Security review: both routes call `rejectCrossSitePost`
 * (`lib/http/same-origin.ts`), which 415s any request without a
 * `Content-Type: application/json` header — that's the CSRF defence, not a
 * bug to work around. Neither request has any real payload, but every other
 * mutating fetch in this app (`AddGameFlow`, `ReviewScreen`, `PasswordGate`)
 * always pairs that header with a body, so `body: "{}"` follows the same
 * convention here rather than sending the header alone. Split into named
 * functions — not inlined in the two components — so the exact request shape
 * reaching the network is covered by a unit test
 * (`tests/ui/game-actions.test.ts`); the previous version had no
 * `Content-Type` at all and every real "Edit this game" / "Delete
 * permanently" tap 415'd invisibly.
 */
export function requestGameEdit(gameId: string): Promise<Response> {
  return fetch(`/api/games/${gameId}/edit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}

export function requestGameDelete(gameId: string): Promise<Response> {
  return fetch(`/api/games/${gameId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
