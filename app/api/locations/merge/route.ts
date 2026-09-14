/**
 * POST /api/locations/merge — PRD criteria 163–166.
 *
 * Body: `{ survivorId, loserId }`. Same shape and the same trust level as
 * `POST /api/players/merge` (criterion 163: "the same mechanism"): group
 * session, not admin.
 *
 * ⚠️ **No preview endpoint.** Unlike a player merge, there is no same-game
 * conflict to check up front (criterion 165's own note: "a game has exactly
 * one location, so two places can never both be 'in the same game'"), and
 * both locations' games-played counts are already on whatever page the
 * founder is merging from (the places index, or the rename-collision
 * refusal) — a second round trip here would only restate what the caller
 * already has. `GET /api/locations` remains the pick-list source of truth.
 *
 * Responses:
 *   `200 { survivorId, deletedLocationId }`
 *   `400 bad_request` — bad ids, or the same place named twice.
 *   `404 not_found` — either id doesn't name a real place.
 */

import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { LocationNotFoundError, mergeLocations, SameLocationError } from "@/lib/locations/merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  survivorId: z.string().min(1).max(64),
  loserId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "locations.merge");
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
    const result = await mergeLocations(survivorId, loserId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SameLocationError) {
      return apiError("bad_request", error.message);
    }
    if (error instanceof LocationNotFoundError) {
      return apiError("not_found", "That place doesn't exist.");
    }
    return serverError("locations.merge_failed", error, { survivorId, loserId });
  }
}
