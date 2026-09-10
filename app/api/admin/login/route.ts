/**
 * POST /api/admin/login — the second password.
 *
 * ⚠️ Independent of the group password. Holding a valid group session grants
 * nothing here (PRD criteria 4 and 74); it only gets you as far as this prompt.
 * The panel itself is Milestone 1 stage 3.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clientIp } from "@/lib/auth/client-ip";
import { ADMIN_COOKIE, cookieAttributes } from "@/lib/auth/cookies";
import {
  attemptLogin,
  INVALID_MESSAGE,
  loginSchema,
  NOT_CONFIGURED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/auth/login";
import { apiError, serverError } from "@/lib/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request did not make sense.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "Type the admin password.");
  }

  try {
    const outcome = await attemptLogin(
      "admin",
      parsed.data.password,
      clientIp(request.headers),
    );

    switch (outcome.status) {
      case "rate_limited":
        return apiError("rate_limited", RATE_LIMITED_MESSAGE);
      case "invalid":
        return apiError("invalid_credentials", INVALID_MESSAGE);
      case "not_configured":
        return apiError("not_configured", NOT_CONFIGURED_MESSAGE);
      case "ok": {
        const jar = await cookies();
        jar.set(ADMIN_COOKIE, outcome.token, cookieAttributes("admin"));
        return NextResponse.json({ ok: true, next: "/admin" });
      }
    }
  } catch (error) {
    return serverError("login.admin.failed", error);
  }
}
