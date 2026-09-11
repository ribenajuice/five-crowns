/**
 * POST /api/games — "The save". See `lib/games/save.ts` for the transaction.
 */

import "server-only";

import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { saveGameSchema } from "@/lib/draft/state";
import {
  DraftNotFoundError,
  InvalidGridError,
  MissingPhotoError,
  saveGame,
} from "@/lib/games/save";
import { apiError, serverError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "games.save");
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

  const parsed = saveGameSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That game didn't make sense.");
  }

  try {
    const result = await saveGame(parsed.data.draftId, parsed.data.state);
    return NextResponse.json(
      { gameId: result.gameId },
      { status: result.alreadySaved ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof InvalidGridError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_grid",
            message: "Not obviously wrong is what save needs. This isn't there yet.",
          },
          issues: error.validation,
        },
        { status: 422 },
      );
    }
    if (error instanceof MissingPhotoError) {
      return apiError("missing_photo", "This draft has no sheet photo to save with.");
    }
    if (error instanceof DraftNotFoundError) {
      return apiError("not_found", "That draft doesn't exist.");
    }

    return serverError("games.save_failed", error, {
      draftId: parsed.data.draftId,
    });
  }
}
