"use client";

/**
 * `/games/new` — the add-a-game screen.
 *
 * `docs/DESIGN-SYSTEM.md` § Screen rules: photo first, always — nothing else
 * on this screen until a sheet photo exists. Two moments: get the photo, then
 * choose how the numbers go in. From Stage 3, "Read the sheet" and "Type it
 * in by hand" render together, equal weight, neither a fallback for the other
 * (PRD criterion 47).
 *
 * "Read the sheet" posts straight to `POST /api/transcribe` — no
 * `POST /api/drafts` first (`docs/DECISIONS.md`, "`POST /api/transcribe`
 * creates its own draft") — so the draft id isn't known until the stream's
 * `result` event arrives. Until then, progress renders right here rather than
 * on `/review/{draftId}`, because there is no id to route to yet; the
 * founder's perceived experience is the same either way, since it's the same
 * `TranscribeProgress` component the review screen would otherwise show.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Banner } from "@/components/Banner";
import { buttonClasses } from "@/components/Button";
import { PhotoCapture } from "@/components/PhotoCapture";
import { RotateControl } from "@/components/RotateControl";
import { TranscribeProgress } from "@/components/TranscribeProgress";
import { UploadProgress } from "@/components/UploadProgress";
import { emptyDraftState } from "@/lib/draft/state";
import { newId } from "@/lib/ui/ids";
import { exportPhoto, loadPhoto, rotateCanvas, type LoadedPhoto } from "@/lib/ui/image-pipeline";
import { localCalendarDay } from "@/lib/ui/local-date";
import { consumeNdjsonStream } from "@/lib/ui/ndjson";
import { parseTranscribeEvent, type TranscribeColumnDiagnostic } from "@/lib/ui/transcribe-events";
import {
  DAILY_TRANSCRIBE_CAP_MESSAGE,
  DAILY_TRANSCRIBE_CAP_TITLE,
  HAND_ENTRY_HELPER,
  HAND_ENTRY_LABEL,
  READ_ERROR_MESSAGE,
  READ_ERROR_TITLE,
  READ_RETRY_LABEL,
  READ_SHEET_HELPER,
  READ_SHEET_LABEL,
  UPLOAD_CAP_MESSAGE,
  UPLOAD_CAP_TITLE,
  UPRIGHT_CONFIRM_LABEL,
} from "@/lib/ui/copy";
import { PRESIGN_EXPIRY_SECONDS } from "@/lib/photos/types";
import { nextRotation, type Rotation } from "@/lib/ui/rotation";
import { postFormUpload } from "@/lib/ui/upload";

/** Re-presign only once a cached one is close enough to its 5-minute expiry to risk. */
const PRESIGN_REUSE_WINDOW_MS = (PRESIGN_EXPIRY_SECONDS - 60) * 1000;

const DEFAULT_STARTING_COLUMNS = 4;

class UploadCappedError extends Error {}

type Phase =
  | "empty"
  | "preview"
  | "uploading"
  | "upload-error"
  | "upload-capped"
  | "choose-path"
  | "creating-draft"
  | "draft-error"
  | "transcribing"
  | "transcribe-error";

