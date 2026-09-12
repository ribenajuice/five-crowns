/**
 * POST /api/transcribe/column — the targeted column re-read
 * (`docs/ARCHITECTURE.md` § "Targeted column re-read", sequence diagram
 * step 4). A sibling of `POST /api/transcribe`, not a variant of it: its own
 * request shape, its own merge, its own diagnostics — but the same streaming
 * NDJSON contract and the same crash-safety pattern (guard every `send`,
 * `cancel()` clears the heartbeat and aborts the upstream call), learned the
 * hard way in Stage 3.
 *
 * Body: `{ photoId, columnId }`. Unlike `POST /api/transcribe`, the photo and
 * the draft both already exist by this point — `POST /api/uploads
 * {kind:'column', draftId, columnId}` created the `photo` row before this
 * route is ever called — so there is no "create a draft" branch here.
 *
 * Streamed events, one JSON object per line (`application/x-ndjson`):
 *
 *   `{"type":"progress","stage":"transcribing"}`   — one immediately, more
 *                                                     roughly every 15s.
 *   `{"type":"result", status, draftId, state, updatedAt, transcriptionId,
 *      columnId, diagnostics }`                     — on `"ok"` **or**
 *                                                     `"invalid"`: never a
 *                                                     hard failure (same
 *                                                     philosophy as the sheet
 *                                                     path, PRD criterion 54).
 *      `diagnostics` is a single object, not an array — this route is
 *      already scoped to one column, unlike the sheet route's `columns[]`.
 *      See `lib/draft/merge-column.ts` for its shape and `docs/DECISIONS.md`
 *      for why a single object was chosen over a one-element array.
 *   `{"type":"error", code, message}`               — the upstream call
 *                                                     itself failed. Retry
 *                                                     posts the same
 *                                                     `{photoId, columnId}`
 *                                                     again; the photo is
 *                                                     already uploaded.
 *
 * Everything decidable up front — auth, cross-site, body shape, the photo and
 * draft existing, the column still being on the draft, a key being
 * configured — is decided first and answered as a plain, non-streamed JSON
 * error, exactly like `POST /api/transcribe`.
 *
 * ⚠️ **No daily cap on this path.** `lib/vision/usage-cap.ts`'s
 * `recordColumnTranscription` counts the attempt for the admin panel's future
 * spend view; it never refuses one.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { hasSession } from "@/lib/auth/session";
import { getOptionalParameter, PARAM } from "@/lib/config";
import { getDb } from "@/lib/db";
import { draft as draftTable, photo, player, transcription } from "@/lib/db/schema";
import {
  draftStateSchema,
  transcribeColumnRequestSchema,
  type DraftColumn,
  type DraftState,
} from "@/lib/draft/state";
import { ColumnNotFoundError, mergeColumnTranscriptionIntoDraft } from "@/lib/draft/merge-column";
import { apiError } from "@/lib/http/errors";
import { rejectCrossSitePost } from "@/lib/http/same-origin";
import { describeError, log } from "@/lib/log";
import { getPhotoStorage, PhotoObjectNotFoundError } from "@/lib/photos";
import { COLUMN_MODEL } from "@/lib/vision/client";
import { transcribeColumn } from "@/lib/vision/transcribe-column";
import { recordColumnTranscription } from "@/lib/vision/usage-cap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ndjsonLine(event: object): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/**
 * Whoever the app asked the founder to photograph: an existing player's
 * display name, a pending new one, or (if the column isn't assigned to
 * anyone yet) the name as originally read off the full sheet. `null` when
 * none of those exist — nothing to compare the close-up's read name against.
 */
