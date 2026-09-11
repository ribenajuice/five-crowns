/**
 * Path-parameter validation.
 *
 * ⚠️ Security review LOW 5. Every id this app ever mints is a
 * `crypto.randomUUID()`, so a path segment that isn't a UUID can only be a
 * probe — refusing it early with a plain 400 is cheaper than letting it reach
 * a query and, for the dev-photos route, keeps `stat`/`readFile` calls fed a
 * shape that was checked before touching the filesystem.
 */

import { z } from "zod";

const uuidSchema = z.string().uuid();

/** The parsed id, or `null` if the path segment isn't a UUID. */
export function parseUuidParam(value: string): string | null {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
