/**
 * GET/PUT /api/drafts/{id}.
 *
 * GET returns the stored state; a non-null `savedGameId` means the review
 * screen should redirect to `/games/{savedGameId}`.
 *
 * PUT is the whole-state replace the client debounces ~1s (criterion 28).
 * Schema-validated only, **not** grid-validated — a draft may be half-typed.
 * `409 conflict` once the draft has been saved.
 */

import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { draft as draftTable } from "@/lib/db/schema";
import { updateDraftSchema } from "@/lib/draft/state";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { id: rawId } = await params;
  const id = parseUuidParam(rawId);
  if (!id) return apiError("bad_request", "That id isn't valid.");

  try {
    const row = (
      await getDb().select().from(draftTable).where(eq(draftTable.id, id))
    )[0];
    if (!row) return apiError("not_found", "That draft doesn't exist.");

    return NextResponse.json({
      draftId: row.id,
      state: JSON.parse(row.stateJson),
      updatedAt: row.updatedAt,
      savedGameId: row.savedGameId,
    });
  } catch (error) {
    return serverError("drafts.get_failed", error, { draftId: id });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const crossSite = rejectCrossSitePost(request, "drafts.update");
  if (crossSite) return crossSite;

  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { id: rawId } = await params;
  const id = parseUuidParam(rawId);
  if (!id) return apiError("bad_request", "That id isn't valid.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = updateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That draft didn't make sense.");
  }

  try {
    const db = getDb();
    const row = (await db.select().from(draftTable).where(eq(draftTable.id, id)))[0];
    if (!row) return apiError("not_found", "That draft doesn't exist.");
    if (row.savedGameId) {
      return apiError("conflict", "This draft has already been saved.");
    }

    const updatedAt = new Date().toISOString();
    await db
      .update(draftTable)
      .set({ stateJson: JSON.stringify(parsed.data.state), updatedAt })
      .where(eq(draftTable.id, id));

    return NextResponse.json({ updatedAt });
  } catch (error) {
    return serverError("drafts.update_failed", error, { draftId: id });
  }
}
