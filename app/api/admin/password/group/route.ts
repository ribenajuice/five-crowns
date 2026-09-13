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
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { NEW_PASSWORD_MIN_LENGTH, hashPassword } from "@/lib/auth/password";
import { hasSession } from "@/lib/auth/session";
import { bumpSessionEpoch, PARAM, putParameter } from "@/lib/config";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changeGroupPasswordSchema = z.object({
  password: z.string().min(NEW_PASSWORD_MIN_LENGTH).max(512),
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
  const crossSite = rejectCrossSitePost(request, "admin.password.group");
  if (crossSite) return crossSite;

  const denied = await requireAdminSession();
  if (denied) return denied;

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
    const hash = await hashPassword(parsed.data.password);
    // ⚠️ Epoch bumped *before* the hash is written — the safe order. If the
    // bump succeeds but the write then fails, every session is revoked and
    // the *old* password still works: loud (everyone is logged out
    // immediately) and recoverable (just retry the change). The other order
    // risks the opposite: hash written, bump fails, and the password has
    // changed while every existing session silently survives it.
    await bumpSessionEpoch("group");
    await putParameter(PARAM.groupPasswordHash, hash);

    // ⚠️ Never log the password itself — only that a rotation happened.
    log.info("admin.password.group.changed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("admin.password.group.failed", error);
  }
}
