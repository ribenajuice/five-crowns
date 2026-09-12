/**
 * POST /api/transcribe — the vision call (docs/ARCHITECTURE.md § Flow 2,
 * steps 4–6).
 *
 * A **streaming** route handler (PRD criterion 52): the response begins
 * immediately with a progress line, well inside the two-second budget, while
 * the Opus 5 call itself runs for tens of seconds behind it. The body is
 * newline-delimited JSON (`application/x-ndjson`), one object per line:
 *
 *   `{"type":"progress","stage":"transcribing"}`   — one immediately, more
 *                                                     roughly every 15s while
 *                                                     the model is thinking.
 *   `{"type":"result", status, draftId, state, updatedAt,
 *      transcriptionId, columns }`                 — on `"ok"` **or**
 *                                                     `"invalid"`: never a
 *                                                     hard failure the
 *                                                     founder can't work
 *                                                     around (criterion 54).
 *      `columns` is `{ columnId, nameConfidence, leastConfidentIndex }[]`,
 *      live diagnostics for this one attempt — not persisted on the draft
 *      (docs/ARCHITECTURE.md's reading shape has no field for either), so a
 *      reloaded draft relies on the same monotonicity/soft-warning checks
 *      every other reading does.
 *   `{"type":"error", code, message}`               — the upstream call
 *                                                     itself failed. PRD
 *                                                     criterion 53: retry
 *                                                     posts the same
 *                                                     `{photoId}` again — the
 *                                                     photo is already
 *                                                     uploaded and the draft
 *                                                     (if one had to be
 *                                                     created) already exists,
 *                                                     so nothing is re-shot.
 *
 * Everything that can be decided before the slow part starts — auth,
 * cross-site, body shape, the photo existing, a key being configured, the
 * daily cap — is decided first and answered as a **plain, non-streamed**
 * JSON error (criterion 56's "plain message"), exactly like every other route
 * in this app.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { hasSession } from "@/lib/auth/session";
import { getOptionalParameter, PARAM } from "@/lib/config";
import { getDb } from "@/lib/db";
import { draft as draftTable, photo, transcription, type Photo } from "@/lib/db/schema";
import {
  draftStateSchema,
  emptyDraftState,
  transcribeSheetRequestSchema,
  type DraftState,
} from "@/lib/draft/state";
import { mergeSheetTranscriptionIntoDraft } from "@/lib/draft/merge-sheet";
import { apiError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { describeError, log } from "@/lib/log";
import { getPhotoStorage, PhotoObjectNotFoundError } from "@/lib/photos";
import { SHEET_MODEL } from "@/lib/vision/client";
import { transcribeSheet } from "@/lib/vision/transcribe-sheet";
import { reserveSheetTranscription } from "@/lib/vision/usage-cap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Thrown inside the draft-claim transaction, caught just outside it. */
class DraftClaimRaceError extends Error {
  override name = "DraftClaimRaceError";
}

interface ResolvedDraft {
  draftId: string;
  state: DraftState;
  alreadySaved: boolean;
}

/**
 * "Create one if none exists yet, same as Stage 2's manual-entry-first flow"
 * (this route's contract). Mirrors `POST /api/drafts`'s own claim race guard:
 * a fresh draft is only ever attached to a photo that is still unclaimed,
 * and a lost race reads back whoever won it rather than leaving an orphan.
 */
async function resolveDraftForPhoto(
  photoRow: Photo,
  playedOn: string,
): Promise<ResolvedDraft> {
  const db = getDb();

  if (photoRow.draftId) {
    const row = (
      await db.select().from(draftTable).where(eq(draftTable.id, photoRow.draftId))
    )[0];
    if (!row) {
      // The photo points at a draft that doesn't exist — a data-integrity
      // fault, not a user error. Let the route's catch-all log it.
      throw new Error(`Photo ${photoRow.id} references missing draft ${photoRow.draftId}.`);
    }
    return {
      draftId: row.id,
      state: JSON.parse(row.stateJson) as DraftState,
      alreadySaved: row.savedGameId !== null,
    };
  }

  const draftId = randomUUID();
  const now = new Date().toISOString();
  const state = emptyDraftState({ photoId: photoRow.id, playedOn, columnIds: [] });

  try {
    await db.transaction(async (tx) => {
      await tx.insert(draftTable).values({
        id: draftId,
        stateJson: JSON.stringify(state),
        createdAt: now,
        updatedAt: now,
      });

      const claim = await tx
        .update(photo)
        .set({ draftId })
        .where(and(eq(photo.id, photoRow.id), isNull(photo.draftId)));

      if ((claim.rowsAffected ?? 0) === 0) throw new DraftClaimRaceError();
    });
  } catch (error) {
    if (error instanceof DraftClaimRaceError) {
      const fresh = (await db.select().from(photo).where(eq(photo.id, photoRow.id)))[0];
      if (fresh?.draftId) {
        const row = (
          await db.select().from(draftTable).where(eq(draftTable.id, fresh.draftId))
        )[0]!;
        return {
          draftId: row.id,
          state: JSON.parse(row.stateJson) as DraftState,
          alreadySaved: row.savedGameId !== null,
        };
      }
    }
    throw error;
  }

  return { draftId, state, alreadySaved: false };
}

