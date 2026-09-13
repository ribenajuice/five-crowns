/**
 * DELETE /api/games/{id} — permanently removes a saved game.
 *
 * `docs/ARCHITECTURE.md` § "The edit — correcting a saved game" and
 * `docs/DECISIONS.md`, 2026-09-14 (Consequences) for the row-by-row reasoning;
 * `lib/games/delete.ts` is the executable transaction. PRD criteria 124–129.
 *
 * The confirmation and its "second deliberate action" live entirely on the
 * client (criterion 124) — this route does the one irreversible thing once
 * asked, and answers plainly.
 */

import "server-only";

import { NextResponse } from "next/server";

import { hasSession } from "@/lib/auth/session";
import { deleteGame } from "@/lib/games/delete";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { rejectCrossSitePost } from "@/lib/http/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const crossSite = rejectCrossSitePost(request, "games.delete");
  if (crossSite) return crossSite;

  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { id: rawId } = await params;
  const id = parseUuidParam(rawId);
  if (!id) return apiError("bad_request", "That id isn't valid.");

  try {
    const deleted = await deleteGame(id);
    if (!deleted) return apiError("not_found", "That game doesn't exist.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("games.delete_failed", error, { gameId: id });
  }
}
