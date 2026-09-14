/**
 * POST /api/players/merge — PRD criteria 155–162.
 *
 * Body: `{ survivorId, loserId }`. The founder picks the survivor explicitly
 * on `MergeConfirmScreen` (criterion 156) — this route never infers one from
 * age or games played.
 *
 * ⚠️ **Group session, not admin** (criterion 155: "available to any holder of
 * the group password… not in the admin panel") — the same trust level as
 * deleting a game (decision 4 / risk 4, `docs/PRD.md`).
 *
 * Responses:
 *   `200 { survivorId, deletedPlayerId, rosterFolds: [{ winnerRosterId,
 *          loserRosterId, keptName, bothHadCustomNames }] }`
 *   `400 bad_request` — bad ids, or the same player named twice.
 *   `404 not_found` — either id doesn't name a real player.
 *   `409 conflict` — the two share a game. The response also carries a
 *     top-level `conflicts` array (`{ id, playedOn, locationName }[]`) —
 *     outside `error`, since `ApiErrorBody` only promises `code`/`message` —
 *     so the frontend can list every offending game and link to its edit
 *     flow without a second request (criterion 160). ⚠️ Nothing is repointed
 *     when this fires: the refusal runs entirely before the transaction opens.
 */

import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import {
  mergePlayers,
  PlayerNotFoundError,
  SameGameConflictError,
  SamePlayerError,
} from "@/lib/players/merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  survivorId: z.string().min(1).max(64),
  loserId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "players.merge");
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That request didn't make sense.");
  }

  const survivorId = parseUuidParam(parsed.data.survivorId);
  const loserId = parseUuidParam(parsed.data.loserId);
  if (!survivorId || !loserId) return apiError("bad_request", "That id isn't valid.");

  try {
    const result = await mergePlayers(survivorId, loserId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SamePlayerError) {
      return apiError("bad_request", error.message);
    }
    if (error instanceof PlayerNotFoundError) {
      return apiError("not_found", "That player doesn't exist.");
    }
    if (error instanceof SameGameConflictError) {
      return NextResponse.json(
        {
          error: { code: "conflict", message: error.message },
          conflicts: error.games,
        },
        { status: 409 },
      );
    }
    return serverError("players.merge_failed", error, { survivorId, loserId });
  }
}