function ndjsonLine(event: object): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "transcribe.sheet");
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

  const parsed = transcribeSheetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That request didn't make sense.");
  }
  const { photoId } = parsed.data;
  const playedOn = parsed.data.playedOn ?? new Date().toISOString().slice(0, 10);

  const db = getDb();
  let photoRow;
  try {
    photoRow = (await db.select().from(photo).where(eq(photo.id, photoId)))[0];
  } catch (error) {
    log.error("transcribe.photo_lookup_failed", describeError(error));
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }
  if (!photoRow || photoRow.kind !== "sheet") {
    return apiError("not_found", "That photo doesn't exist.");
  }

  const apiKey = await getOptionalParameter(PARAM.anthropicApiKey);
  if (!apiKey) {
    return apiError(
      "not_configured",
      "No Claude API key is set up yet. Type this game in by hand, or ask whoever runs the admin panel to add one.",
    );
  }

  let resolved: ResolvedDraft;
  try {
    resolved = await resolveDraftForPhoto(photoRow, playedOn);
  } catch (error) {
    log.error("transcribe.draft_resolve_failed", describeError(error));
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }
  if (resolved.alreadySaved) {
    return apiError("conflict", "This game has already been saved.");
  }

  // ⚠️ Security review: read the photo bytes *before* spending a unit of the
  // daily cap. A photo missing from storage or a storage read failure costs
  // nothing against the 20/day budget this way — the cap should only ever be
  // spent on a request that actually reaches the model.
  let imageBase64: string;
  try {
    const bytes = await getPhotoStorage().getObjectBytes(photoRow.id, "model");
    imageBase64 = bytes.toString("base64");
  } catch (error) {
    if (error instanceof PhotoObjectNotFoundError) {
      return apiError(
        "missing_photo",
        "That photo's image is missing from storage. Retake the photo.",
      );
    }
    log.error("transcribe.photo_read_failed", describeError(error));
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }

  const reservation = await reserveSheetTranscription();
  if (!reservation.allowed) {
    return apiError(
      "rate_limited",
      "That's the day's transcription limit reached. Manual entry still works.",
    );
  }

  const { draftId, state } = resolved;

  // ⚠️ Security review: the browser can and does disconnect mid-call (a
  // backgrounded tab, a dropped signal, the back button) during the 30-60s
  // Opus call. Without this, the 15s heartbeat's next `enqueue` on an
  // already-closed controller throws from inside a `setInterval` callback —
  // an uncaught exception, not a rejected promise, which nothing here can
  // catch and which can take the whole Lambda invocation down. `closed`
  // makes every `send` a no-op once the client is gone; `cancel()` (called by
  // the runtime on disconnect) stops the heartbeat and aborts the in-flight
  // Anthropic call so an abandoned request doesn't keep spending.
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const upstreamAbort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        if (closed) return;
        try {
          controller.enqueue(ndjsonLine(event));
        } catch {
          closed = true;
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closing/closed from the other direction (a concurrent
          // `cancel()`) — nothing left to do.
        }
      };
      send({ type: "progress", stage: "transcribing" });

      heartbeat = setInterval(() => {
        send({ type: "progress", stage: "transcribing" });
      }, 15_000);

      try {
        const attempt = await transcribeSheet({
          apiKey,
          imageBase64,
          signal: upstreamAbort.signal,
        });
        clearInterval(heartbeat);

        const transcriptionId = randomUUID();
        await db.insert(transcription).values({
          id: transcriptionId,
          photoId,
          kind: "sheet",
          model: SHEET_MODEL,
          status: attempt.status,
          rawJson: attempt.rawJson,
          inputTokens: attempt.inputTokens,
          outputTokens: attempt.outputTokens,
          latencyMs: attempt.latencyMs,
          error: attempt.error,
        });

        if (attempt.status === "error") {
          log.warn("transcribe.sheet.error", {
            photoId,
            transcriptionId,
            error: attempt.error,
          });
          send({
            type: "error",
            code: "upstream_error",
            message:
              "The transcription failed. Try again — the photo's already uploaded, so nothing needs re-photographing.",
          });
          finish();
          return;
        }

        const now = new Date().toISOString();
        const { state: mergedState, diagnostics } = mergeSheetTranscriptionIntoDraft({
          state,
          columns: attempt.columns,
          photoId,
          transcriptionId,
          now,
        });

        // ⚠️ Security review, belt and braces: `mergeSheetTranscriptionIntoDraft`
        // already clamps everything vision output can affect (column count,
        // name length, values, reading-stack length), but a merged state that
        // still failed this check would otherwise be written straight to
        // `draft.state_json` with nothing downstream re-validating it until
        // the next autosave or save — silently locking the draft. Refusing to
        // persist it here means the founder keeps whatever the draft held
        // before this attempt, and can retry or fall back to manual entry,
        // rather than losing the draft to a state nothing can save.
        const validated = draftStateSchema.safeParse(mergedState);
        if (!validated.success) {
          log.error("transcribe.sheet.merge_produced_invalid_state", {
            photoId,
            draftId,
            transcriptionId,
            issues: JSON.stringify(validated.error.issues),
          });
          send({
            type: "error",
            code: "server_error",
            message: "Something went wrong at our end. Try again in a moment.",
          });
          finish();
          return;
        }

        await db
          .update(draftTable)
          .set({ stateJson: JSON.stringify(mergedState), updatedAt: now })
          .where(eq(draftTable.id, draftId));

        log.info("transcribe.sheet.done", {
          photoId,
          draftId,
          transcriptionId,
          status: attempt.status,
          columnCount: mergedState.columns.length,
        });

        send({
          type: "result",
          status: attempt.status,
          draftId,
          state: mergedState,
          updatedAt: now,
          transcriptionId,
          columns: diagnostics,
        });
        finish();
      } catch (error) {
        clearInterval(heartbeat);
        log.error("transcribe.sheet.unhandled", describeError(error));
        send({
          type: "error",
          code: "server_error",
          message: "Something went wrong at our end. Try again in a moment.",
        });
        finish();
      }
    },
    cancel() {
      // The runtime calls this when the client disconnects. Stop the
      // heartbeat and the Anthropic call rather than let either run to
      // completion for nobody.
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
