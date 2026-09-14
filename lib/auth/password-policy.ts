/**
 * Password-policy constants shared between server and client.
 *
 * Split out of `lib/auth/password.ts` on purpose: that module imports
 * `node:crypto` (for scrypt) and cannot be bundled client-side, but the
 * client-side password panels (`components/GroupPasswordPanel.tsx`,
 * `components/AdminPasswordPanel.tsx`) still need the same minimum length so
 * the field's own hint and early validation agree with what the server will
 * eventually enforce. This file has no imports of its own, so it is safe for
 * both sides — exactly one literal `12` in the codebase, here.
 */

/**
 * The floor for either password's *new* value, enforced server-side by both
 * `POST /api/admin/password/group` and `POST /api/admin/password/admin` (PRD
 * criteria 88, 92) — never only in a panel's `Field`, which a direct POST
 * bypasses entirely.
 */
export const NEW_PASSWORD_MIN_LENGTH = 12;
