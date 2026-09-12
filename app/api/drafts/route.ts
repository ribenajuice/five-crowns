/**
 * POST /api/drafts — creates the draft and links its sheet photo.
 *
 * `docs/ARCHITECTURE.md` § "The Stage 2 interface": links `photo.draft_id` and
 * stores the initial state, which must have `state.photoId === photoId`
 * (enforced by `createDraftSchema`). Rejects a photo already linked to
 * another draft.
 *
 * ⚠️ Security review LOW 7. The early `photoRow.draftId` check below is a
 * cheap, obvious-case shortcut — it does not, on its own, close the race
 * between two concurrent `POST /api/drafts` for the same photo. The actual
 * guarantee is the transaction beneath it: the photo is *claimed* with a
 * conditional `UPDATE … WHERE draft_id IS NULL`, and a lost race (`rowsAffected
 * === 0`) rolls the whole transaction back — no orphan draft row left behind
 * — and answers 409.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { draft as draftTable, photo } from "@/lib/db/schema";
import { createDraftSchema } from "@/lib/draft/state";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class PhotoAlreadyClaimedError extends Error {
  override name = "PhotoAlreadyClaimedError";
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "drafts.create");
  if (crossSite) return crossSite;

  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const parsed = createDraftSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That draft didn't make sense.");
  }

  try {
    const db = getDb();
    const photoRow = (
      await db
        .select()
        .from(photo)
        .where(eq(photo.id, parsed.data.photoId))
    )[0];

    if (!photoRow || photoRow.kind !== "sheet") {
      return apiError("not_found", "That photo doesn't exist.");
    }
    if (photoRow.draftId) {
      return apiError("conflict", "That photo is already attached to another draft.");
    }

    const draftId = randomUUID();
    const now = new Date().toISOString();

    try {
      await db.transaction(async (tx) => {
        await tx.insert(draftTable).values({
          id: draftId,
          stateJson: JSON.stringify(parsed.data.state),
          createdAt: now,
          updatedAt: now,
        });

        // The actual guarantee: claim the photo only if it is still free.
        const claim = await tx
          .update(photo)
          .set({ draftId })
          .where(and(eq(photo.id, parsed.data.photoId), isNull(photo.draftId)));

        if ((claim.rowsAffected ?? 0) === 0) {
          throw new PhotoAlreadyClaimedError();
        }
      });
    } catch (error) {
      if (error instanceof PhotoAlreadyClaimedError) {
        return apiError(
          "conflict",
          "That photo is already attached to another draft.",
        );
      }
      throw error;
    }

    return NextResponse.json({ draftId, updatedAt: now }, { status: 201 });
  } catch (error) {
    return serverError("drafts.create_failed", error);
  }
}
