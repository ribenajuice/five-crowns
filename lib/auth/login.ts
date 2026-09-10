/**
 * The shared body of both login handlers.
 *
 * Group and admin logins differ only in which password hash they check, which
 * cookie they set and which rate-limit scope they count under — so they share
 * one implementation and cannot drift apart.
 */

import "server-only";

import { z } from "zod";

import { passwordHash, sessionEpoch, MissingParameterError } from "@/lib/config";
import { log } from "@/lib/log";

import { parseHash, verifyPassword } from "./password";
import {
  checkRateLimit,
  pruneOldAttempts,
  recordFailedAttempt,
} from "./rate-limit";
import { sessionSecret } from "./secret";
import { signSession, type SessionScope } from "./token";

/**
 * ⚠️ Validate at the boundary. A password is a string of 1–512 characters and
 * nothing else — no object, no array, no 10 MB body to make scrypt chew on.
 */
export const loginSchema = z.object({
  password: z.string().min(1).max(512),
});

export type LoginOutcome =
  | { status: "ok"; token: string }
  | { status: "rate_limited" }
  | { status: "invalid" }
  | { status: "not_configured" };

/**
 * Verify a password and mint a session.
 *
 * Order matters: the rate limit is checked **before** the password is compared,
 * so a blocked address is refused even when it finally types the right one
 * (PRD criterion 5).
 */
export async function attemptLogin(
  scope: SessionScope,
  password: string,
  ip: string,
): Promise<LoginOutcome> {
  const limit = await checkRateLimit(ip, scope);
  if (limit.blocked) {
    log.warn("login.rate_limited", { scope, failures: limit.failures });
    return { status: "rate_limited" };
  }

  let stored: string;
  try {
    stored = await passwordHash(scope);
  } catch (error) {
    if (error instanceof MissingParameterError) {
      // No hash has ever been set. scripts/deploy.sh refuses to deploy in this
      // state, so reaching it means something is wrong with the environment
      // rather than with the person typing.
      log.error("login.no_password_hash", { scope });
      return { status: "not_configured" };
    }
    throw error;
  }

  if (parseHash(stored) === null) {
    // ⚠️ The person typing is told only "that password is wrong" — it would be
    // an oracle otherwise — so this line is the one place a corrupted or
    // mistyped hash shows up at all. Without it, a mangled hash looks exactly
    // like a forgotten password. The value itself is never logged.
    log.error("login.malformed_password_hash", {
      scope,
      hint: "Regenerate it with node scripts/hash-password.js and store it again.",
    });
  }

  const ok = await verifyPassword(password, stored);
  if (!ok) {
    await recordFailedAttempt(ip, scope);
    log.info("login.failed", { scope, failures: limit.failures + 1 });
    return { status: "invalid" };
  }

  const epoch = await sessionEpoch(scope);
  const token = await signSession({ s: scope, v: epoch }, sessionSecret());

  // Cheap opportunistic cleanup; no scheduled job for a table this small.
  void pruneOldAttempts().catch(() => undefined);

  log.info("login.ok", { scope, epoch });
  return { status: "ok", token };
}

/**
 * ⚠️ The same sentence for a blocked address whatever the password was. It must
 * not leak whether the password was right, or the limiter becomes an oracle.
 */
export const RATE_LIMITED_MESSAGE = "Too many tries. Try again later.";
export const INVALID_MESSAGE = "That password's wrong.";
export const NOT_CONFIGURED_MESSAGE =
  "This app has no password set yet. It needs setting up before anyone can get in.";
