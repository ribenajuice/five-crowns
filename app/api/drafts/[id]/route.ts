/**
 * GET/PUT /api/drafts/{id}.
 *
 * GET returns the stored state; a non-null `savedGameId` means the review
 * screen should redirect to `/games/{savedGameId}`. A non-null
 * `editingGameId` means this draft is an edit of that game (M2 Stage 2) — the
 * screen uses it for wording and for where to go after saving; nothing here
 * branches on it.
 *
 * PUT is the whole-state replace the client debounces ~1s (criterion 28).
 * Schema-validated only, **not** grid-validated — a draft may be half-typed.
 * `409 conflict` once the draft has been saved.
 *
 * ⚠️ **`state.photoId` may never change once a draft has one.** PRD criterion
 * 120: the sheet photo can't be replaced during an edit — and the same rule
 * closes a smaller M1 hole on the new-game path, where the save resolves the
 * photo by `draft_id` and a swapped `photoId` would show the human one photo
 * while filing a different one. `docs/ARCHITECTURE.md` § "The edit", decision
 * 6.
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
      editingGameId: row.editingGameId,
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

    // ⚠️ The sheet photo can never be replaced, for every draft — not only
    // edits. `row.stateJson` always has a `photoId` by the time a draft
    // exists (`POST /api/drafts` requires `state.photoId === photoId`), so
    // this only ever refuses an actual change, never a first-time set.
    const storedState = JSON.parse(row.stateJson) as { photoId?: string };
    if (storedState.photoId && storedState.photoId !== parsed.data.state.photoId) {
      return apiError("conflict", "The sheet photo can't be changed.");
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
