/**
 * Reads the stable `error.code` out of a parsed JSON error body — the same
 * shape `lib/http/errors.ts`'s `ApiErrorBody` describes, duplicated here
 * rather than imported so client components never pull in that server-only
 * module (it imports `next/server`).
 *
 * Every admin-panel form, and `components/PasswordGate.tsx`, keys its error
 * copy off this `code`, never off the server's own sentence
 * (docs/DESIGN-SYSTEM.md § Voice & tone).
 */
export function errorCodeOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }
  const code = (body as { error: { code?: unknown } }).error?.code;
  return typeof code === "string" ? code : null;
}
