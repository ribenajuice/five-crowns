/**
 * GET /api/admin/export — the founder's own copy of the scores, one CSV
 * (PRD "Decisions taken in this spec" item 8; criteria 102-109).
 *
 * ⚠️ Admin-gated exactly like `GET /api/admin/key`: both the group **and**
 * the admin session are required. A group session alone gets the admin gate,
 * not a file, and an unauthenticated GET gets nothing (criterion 109).
 *
 * ⚠️ **Permanent criterion 107**: this response must never carry the
 * Anthropic key, either password hash, the session secret or any SSM
 * parameter value. True by construction — see `lib/games/export.ts`'s header
 * comment — and re-checked by a grep test on every future change
 * (`tests/api/export.test.ts`).
 */

import "server-only";

import { hasSession } from "@/lib/auth/session";
import { buildCsv } from "@/lib/export/csv";
import { apiError, serverError } from "@/lib/http/errors";
import {
  EXPORT_COLUMNS,
  exportRowToCsvValues,
  listExportRows,
  UNSAFE_TEXT_COLUMN_INDICES,
} from "@/lib/games/export";

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

/** UTC, so the filename never depends on the server's local timezone. */
function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  try {
    const rows = await listExportRows();
    const csv = buildCsv(
      EXPORT_COLUMNS,
      rows.map(exportRowToCsvValues),
      UNSAFE_TEXT_COLUMN_INDICES,
    );
    const filename = `five-crowns-scores-${todayUtcDate()}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return serverError("admin.export.failed", error);
  }
}
