/**
 * Login rate limiting.
 *
 * ⚠️ **PRD criterion 5**: ten failed logins from one address inside ten minutes
 * cause further attempts to be refused with a plain "try again later" —
 * **including a correct one**. That last clause is the whole point: a limiter
 * that lets the right password through is not a limiter, it is a hint.
 *
 * Crude on purpose. A `login_attempt` row per address per minute, summed over a
 * ten-minute window. Group and admin logins are counted under separate scopes
 * so one cannot lock out the other.
 */

import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { loginAttempt } from "@/lib/db/schema";

import { hashIp } from "./ip-hash";

/** Ten failures. */
export const MAX_ATTEMPTS = 10;
/** ...inside ten minutes. */
export const WINDOW_MINUTES = 10;

export type RateLimitScope = "group" | "admin";

export interface RateLimitState {
  /** True when this address is refused, right or wrong password. */
  blocked: boolean;
  /** Failures counted in the current window. */
  failures: number;
}

function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / 60_000);
}

/**
 * How many failures this address has racked up in the window, and whether it is
 * blocked. Called **before** the password is even compared.
 */
export async function checkRateLimit(
  ip: string,
  scope: RateLimitScope,
  now: number = Date.now(),
): Promise<RateLimitState> {
  const bucket = currentBucket(now);
  const ipHash = await hashIp(ip);

  const rows = await getDb()
    .select({ total: sql<number>`coalesce(sum(${loginAttempt.count}), 0)` })
    .from(loginAttempt)
    .where(
      and(
        eq(loginAttempt.ipHash, ipHash),
        eq(loginAttempt.scope, scope),
        gte(loginAttempt.minuteBucket, bucket - WINDOW_MINUTES + 1),
      ),
    );

  const failures = Number(rows[0]?.total ?? 0);
  return { blocked: failures >= MAX_ATTEMPTS, failures };
}

/** Record one failed attempt. Successes are deliberately not recorded. */
export async function recordFailedAttempt(
  ip: string,
  scope: RateLimitScope,
  now: number = Date.now(),
): Promise<void> {
  const bucket = currentBucket(now);
  const ipHash = await hashIp(ip);

  await getDb()
    .insert(loginAttempt)
    .values({ ipHash, scope, minuteBucket: bucket, count: 1 })
    .onConflictDoUpdate({
      target: [
        loginAttempt.ipHash,
        loginAttempt.scope,
        loginAttempt.minuteBucket,
      ],
      set: { count: sql`${loginAttempt.count} + 1` },
    });
}

/**
 * Drop buckets that have fallen out of every window.
 *
 * No cleanup job and no scheduled Lambda: at 1–2 uploads a week the table never
 * gets big enough to be worth one, and pruning opportunistically on login keeps
 * the moving parts down.
 */
export async function pruneOldAttempts(now: number = Date.now()): Promise<void> {
  const cutoff = currentBucket(now) - WINDOW_MINUTES * 6;
  await getDb().delete(loginAttempt).where(lt(loginAttempt.minuteBucket, cutoff));
}
