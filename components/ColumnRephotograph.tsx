"use client";

/**
 * `ColumnRephotograph` — wires together the Stage 4 targeted re-photograph
 * ladder (docs/DESIGN-SYSTEM.md § "Photograph this column" / "The old-vs-new
 * comparison"; PRD criteria 36–45) into one self-contained piece dropped into
 * `ActiveColumnCard`.
 *
 * Owns its own phase state end to end — capture → rotate/confirm →
 * `POST /api/uploads {kind:'column'}` → S3 → `POST /api/transcribe/column`'s
 * NDJSON stream → `ReadingCompare` — the same shape `AddGameFlow` already
 * uses for the whole-sheet path, scoped to one column. `children` is the
 * column's ordinary photo-strip-and-grid content, shown whenever nothing here
 * is in flight; once a close-up starts uploading, this component's own
 * content **replaces** `children` in place (no new modal for the reading
 * itself), exactly as docs/DESIGN-SYSTEM.md's screen rules describe.
 *
 * ⚠️ **Known limitation.** State here is keyed to this one column and is not
 * persisted anywhere except at the moment a merge lands (which the server has
 * already applied by the time this component hears about it). Switching to a
 * different `ColumnPager` chip mid-flow unmounts this component for that
 * column; the reading itself is safe (already saved server-side), but the
 * compare screen won't resurface automatically if the founder switches back —
 * they would need to re-open it from `ReadingHistoryList`. Documented as a
 * scope cut for Stage 4 rather than silently accepted.
 */

import { useEffect, useRef, useState } from "react";

import type { CellValue } from "@/lib/scoring";
import { HANDS_PER_GAME } from "@/lib/scoring";
import type { DraftColumn } from "@/lib/draft/state";
import { consumeNdjsonStream } from "@/lib/ui/ndjson";
import {
  parseTranscribeColumnEvent,
  type ColumnMergeDiagnosticsWire,
} from "@/lib/ui/transcribe-events";
import { exportPhoto, loadPhoto, rotateCanvas, type LoadedPhoto } from "@/lib/ui/image-pipeline";
import { nextRotation, type Rotation } from "@/lib/ui/rotation";
import { postFormUpload } from "@/lib/ui/upload";
import {
  columnReadHeading,
  COLUMN_READ_CAPTIONS,
  COMPARE_NEW_LABEL_DEFAULT,
  COMPARE_OLD_LABEL_DEFAULT,
  compareKeepActiveLabel,
  compareMakeActiveLabel,
  compareVsPastReadingHeading,
  incompleteCloseupNote,
  photographColumnHeading,
  PHOTOGRAPH_COLUMN_BUTTON,
  PHOTOGRAPH_COLUMN_HELPER,
  READ_ERROR_MESSAGE,
  READ_ERROR_TITLE,
  READ_RETRY_LABEL,
  READING_HISTORY_LINK_TEXT,
  readingHistoryHeading,
  readingLabel,
  UPRIGHT_CONFIRM_LABEL,
} from "@/lib/ui/copy";
import { Banner } from "./Banner";
import { BottomSheet } from "./BottomSheet";
import { buttonClasses } from "./Button";
import { CameraIcon } from "./icons";
import { PhotoCapture } from "./PhotoCapture";
import { ReadingCompare } from "./ReadingCompare";
import { ReadingHistoryList } from "./ReadingHistoryList";
import { RotateControl } from "./RotateControl";
import { TranscribeProgress } from "./TranscribeProgress";
import { UploadProgress } from "./UploadProgress";

type Phase =
  | "idle"
  | "capture"
  | "preview"
  | "uploading"
  | "upload-error"
  | "transcribing"
  | "transcribe-error"
  | "compare"
  | "compare-past";

function rawValuesOfReading(column: DraftColumn, readingId: string | null): readonly CellValue[] {
  return column.readings.find((r) => r.id === readingId)?.values ?? [];
}

export interface ColumnRephotographProps {
  draftId: string;
  column: DraftColumn;
  playerLabel: string;
  /** The server's merged column (readings, activeReadingId, sheetName) —
   *  every other column on the draft is untouched, so the parent only needs
   *  to splice this one back into its own draft state and autosave. */
  onColumnMerged: (updatedColumn: DraftColumn) => void;
  /** "Keep what's saved" / "Make {reading} active" — a pure client-side
   *  switch, no network call of its own (`lib/ui/draft-edits.ts`'s
   *  `setActiveReading`), which the parent autosaves the normal way. */
  onRevertReading: (readingId: string) => void;
  /** Drives the pager dot's hollow accent ring while a read is in flight. */
  onReadingChange?: (reading: boolean) => void;
  children: React.ReactNode;
}

