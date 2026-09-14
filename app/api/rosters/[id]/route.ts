/**
 * PATCH /api/rosters/{id} — rename a roster (PRD criteria 141–144).
 *
 * Body: `{ name: string, dryRun?: boolean }`.
 * - `name` is trimmed and capped at 40 characters server-side, mirroring the
 *   field's own `maxlength`; an all-blank result clears the custom name and
 *   restores the auto-name (criterion 142) — there is no state in which a
 *   roster displays an empty name.
 * - A case-insensitive match against another roster's *displayed* name never
 *   blocks (criterion 143): the response's `duplicate` field, when present,
 *   is enough for the frontend to show a non-blocking warning and let the
 *   founder save anyway.
 * - `dryRun: true` resolves and reports the same shape — including any
 *   duplicate — without writing anything, so the frontend can show the
 *   warning and get an explicit "save anyway" before committing, without
 *   re-deriving the same answer twice.
 * - A rename only ever touches `roster.name`. It never recomputes
 *   `roster.signature`, so it cannot change which roster a re-entered exact
 *   set of players matches (criterion 144).
 */

import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { renameRoster, RosterNotFoundError } from "@/lib/rosters/rename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  name: z.string().max(1000),
  dryRun: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const crossSite = rejectCrossSitePost(request, "rosters.rename");
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
    const result = await renameRoster(id, parsed.data.name, { dryRun: parsed.data.dryRun });
    return NextResponse.json({
      roster: { id: result.id, name: result.name, displayName: result.displayName },
      duplicate: result.duplicate,
      saved: !parsed.data.dryRun,
    });
  } catch (error) {
    if (error instanceof RosterNotFoundError) {
      return apiError("not_found", "That roster doesn't exist.");
    }
    return serverError("rosters.rename_failed", error, { rosterId: id });
  }
}