export function AddGameFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("empty");
  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // A distinct cap from the upload cap above (`usage_day.sheet_transcriptions`,
  // separate from `.sheet_uploads`) — sticks around under the two-card choice
  // rather than replacing it, since manual entry stays fully available.
  const [dailyCapHit, setDailyCapHit] = useState(false);

  // The blobs and presign from a completed upload, kept so "Try again" never
  // re-photographs, re-presigns (which would burn another of the day's upload
  // slots and orphan a photo row) or re-spends the upload cap — only the
  // network step is retried, unless the cached presign is old enough that it
  // might have actually expired.
  const uploadResult = useRef<{
    originalBlob: Blob;
    modelBlob: Blob;
    width: number;
    height: number;
    presignedAt: number;
    presign: {
      photoId: string;
      original: { url: string; fields: Record<string, string> };
      model: { url: string; fields: Record<string, string> };
    };
  } | null>(null);

  useEffect(() => {
    if (!loaded) {
      setPreviewUrl(null);
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    loaded.canvas.toBlob(
      (blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      },
      "image/jpeg",
      0.85,
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [loaded]);

  async function handleFile(file: File) {
    setErrorMessage(null);
    setRotation(0);
    const photo = await loadPhoto(file);
    setLoaded(photo);
    setPhase("preview");
  }

  function handleRotate() {
    setRotation((current) => nextRotation(current));
  }

  /**
   * Uploads the two exported JPEGs. A retry re-presigns (5-minute expiry) but
   * never redoes the canvas work — the blobs from the first attempt are kept
   * and re-sent as-is, so "Try again" never asks for a re-photograph.
   */
  async function startUpload() {
    setPhase("uploading");
    setProgress(0);
    setErrorMessage(null);

    try {
      let originalBlob: Blob;
      let modelBlob: Blob;
      let width: number;
      let height: number;
      let presign: {
        photoId: string;
        original: { url: string; fields: Record<string, string> };
        model: { url: string; fields: Record<string, string> };
      };

      const cached = uploadResult.current;
      const cacheIsFresh = !!cached && Date.now() - cached.presignedAt < PRESIGN_REUSE_WINDOW_MS;

      if (cached && cacheIsFresh) {
        ({ originalBlob, modelBlob, width, height, presign } = cached);
      } else {
        if (cached) {
          ({ originalBlob, modelBlob, width, height } = cached);
        } else {
          if (!loaded) throw new Error("No photo loaded.");
          const upright = rotateCanvas(loaded.canvas, rotation);
          const exported = await exportPhoto(upright);
          originalBlob = exported.originalBlob;
          modelBlob = exported.modelBlob;
          width = exported.width;
          height = exported.height;
        }
        presign = await requestUploadUrls(width, height);
      }

      uploadResult.current = {
        originalBlob,
        modelBlob,
        width,
        height,
        presign,
        presignedAt: cached && cacheIsFresh ? cached.presignedAt : Date.now(),
      };

      let originalProgress = 0;
      let modelProgress = 0;
      const updateProgress = () => setProgress((originalProgress + modelProgress) / 2);

      await Promise.all([
        postFormUpload(presign.original.url, presign.original.fields, originalBlob, (fraction) => {
          originalProgress = fraction;
          updateProgress();
        }),
        postFormUpload(presign.model.url, presign.model.fields, modelBlob, (fraction) => {
          modelProgress = fraction;
          updateProgress();
        }),
      ]);

      setPhase("choose-path");
    } catch (error) {
      if (error instanceof UploadCappedError) {
        setPhase("upload-capped");
        return;
      }
      setErrorMessage("That didn't upload.");
      setPhase("upload-error");
    }
  }

  async function requestUploadUrls(
    width: number,
    height: number,
  ): Promise<{
    photoId: string;
    original: { url: string; fields: Record<string, string> };
    model: { url: string; fields: Record<string, string> };
  }> {
    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "sheet", rotation, width, height }),
    });
    // A daily upload cap (security review): a plain, non-technical stop, not
    // an error — manual entry on an already-saved photo is unaffected.
    if (response.status === 429) throw new UploadCappedError();
    if (!response.ok) throw new Error("Could not get an upload URL.");
    return (await response.json()) as {
      photoId: string;
      original: { url: string; fields: Record<string, string> };
      model: { url: string; fields: Record<string, string> };
    };
  }

  async function handleTypeByHand() {
    if (!uploadResult.current) return;
    setPhase("creating-draft");
    setErrorMessage(null);

    try {
      const columnIds = Array.from({ length: DEFAULT_STARTING_COLUMNS }, () => newId("col"));
      const state = emptyDraftState({
        photoId: uploadResult.current.presign.photoId,
        playedOn: localCalendarDay(),
        columnIds,
      });

      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId: uploadResult.current.presign.photoId, state }),
      });
      if (!response.ok) throw new Error("Could not start the review.");
      const body = (await response.json()) as { draftId: string };
      router.push(`/review/${body.draftId}`);
    } catch {
      setErrorMessage("That didn't start. Check your connection and try again.");
      setPhase("draft-error");
    }
  }

  /**
   * "Read the sheet": posts straight to `POST /api/transcribe` with the
   * photo's id and the browser's local calendar day (⚠️ required here — this
   * route creates its own draft when none exists yet, and without `playedOn`
   * it would default to UTC-today, wrong for part of every Australian day).
   * "Try again" calls this again with the same `photoId`, never re-uploading
   * or reopening the camera (PRD criterion 53).
   */
  async function runTranscribe() {
    if (!uploadResult.current) return;
    const photoId = uploadResult.current.presign.photoId;

    setPhase("transcribing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId, playedOn: localCalendarDay() }),
      });

      if (response.status === 429) {
        setDailyCapHit(true);
        setPhase("choose-path");
        return;
      }
      if (!response.ok || !response.body) {
        setPhase("transcribe-error");
        return;
      }

      let draftId: string | null = null;
      let columns: TranscribeColumnDiagnostic[] = [];
      let sawError = false;

      await consumeNdjsonStream(response.body, (raw) => {
        const event = parseTranscribeEvent(raw);
        if (!event) return;
        if (event.type === "result") {
          draftId = event.draftId;
          columns = event.columns;
        } else if (event.type === "error") {
          sawError = true;
        }
        // "progress" events need no local state — TranscribeProgress cycles
        // its own captions independently of the stream's heartbeat.
      });

      if (sawError || !draftId) {
        setPhase("transcribe-error");
        return;
      }

      // Handed to the review screen for this one visit only — the model's
      // doubt is live diagnostics for this attempt, never persisted on the
      // draft (docs/DESIGN-SYSTEM.md § ReadHint), so it travels no further
      // than `sessionStorage` and is removed the moment the review screen
      // reads it.
      window.sessionStorage.setItem(`transcribe-hints:${draftId}`, JSON.stringify(columns));
      router.push(`/review/${draftId}`);
    } catch {
      setPhase("transcribe-error");
    }
  }

  function handleReadSheet() {
    setDailyCapHit(false);
    void runTranscribe();
  }

  return (
    <div className="flex flex-col gap-5">
      {phase === "empty" ? <PhotoCapture onFile={handleFile} /> : null}

      {(phase === "preview" ||
        phase === "uploading" ||
        phase === "upload-error" ||
        phase === "upload-capped" ||
        phase === "choose-path" ||
        phase === "creating-draft" ||
        phase === "draft-error" ||
        phase === "transcribing" ||
        phase === "transcribe-error") &&
      previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-[var(--radius)] border border-line bg-sunk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview of the photographed sheet"
              className="absolute inset-0 h-full w-full object-contain transition-transform"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>

          {phase === "preview" ? (
            <>
              <RotateControl onRotate={handleRotate} />
              <button
                type="button"
                onClick={() => startUpload()}
                className={buttonClasses("primary", { fullWidth: true })}
              >
                {UPRIGHT_CONFIRM_LABEL}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {phase === "uploading" ? (
        <UploadProgress
          thumbnailUrl={previewUrl ?? ""}
          progress={progress}
          error={false}
          onRetry={() => {}}
        />
      ) : null}

      {phase === "upload-error" ? (
        <UploadProgress
          thumbnailUrl={previewUrl ?? ""}
          progress={progress}
          error
          onRetry={() => startUpload()}
        />
      ) : null}

      {phase === "upload-capped" ? (
        <Banner tone="warn" title={UPLOAD_CAP_TITLE}>
          {UPLOAD_CAP_MESSAGE}
        </Banner>
      ) : null}

      {phase === "choose-path" || phase === "creating-draft" || phase === "draft-error" ? (
        <div className="flex flex-col gap-3">
          {dailyCapHit ? (
            <Banner tone="warn" title={DAILY_TRANSCRIBE_CAP_TITLE}>
              {DAILY_TRANSCRIBE_CAP_MESSAGE}
            </Banner>
          ) : null}

          {/* Equal weight, neither a fallback for the other: "Read the sheet"
              is `primary`, "Type it in by hand" is `ghost`, same reach. */}
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <button
              type="button"
              onClick={handleReadSheet}
              className={buttonClasses("primary", { fullWidth: true })}
            >
              {READ_SHEET_LABEL}
            </button>
            <p className="mt-2 text-center text-sm text-text-muted">{READ_SHEET_HELPER}</p>
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <button
              type="button"
              disabled={phase === "creating-draft"}
              aria-busy={phase === "creating-draft" || undefined}
              onClick={handleTypeByHand}
              className={buttonClasses("ghost", { fullWidth: true })}
            >
              {phase === "creating-draft" ? "Starting…" : HAND_ENTRY_LABEL}
            </button>
            <p className="mt-2 text-center text-sm text-text-muted">{HAND_ENTRY_HELPER}</p>
          </div>

          {errorMessage && phase === "draft-error" ? (
            <Banner tone="error" title={errorMessage}>
              Check your connection and try again.
            </Banner>
          ) : null}
        </div>
      ) : null}

      {phase === "transcribing" ? <TranscribeProgress thumbnailUrl={previewUrl ?? ""} /> : null}

      {phase === "transcribe-error" ? (
        <div className="flex flex-col gap-3">
          <Banner tone="error" title={READ_ERROR_TITLE}>
            {READ_ERROR_MESSAGE}
          </Banner>
          <button
            type="button"
            onClick={() => void runTranscribe()}
            className={buttonClasses("primary", { fullWidth: true })}
          >
            {READ_RETRY_LABEL}
          </button>

          {/* Equal reach directly below the retry — a bad read is never a dead end. */}
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <button
              type="button"
              onClick={handleTypeByHand}
              className={buttonClasses("ghost", { fullWidth: true })}
            >
              {HAND_ENTRY_LABEL}
            </button>
            <p className="mt-2 text-center text-sm text-text-muted">{HAND_ENTRY_HELPER}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
