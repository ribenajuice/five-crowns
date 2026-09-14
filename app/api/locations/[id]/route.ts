/**
 * PATCH /api/locations/{id} — rename a location (PRD criteria 145–146).
 *
 * Body: `{ name: string }`. Trimmed; a blank result is `400 bad_request` — a
 * location always needs a real name, unlike a roster there is no auto-name to
 * fall back to. A trimmed name colliding with another location's `name_key`
 * is refused (`409 conflict`) with a message naming the other location —
 * ⚠️ **no merge is offered here**; merging two locations is Stage 4 scope
 * (`docs/DECISIONS.md`, 2026-09-14).
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import {
  EmptyLocationNameError,
  LocationNameConflictError,
  LocationNotFoundError,
  renameLocation,
} from "@/lib/locations/rename";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const bodySchema = z.object({ name: z.string().max(1000) });

export async function PATCH(request: Request, { params }: RouteParams) {
  const crossSite = rejectCrossSitePost(request, "locations.rename");
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That name didn't make sense.");
  }

  try {
    const result = await renameLocation(id, parsed.data.name);
    return NextResponse.json({ location: result });
  } catch (error) {
    if (error instanceof LocationNotFoundError) {
      return apiError("not_found", "That place doesn't exist.");
    }
    if (error instanceof EmptyLocationNameError) {
      return apiError("bad_request", "A place needs a name.");
    }
    if (error instanceof LocationNameConflictError) {
      return apiError("conflict", error.message);
    }
    return serverError("locations.rename_failed", error, { locationId: id });
  }
}
