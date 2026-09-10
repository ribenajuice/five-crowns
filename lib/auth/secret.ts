/**
 * The HMAC key for both session cookies.
 *
 * Owned by the **deploy**, not the admin panel — it is needed before anyone can
 * log in — so it arrives as an ordinary environment variable, injected at cold
 * start from `/five-crowns/{stage}/session-secret`.
 *
 * ⚠️ Never in code, never in the database, never in the browser bundle.
 * `scripts/deploy.sh` refuses to deploy without it.
 *
 * Kept in its own module, free of Next.js imports, so the login path can be
 * unit tested without a request context.
 */

import { SESSION_SECRET_ENV } from "@/lib/config/parameters";

export class MissingSessionSecretError extends Error {
  override name = "MissingSessionSecretError";
  constructor() {
    super(
      `${SESSION_SECRET_ENV} is not set. It is created once, by hand, in Parameter Store; scripts/deploy.sh refuses to deploy without it.`,
    );
  }
}

export function sessionSecret(): string {
  const secret = process.env[SESSION_SECRET_ENV];
  if (!secret) throw new MissingSessionSecretError();
  return secret;
}
