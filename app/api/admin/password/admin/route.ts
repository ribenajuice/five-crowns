/**
 * POST /api/admin/password/admin — rotate the admin password.
 *
 * ⚠️ Requires the *current* admin password in the same request (PRD criterion
 * 91), unlike the group route beside this one: someone at an unattended
 * unlocked screen must not be able to take ownership just because a session
 * is open. A wrong current password changes nothing and leaves the existing
 * password working, and it counts as a failed attempt against the **same**
 * rate-limit scope and bucket as `/api/admin/login` (criterion 95) — this
 * reuses `lib/auth/rate-limit`'s `"admin"` scope directly, the same table
 * `attemptLogin` in `lib/auth/login.ts` counts against.
 *
 * The new password must be entered twice and be at least
 * {@link NEW_PASSWORD_MIN_LENGTH} characters, both checked here even though
 * the panel already checks them client-side (criterion 92) — the server
 * never trusts the client.
 *
 * On success: `admin-password-hash` is replaced and `admin-session-epoch` is
 * bumped, which signs out every admin session — including the one that just
 * made the change (criterion 93). The group epoch is untouched.
 *
 * Requires a full admin session — group **and** admin, in that order, exactly
 * like every other route behind `/admin` (criterion 87; mirrors
 * `app/api/admin/key/route.ts`).
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { clientIp } from "@/lib/auth/client-ip";
import {
  INVALID_MESSAGE,
  NOT_CONFIGURED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/auth/login";
import { NEW_PASSWORD_MIN_LENGTH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { reserveAttempt } from "@/lib/auth/rate-limit";
import { hasSession } from "@/lib/auth/session";
import {
  bumpSessionEpoch,
  MissingParameterError,
  PARAM,
  passwordHash,
  putParameter,
} from "@/lib/config";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(512),
  newPassword: z.string().min(NEW_PASSWORD_MIN_LENGTH).max(512),
  confirmPassword: z.string().min(NEW_PASSWORD_MIN_LENGTH).max(512),
});

/** Both checks, in order — mirrors `app/admin/page.tsx` and `/api/admin/key`. */
async function requireAdminSession() {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }
  if (!(await hasSession("admin"))) {
    return apiError("unauthorised", "You need the admin password for this.");
  }
  return null;
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "admin.password.admin");
  if (crossSite) return crossSite;

  const denied = await requireAdminSession();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = changeAdminPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "bad_request",
      `The new password needs to be at least ${NEW_PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  // ⚠️ Checked before the current password is even looked at, and does not
  // touch the rate limiter: a mismatched or short *new* value is a form
  // error, not a guess at the current password (criterion 92).
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return apiError("bad_request", "The two new passwords don't match.");
  }

  // ⚠️ Counted before the current password is compared, exactly like
  // `attemptLogin` — closes the same race a read-then-verify-then-write shape
  // would leave open under parallel guesses.
  const attempt = await reserveAttempt(clientIp(request.headers), "admin");
  let keepCount = false;

  try {
    if (attempt.blocked) {
      log.warn("admin.password.admin.rate_limited", {
        failures: attempt.failures,
      });
      return apiError("rate_limited", RATE_LIMITED_MESSAGE);
    }

    let stored: string;
    try {
      stored = await passwordHash("admin");
    } catch (error) {
      if (error instanceof MissingParameterError) {
        log.error("admin.password.admin.no_password_hash");
        return apiError("not_configured", NOT_CONFIGURED_MESSAGE);
      }
      throw error;
    }

    const ok = await verifyPassword(parsed.data.currentPassword, stored);
    if (!ok) {
      keepCount = true;
      log.info("admin.password.admin.wrong_current", {
        failures: attempt.failures + 1,
      });
      return apiError("invalid_credentials", INVALID_MESSAGE);
    }

    const hash = await hashPassword(parsed.data.newPassword);
    await putParameter(PARAM.adminPasswordHash, hash);
    await bumpSessionEpoch("admin");

    // ⚠️ Never log either password — only that a rotation happened.
    log.info("admin.password.admin.changed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("admin.password.admin.failed", error);
  } finally {
    if (!keepCount) {
      // A failed release leaves one extra attempt counted for ten minutes —
      // the safe direction — so it is logged, never thrown.
      await attempt.release().catch((error: unknown) => {
        log.warn("admin.password.admin.release_failed", {
          reason: error instanceof Error ? error.name : "unknown",
        });
      });
    }
  }
}