export function ColumnRephotograph({
  draftId,
  column,
  playerLabel,
  onColumnMerged,
  onRevertReading,
  onReadingChange,
  children,
}: ColumnRephotographProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pastReadingId, setPastReadingId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<ColumnMergeDiagnosticsWire | null>(null);

  const previousReadingIdRef = useRef<string | null>(null);
  const uploadRef = useRef<{
    originalBlob: Blob;
    modelBlob: Blob;
    width: number;
    height: number;
    photoId: string;
    original: { url: string; fields: Record<string, string> };
    model: { url: string; fields: Record<string, string> };
  } | null>(null);

  useEffect(() => {
    onReadingChange?.(phase === "transcribing");
    // Clears the pager's accent ring if this component unmounts mid-read —
    // e.g. the founder switches to another column's chip before this one's
    // close-up finishes. The read itself keeps running server-side; only the
    // "busy" indicator for this now-unmounted instance needs to drop.
    return () => onReadingChange?.(false);
  }, [phase, onReadingChange]);

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

  function openCapture() {
    setDiagnostics(null);
    setRotation(0);
    setLoaded(null);
    setPhase("capture");
  }

  async function handleFile(file: File) {
    const photo = await loadPhoto(file);
    setLoaded(photo);
    setPhase("preview");
  }

  async function startUpload() {
    if (!loaded) return;
    previousReadingIdRef.current = column.activeReadingId;
    setPhase("uploading");
    setProgress(0);

    try {
      const upright = rotateCanvas(loaded.canvas, rotation);
      const exported = await exportPhoto(upright);

      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "column",
          draftId,
          columnId: column.id,
          rotation,
          width: exported.width,
          height: exported.height,
        }),
      });
      if (!response.ok) throw new Error("Could not get an upload URL.");
      const presign = (await response.json()) as {
        photoId: string;
        original: { url: string; fields: Record<string, string> };
        model: { url: string; fields: Record<string, string> };
      };

      uploadRef.current = {
        originalBlob: exported.originalBlob,
        modelBlob: exported.modelBlob,
        width: exported.width,
        height: exported.height,
        photoId: presign.photoId,
        original: presign.original,
        model: presign.model,
      };

      await uploadBothVariants();
      void runTranscribe();
    } catch {
      setPhase("upload-error");
    }
  }

  async function uploadBothVariants() {
    const cached = uploadRef.current;
    if (!cached) throw new Error("Nothing staged to upload.");
    let originalProgress = 0;
    let modelProgress = 0;
    const updateProgress = () => setProgress((originalProgress + modelProgress) / 2);

    await Promise.all([
      postFormUpload(cached.original.url, cached.original.fields, cached.originalBlob, (f) => {
        originalProgress = f;
        updateProgress();
      }),
      postFormUpload(cached.model.url, cached.model.fields, cached.modelBlob, (f) => {
        modelProgress = f;
        updateProgress();
      }),
    ]);
  }

  async function retryUpload() {
    setPhase("uploading");
    setProgress(0);
    try {
      await uploadBothVariants();
      void runTranscribe();
    } catch {
      setPhase("upload-error");
    }
  }

  async function runTranscribe() {
    const cached = uploadRef.current;
    if (!cached) return;
    setPhase("transcribing");

    try {
      const response = await fetch("/api/transcribe/column", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId: cached.photoId, columnId: column.id }),
      });
      if (!response.ok || !response.body) {
        setPhase("transcribe-error");
        return;
      }

      let mergedColumn: DraftColumn | null = null;
      let mergeDiagnostics: ColumnMergeDiagnosticsWire | null = null;
      let sawError = false;

      await consumeNdjsonStream(response.body, (raw) => {
        const event = parseTranscribeColumnEvent(raw);
        if (!event) return;
        if (event.type === "result") {
          const state = event.state as { columns?: DraftColumn[] } | null;
          mergedColumn = state?.columns?.find((c) => c.id === column.id) ?? null;
          mergeDiagnostics = event.diagnostics;
        } else if (event.type === "error") {
          sawError = true;
        }
      });

      if (sawError || !mergedColumn) {
        setPhase("transcribe-error");
        return;
      }

      setDiagnostics(mergeDiagnostics);
      onColumnMerged(mergedColumn);
      setPhase("compare");
    } catch {
      setPhase("transcribe-error");
    }
  }

  function closeCompare() {
    setDiagnostics(null);
    setPastReadingId(null);
    setPhase("idle");
  }

  const readingCount = column.readings.length;

  const isReplacing =
    phase === "uploading" ||
    phase === "upload-error" ||
    phase === "transcribing" ||
    phase === "transcribe-error" ||
    phase === "compare" ||
    phase === "compare-past";

  const captureSheet = (
    <BottomSheet
      open={phase === "capture" || phase === "preview"}
      onClose={() => setPhase("idle")}
      title={photographColumnHeading(playerLabel)}
    >
      {phase === "capture" ? (
        <div className="flex flex-col gap-3">
          <PhotoCapture onFile={(file) => void handleFile(file)} />
          <p className="text-sm text-text-muted">{PHOTOGRAPH_COLUMN_HELPER}</p>
        </div>
      ) : previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-[var(--radius)] border border-line bg-sunk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview of the close-up"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>
          <RotateControl onRotate={() => setRotation((r) => nextRotation(r))} />
          <button
            type="button"
            onClick={() => void startUpload()}
            className={buttonClasses("accent", { fullWidth: true })}
          >
            {UPRIGHT_CONFIRM_LABEL}
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );

  const historySheet = (
    <BottomSheet
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      title={readingHistoryHeading(playerLabel)}
    >
      <ReadingHistoryList
        readings={column.readings.map((r) => ({
          id: r.id,
          source: r.source,
          at: r.at,
          active: r.id === column.activeReadingId,
        }))}
        onSelect={(readingId) => {
          setHistoryOpen(false);
          if (readingId === column.activeReadingId) return;
          setPastReadingId(readingId);
          setPhase("compare-past");
        }}
      />
    </BottomSheet>
  );

  if (!isReplacing) {
    return (
      <>
        {children}
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={openCapture}
            className={`${buttonClasses("accent", { fullWidth: true })} gap-2`}
          >
            <CameraIcon />
            {PHOTOGRAPH_COLUMN_BUTTON}
          </button>
          {readingCount > 1 ? (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="text-sm font-bold text-brand"
            >
              {READING_HISTORY_LINK_TEXT} ({readingCount})
            </button>
          ) : null}
        </div>
        {captureSheet}
        {historySheet}
      </>
    );
  }

  return (
    <div className="mt-3">
      {phase === "uploading" ? (
        <UploadProgress thumbnailUrl={previewUrl ?? ""} progress={progress} error={false} onRetry={() => {}} />
      ) : null}

      {phase === "upload-error" ? (
        <UploadProgress
          thumbnailUrl={previewUrl ?? ""}
          progress={progress}
          error
          onRetry={() => void retryUpload()}
        />
      ) : null}

      {phase === "transcribing" ? (
        <TranscribeProgress
          thumbnailUrl={previewUrl ?? ""}
          heading={columnReadHeading(playerLabel)}
          captions={COLUMN_READ_CAPTIONS}
          thumbnailAlt="The close-up being read"
        />
      ) : null}

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
        </div>
      ) : null}

      {phase === "compare"
        ? (() => {
            const oldValues = rawValuesOfReading(column, previousReadingIdRef.current);
            const newValues = rawValuesOfReading(column, column.activeReadingId);
            const filled = newValues.filter((v) => v !== null).length;
            const incomplete = newValues.length < HANDS_PER_GAME || filled < HANDS_PER_GAME;
            return (
              <ReadingCompare
                oldLabel={COMPARE_OLD_LABEL_DEFAULT}
                newLabel={COMPARE_NEW_LABEL_DEFAULT}
                oldValues={oldValues}
                newValues={newValues}
                wrongColumnWarning={
                  diagnostics?.possibleWrongColumn && diagnostics.readPlayerName
                    ? { sheetPlayer: diagnostics.readPlayerName, assignedPlayer: playerLabel }
                    : null
                }
                typedCellDisagreements={diagnostics?.disagreesWithTypedCells ?? []}
                incompleteNote={incomplete ? incompleteCloseupNote(playerLabel, filled) : null}
                onKeepNew={closeCompare}
                onKeepOld={() => {
                  if (previousReadingIdRef.current) onRevertReading(previousReadingIdRef.current);
                  closeCompare();
                }}
                onPhotographAgain={openCapture}
                onSeeHistory={() => setHistoryOpen(true)}
                historyCount={readingCount}
              />
            );
          })()
        : null}

      {phase === "compare-past" && pastReadingId
        ? (() => {
            const id = pastReadingId;
            const pastIndex = column.readings.findIndex((r) => r.id === id);
            const activeIndex = column.readings.findIndex((r) => r.id === column.activeReadingId);
            const pastLabel = readingLabel(pastIndex + 1);
            const activeLabel = readingLabel(activeIndex + 1);
            return (
              <ReadingCompare
                subheading={compareVsPastReadingHeading(pastLabel)}
                oldLabel={pastLabel}
                newLabel={activeLabel}
                oldValues={rawValuesOfReading(column, id)}
                newValues={rawValuesOfReading(column, column.activeReadingId)}
                keepOldLabel={compareMakeActiveLabel(pastLabel)}
                keepNewLabel={compareKeepActiveLabel(activeLabel)}
                onKeepOld={() => {
                  onRevertReading(id);
                  closeCompare();
                }}
                onKeepNew={closeCompare}
                onPhotographAgain={openCapture}
                onSeeHistory={() => setHistoryOpen(true)}
                historyCount={readingCount}
                generalised
              />
            );
          })()
        : null}

      {captureSheet}
      {historySheet}
    </div>
  );
}
