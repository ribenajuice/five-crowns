/**
 * GET/POST /api/admin/key — the Claude API key, behind the admin password.
 *
 * ⚠️ Holding a valid group session grants nothing here
 * (docs/ARCHITECTURE.md § The admin panel); both handlers check the full
 * group session **and** the admin one, exactly like every page and route
 * behind `/admin` already does.
 *
 * GET returns {@link ApiKeyStatus} — last four characters, when it was set,
 * whether it currently works. **Never the key itself** (PRD criteria 75, 76).
 * POST verifies a candidate with a real call before ever saving it
 * (criterion 77) and returns the same status shape either way.
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import {
  anthropicApiKeyStatus,
  API_KEY_MAX_LENGTH,
  API_KEY_MIN_LENGTH,
  setAnthropicApiKey,
} from "@/lib/vision/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const setKeySchema = z.object({
  apiKey: z.string().min(API_KEY_MIN_LENGTH).max(API_KEY_MAX_LENGTH),
});

/** Both checks, in order — mirrors `app/admin/page.tsx` and the admin login route. */
async function requireAdminSession() {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }
  if (!(await hasSession("admin"))) {
    return apiError("unauthorised", "You need the admin password for this.");
  }
  return null;
}

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  try {
    return NextResponse.json(await anthropicApiKeyStatus());
  } catch (error) {
    return serverError("admin.api_key.status_failed", error);
  }
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "admin.api_key.set");
  if (crossSite) return crossSite;

  const denied = await requireAdminSession();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = setKeySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "Paste the whole API key.");
  }

  try {
    const outcome = await setAnthropicApiKey(parsed.data.apiKey);
    if (outcome.status === "invalid_key") {
      return apiError(
        "bad_request",
        "That key didn't work against the API. The previous key, if there was one, is still in use.",
      );
    }
    return NextResponse.json(await anthropicApiKeyStatus());
  } catch (error) {
    return serverError("admin.api_key.set_failed", error);
  }
}
