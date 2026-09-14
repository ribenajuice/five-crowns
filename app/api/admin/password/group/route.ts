/**
 * POST /api/admin/password/group — rotate the shared group password.
 *
 * ⚠️ Deliberately asymmetric with `/api/admin/password/admin` beside it: no
 * current password is required (PRD criterion 88). `docs/PRD.md`'s Milestone 2
 * user stories say why — the reason to rotate this one is often that you have
 * lost control of it, and demanding the old value would be the one place the
 * product locks the founder out on purpose.
 *
 * Requires a full admin session — group **and** admin, in that order, exactly
 * like every other route behind `/admin` (criterion 87; mirrors
 * `app/api/admin/key/route.ts`). Holding only a group session gets refused
 * here, not just redirected.
 *
 * On success: `group-session-epoch` is bumped and then `group-password-hash`
 * is replaced, in that order — the safe direction if the second write fails
 * (a transient SSM error): every device holding a group cookie is already
 * signed out, including this one, and the *old* password still works, so the
 * founder just retries. The other order would risk the opposite: the
 * password changes but a failed epoch bump leaves every existing session,
 * including whoever's session was just compromised, silently intact. Either
 * way, on full success every group cookie is revoked — including this one
 * (criterion 89). The admin epoch is untouched: this session stays logged in
 * as admin.
 *
 * ⚠️ **Rate limited**, unlike a route whose only guard is the session check
 * above might suggest. There is no "wrong attempt" to count here — no current
 * password is taken — but an unthrottled admin-gated write is still a real
 * gap: a hijacked/XSS'd admin session, or a buggy client stuck retrying,
 * could otherwise hammer this endpoint with no cooldown at all. Every call
 * counts here, not just failures (there being no notion of a "failed" call
 * to distinguish), reusing `lib/auth/rate-limit`'s `"admin"` scope directly —
 * the same bucket `/api/admin/login` and `/api/admin/password/admin` count
 * against. Sharing it is deliberate, not an oversight: this route already
 * requires a live admin session, so anyone who could hammer it already holds
 * the admin cookie, and throttling it alongside admin logins is the simplest
 * consistent choice rather than inventing a new scope for one route.
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { clientIp } from "@/lib/auth/client-ip";
import { RATE_LIMITED_MESSAGE } from "@/lib/auth/login";
import { NEW_PASSWORD_MIN_LENGTH, hashPassword } from "@/lib/auth/password";
import { reserveAttempt } from "@/lib/auth/rate-limit";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { bumpSessionEpoch, PARAM, putParameter } from "@/lib/config";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changeGroupPasswordSchema = z.object({
  password: z.string().min(NEW_PASSWORD_MIN_LENGTH).max(512),
});

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "admin.password.group");
  if (crossSite) return crossSite;

  const denied = await requireAdminSession();
  if (denied) return denied;

  // ⚠️ Counted before anything else — every call, not just a failure, since
  // this route has no "wrong guess" to distinguish. Never released: that is
  // what makes it a call counter rather than a failed-attempt counter.
  const attempt = await reserveAttempt(clientIp(request.headers), "admin");
  if (attempt.blocked) {
    log.warn("admin.password.group.rate_limited", { failures: attempt.failures });
    return apiError("rate_limited", RATE_LIMITED_MESSAGE);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = changeGroupPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "bad_request",
      `The new password needs to be at least ${NEW_PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  try {
    // ⚠️ The hash (CPU-bound scrypt) and the epoch bump (an SSM round trip)
    // depend on neither's result, so they run concurrently. Only the order of
    // the two *writes* below is load-bearing — see the header comment — and
    // that order is untouched: the bump is still awaited, and still lands,
    // before `putParameter` writes the new hash.
    const [hash] = await Promise.all([
      hashPassword(parsed.data.password),
      bumpSessionEpoch("group"),
    ]);
    await putParameter(PARAM.groupPasswordHash, hash);

    // ⚠️ Never log the password itself — only that a rotation happened.
    log.info("admin.password.group.changed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("admin.password.group.failed", error);
  }
}
