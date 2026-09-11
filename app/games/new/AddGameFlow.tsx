"use client";

/**
 * `/games/new` — the add-a-game screen.
 *
 * `docs/DESIGN-SYSTEM.md` § Screen rules: photo first, always — nothing else
 * on this screen until a sheet photo exists. Two moments: get the photo, then
 * choose how the numbers go in. The lead's Stage 2 override: "Read the sheet"
 * is not rendered at all (a control that does nothing is worse than none);
 * "Type it in by hand" is the only live path, worded as an ordinary choice,
 * never a fallback (PRD criterion 47).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Banner } from "@/components/Banner";
import { buttonClasses } from "@/components/Button";
import { PhotoCapture } from "@/components/PhotoCapture";
import { RotateControl } from "@/components/RotateControl";
import { UploadProgress } from "@/components/UploadProgress";
import { emptyDraftState } from "@/lib/draft/state";
import { newId } from "@/lib/ui/ids";
import { exportPhoto, loadPhoto, rotateCanvas, type LoadedPhoto } from "@/lib/ui/image-pipeline";
import { localCalendarDay } from "@/lib/ui/local-date";
import {
  HAND_ENTRY_HELPER,
  HAND_ENTRY_LABEL,
  UPLOAD_CAP_MESSAGE,
  UPLOAD_CAP_TITLE,
  UPRIGHT_CONFIRM_LABEL,
} from "@/lib/ui/copy";
import { nextRotation, type Rotation } from "@/lib/ui/rotation";
import { postFormUpload } from "@/lib/ui/upload";

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
  | "draft-error";

export function AddGameFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("empty");
  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The blobs and ids from a completed upload, kept so "Try again" never
  // re-photographs — only the network step is retried.
  const uploadResult = useRef<{
    photoId: string;
    originalBlob: Blob;
    modelBlob: Blob;
    width: number;
    height: number;
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

      if (uploadResult.current) {
        ({ originalBlob, modelBlob, width, height } = uploadResult.current);
      } else {
        if (!loaded) throw new Error("No photo loaded.");
        const upright = rotateCanvas(loaded.canvas, rotation);
        const exported = await exportPhoto(upright);
        originalBlob = exported.originalBlob;
        modelBlob = exported.modelBlob;
        width = exported.width;
        height = exported.height;
      }

      const presign = await requestUploadUrls(width, height);
      uploadResult.current = { photoId: presign.photoId, originalBlob, modelBlob, width, height };

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
        photoId: uploadResult.current.photoId,
        playedOn: localCalendarDay(),
        columnIds,
      });

      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId: uploadResult.current.photoId, state }),
      });
      if (!response.ok) throw new Error("Could not start the review.");
      const body = (await response.json()) as { draftId: string };
      router.push(`/review/${body.draftId}`);
    } catch {
      setErrorMessage("That didn't start. Check your connection and try again.");
      setPhase("draft-error");
    }
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
        phase === "draft-error") &&
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
        <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <button
            type="button"
            disabled={phase === "creating-draft"}
            aria-busy={phase === "creating-draft" || undefined}
            onClick={handleTypeByHand}
            className={buttonClasses("primary", { fullWidth: true })}
          >
            {phase === "creating-draft" ? "Starting…" : HAND_ENTRY_LABEL}
          </button>
          <p className="mt-2 text-center text-sm text-text-muted">{HAND_ENTRY_HELPER}</p>
        </div>
      ) : null}

      {errorMessage && phase === "draft-error" ? (
        <Banner tone="error" title={errorMessage}>
          Check your connection and try again.
        </Banner>
      ) : null}
    </div>
  );
}
