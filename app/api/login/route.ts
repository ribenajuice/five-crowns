/**
 * POST /api/login — the group password gate.
 *
 * The only API route reachable without a session (see `middleware.ts`).
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clientIp } from "@/lib/auth/client-ip";
import { cookieAttributes, GROUP_COOKIE } from "@/lib/auth/cookies";
import {
  attemptLogin,
  INVALID_MESSAGE,
  loginSchema,
  NOT_CONFIGURED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/auth/login";
import { apiError, serverError } from "@/lib/http/errors";

export const runtime = "nodejs";
/** scrypt and a database write. Nothing here may be cached. */
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
    return apiError("bad_request", "Type the password.");
  }

  try {
    const outcome = await attemptLogin(
      "group",
      parsed.data.password,
      clientIp(request.headers),
    );

    switch (outcome.status) {
      case "rate_limited":
        return apiError("rate_limited", RATE_LIMITED_MESSAGE);
      case "invalid":
        // ⚠️ No cookie is set on a wrong password (PRD criterion 2).
        return apiError("invalid_credentials", INVALID_MESSAGE);
      case "not_configured":
        return apiError("not_configured", NOT_CONFIGURED_MESSAGE);
      case "ok": {
        const jar = await cookies();
        jar.set(GROUP_COOKIE, outcome.token, cookieAttributes("group"));
        return NextResponse.json({ ok: true, next: "/games" });
      }
    }
  } catch (error) {
    return serverError("login.group.failed", error);
  }
}
