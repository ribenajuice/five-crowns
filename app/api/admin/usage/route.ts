/**
 * GET /api/admin/usage — this month's reads and spend, today's caps
 * (PRD criteria 110-114).
 *
 * ⚠️ Admin-gated exactly like `GET /api/admin/key` and `GET /api/admin/export`:
 * both the group **and** the admin session are required.
 *
 * Returns {@link UsageSummary} verbatim — see `lib/vision/usage-summary.ts`
 * for the shape and how each field is computed. A month or day with nothing
 * in it still comes back with real zeroes and a real A$0.00, never a blank,
 * a dash or an omitted field (criterion 114).
 */

import "server-only";

import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { getUsageSummary } from "@/lib/vision/usage-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Both checks, in order — mirrors `app/api/admin/key/route.ts`. */
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
    return NextResponse.json(await getUsageSummary());
  } catch (error) {
    return serverError("admin.usage.failed", error);
  }
}
