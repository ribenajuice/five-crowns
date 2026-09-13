/**
 * POST /api/games/{id}/edit — "Edit this game" on the game view.
 *
 * `docs/ARCHITECTURE.md` § "The edit — correcting a saved game". Creates or
 * resumes the open edit draft for this game and answers where the review
 * screen should navigate. A POST, not a GET page, so a link prefetch can
 * never mint a draft.
 */

import "server-only";

import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { GameNotFoundError, startEditDraft } from "@/lib/games/start-edit";
import { MissingPhotoError } from "@/lib/games/resolve";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const crossSite = rejectCrossSitePost(request, "games.edit_start");
  if (crossSite) return crossSite;

  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { id: rawId } = await params;
  const id = parseUuidParam(rawId);
  if (!id) return apiError("bad_request", "That id isn't valid.");

  try {
    const result = await startEditDraft(id);
    return NextResponse.json(
      { draftId: result.draftId },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      return apiError("not_found", "That game doesn't exist.");
    }
    if (error instanceof MissingPhotoError) {
      return apiError("missing_photo", "This game has no sheet photo to edit against.");
    }
    return serverError("games.edit_start_failed", error, { gameId: id });
  }
}