async function resolveExpectedPlayerName(column: DraftColumn): Promise<string | null> {
  if (column.playerId) {
    const row = (
      await getDb().select().from(player).where(eq(player.id, column.playerId))
    )[0];
    if (row) return row.displayName;
  }
  if (column.newPlayerName) return column.newPlayerName;
  return column.sheetName;
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSitePost(request, "transcribe.column");
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

  const parsed = transcribeColumnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("bad_request", "That request didn't make sense.");
  }
  const { photoId, columnId } = parsed.data;

  const db = getDb();
  let photoRow;
  try {
    photoRow = (await db.select().from(photo).where(eq(photo.id, photoId)))[0];
  } catch (error) {
    log.error("transcribe.column.photo_lookup_failed", describeError(error));
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }
  if (!photoRow || photoRow.kind !== "column") {
    return apiError("not_found", "That photo doesn't exist.");
  }
  if (photoRow.draftColumnId !== columnId) {
    return apiError("bad_request", "That photo wasn't taken for this column.");
  }
  if (!photoRow.draftId) {
    // Every `kind:'column'` photo is created with a `draftId` at upload time
    // (`POST /api/uploads`'s `createColumnUpload`) — a data-integrity fault,
    // not a user error, if one is ever missing.
    log.error("transcribe.column.photo_missing_draft", { photoId });
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }

  const draftRow = (
    await db.select().from(draftTable).where(eq(draftTable.id, photoRow.draftId))
  )[0];
  if (!draftRow) {
    log.error("transcribe.column.draft_missing", { photoId, draftId: photoRow.draftId });
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }
  if (draftRow.savedGameId) {
    return apiError("conflict", "This game has already been saved.");
  }

  const state = JSON.parse(draftRow.stateJson) as DraftState;
  const column = state.columns.find((c) => c.id === columnId);
  if (!column) {
    return apiError("not_found", "That column doesn't exist on this draft anymore.");
  }

  const apiKey = await getOptionalParameter(PARAM.anthropicApiKey);
  if (!apiKey) {
    return apiError(
      "not_configured",
      "No Claude API key is set up yet. Type this column in by hand, or ask whoever runs the admin panel to add one.",
    );
  }

  let imageBase64: string;
  try {
    const bytes = await getPhotoStorage().getObjectBytes(photoRow.id, "model");
    imageBase64 = bytes.toString("base64");
  } catch (error) {
    if (error instanceof PhotoObjectNotFoundError) {
      return apiError(
        "missing_photo",
        "That photo's image is missing from storage. Retake the close-up.",
      );
    }
    log.error("transcribe.column.photo_read_failed", describeError(error));
    return apiError("server_error", "Something went wrong at our end. Try again in a moment.");
  }

  const expectedPlayerName = await resolveExpectedPlayerName(column);
  const draftId = draftRow.id;

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
        // Counted whatever the outcome — a fact for the admin panel's future
        // spend view, never a gate (see this file's top-of-file note).
        await recordColumnTranscription();

        const attempt = await transcribeColumn({
          apiKey,
          imageBase64,
          signal: upstreamAbort.signal,
        });
        clearInterval(heartbeat);

        const transcriptionId = randomUUID();
        await db.insert(transcription).values({
          id: transcriptionId,
          photoId,
          kind: "column",
          model: COLUMN_MODEL,
          status: attempt.status,
          rawJson: attempt.rawJson,
          inputTokens: attempt.inputTokens,
          outputTokens: attempt.outputTokens,
          latencyMs: attempt.latencyMs,
          error: attempt.error,
        });

        if (attempt.status === "error") {
          log.warn("transcribe.column.error", {
            photoId,
            columnId,
            transcriptionId,
            error: attempt.error,
          });
          send({
            type: "error",
            code: "upstream_error",
            message:
              "The re-read failed. Try again — the close-up's already uploaded, so nothing needs re-photographing.",
          });
          finish();
          return;
        }

        const now = new Date().toISOString();
        let mergedState: DraftState;
        let diagnostics: ReturnType<
          typeof mergeColumnTranscriptionIntoDraft
        >["diagnostics"];
        try {
          ({ state: mergedState, diagnostics } = mergeColumnTranscriptionIntoDraft({
            state,
            columnId,
            reading: attempt.reading,
            photoId,
            transcriptionId,
            expectedPlayerName,
            now,
          }));
        } catch (error) {
          if (error instanceof ColumnNotFoundError) {
            send({
              type: "error",
              code: "not_found",
              message: "That column doesn't exist on this draft anymore.",
            });
            finish();
            return;
          }
          throw error;
        }

        // ⚠️ Security review, belt and braces: same reasoning as
        // `POST /api/transcribe` — refuse to persist a merged state that
        // would fail its own schema, so a corrupt result never locks the
        // draft. The founder keeps whatever the draft held before this
        // attempt and can retry or fall back to typing the column by hand.
        const validated = draftStateSchema.safeParse(mergedState);
        if (!validated.success) {
          log.error("transcribe.column.merge_produced_invalid_state", {
            photoId,
            draftId,
            columnId,
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

        log.info("transcribe.column.done", {
          photoId,
          draftId,
          columnId,
          transcriptionId,
          status: attempt.status,
          possibleWrongColumn: diagnostics.possibleWrongColumn,
        });

        send({
          type: "result",
          status: attempt.status,
          draftId,
          state: mergedState,
          updatedAt: now,
          transcriptionId,
          columnId,
          diagnostics,
        });
        finish();
      } catch (error) {
        clearInterval(heartbeat);
        log.error("transcribe.column.unhandled", describeError(error));
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
