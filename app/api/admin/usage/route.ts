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

import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { serverError } from "@/lib/http/errors";
import { getUsageSummary } from "@/lib/vision/usage-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  try {
    return NextResponse.json(await getUsageSummary());
  } catch (error) {
    return serverError("admin.usage.failed", error);
  }
}
