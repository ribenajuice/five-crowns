/**
 * GET /api/players/merge-preview?a={id}&b={id} — PRD criteria 156, 160.
 *
 * What `MergeConfirmScreen` needs before it renders a survivor-picker at all:
 * both players' names and games-played counts, and — the reason this is a
 * real request rather than data the page already has — a fresh check for a
 * shared game. Criterion 160's refusal has to be current at the moment the
 * screen opens, not stale from whenever the player index last rendered, so
 * this always re-queries rather than trusting anything the caller already
 * has.
 *
 * `a`/`b` are just "the two players" — this route doesn't pick a survivor,
 * the founder does, on `MergeConfirmScreen` itself (criterion 156: "nothing
 * is chosen for them by age or size"). The response's `survivor`/`other`
 * keys mirror the two ids positionally (`a` → `survivor`, `b` → `other`) and
 * carry no meaning beyond "which query param each came from" — this is a
 * preview, not a commitment.
 */

import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { hasSession } from "@/lib/auth/session";
import { apiError, serverError } from "@/lib/http/errors";
import { parseUuidParam } from "@/lib/http/params";
import { PlayerNotFoundError, previewPlayerMerge } from "@/lib/players/merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ a: z.string(), b: z.string() });

export async function GET(request: Request) {
  if (!(await hasSession("group"))) {
    return apiError("unauthorised", "You need the password for this.");
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    a: searchParams.get("a") ?? undefined,
    b: searchParams.get("b") ?? undefined,
  });
  if (!parsed.success) {
    return apiError("bad_request", "Name two players to compare.");
  }

  const aId = parseUuidParam(parsed.data.a);
  const bId = parseUuidParam(parsed.data.b);
  if (!aId || !bId) return apiError("bad_request", "That id isn't valid.");
  if (aId === bId) return apiError("bad_request", "Pick two different players.");

  try {
    const preview = await previewPlayerMerge(aId, bId);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof PlayerNotFoundError) {
      return apiError("not_found", "That player doesn't exist.");
    }
    return serverError("players.merge_preview_failed", error, { a: aId, b: bId });
  }
}
