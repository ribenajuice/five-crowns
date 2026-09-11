"use client";

/**
 * `CropFrame` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * A rectangle over the whole photo, four 44px corner handles to resize,
 * drag-anywhere-inside to pan. Confirms a column's `crop` — normalised
 * `{x,y,width,height}` covering that column's eleven cells top to bottom.
 * Starting guess: the photo split evenly by column count and this column's
 * order (design system: "we've guessed evenly — drag to line it up").
 *
 * Every drag target is also a real, focusable control with an arrow-key
 * equivalent (`nudge`) — pointer dragging is the fast path, not the only path
 * (hard rule: every interactive element is keyboard operable).
 */

import { useRef, useState } from "react";

import type { Crop } from "@/lib/draft/state";
import { CROP_CONFIRM_LABEL, CROP_GUESS_CAPTION } from "@/lib/ui/copy";
import { buttonClasses } from "./Button";

type Corner = "nw" | "ne" | "sw" | "se";
type DragMode = "pan" | Corner;

const MIN_SIZE = 0.03;
/** One arrow-key press; Shift steps ten times further. */
const KEYBOARD_STEP = 0.01;
const KEYBOARD_STEP_LARGE = 0.1;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function guessedCrop(columnOrder: number, columnCount: number): Crop {
  const share = columnCount > 0 ? 1 / columnCount : 1;
  return { x: share * columnOrder, y: 0, width: share, height: 1 };
}

/** Apply one pan/resize delta to a crop, clamped to stay inside the photo. */
function applyDelta(mode: DragMode, from: Crop, dx: number, dy: number): Crop {
  if (mode === "pan") {
    return {
      ...from,
      x: clamp(from.x + dx, 0, 1 - from.width),
      y: clamp(from.y + dy, 0, 1 - from.height),
    };
  }

  let { x, y, width, height } = from;
  if (mode === "nw" || mode === "sw") {
    const newX = clamp(from.x + dx, 0, from.x + from.width - MIN_SIZE);
    width = from.x + from.width - newX;
    x = newX;
  }
  if (mode === "ne" || mode === "se") {
    width = clamp(from.width + dx, MIN_SIZE, 1 - from.x);
  }
  if (mode === "nw" || mode === "ne") {
    const newY = clamp(from.y + dy, 0, from.y + from.height - MIN_SIZE);
    height = from.y + from.height - newY;
    y = newY;
  }
  if (mode === "sw" || mode === "se") {
    height = clamp(from.height + dy, MIN_SIZE, 1 - from.y);
  }
  return { x, y, width, height };
}

/** Arrow keys → the same delta a drag would produce, one step at a time. */
function deltaForKey(key: string, step: number): { dx: number; dy: number } | null {
  switch (key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -step };
    case "ArrowDown":
      return { dx: 0, dy: step };
    default:
      return null;
  }
}

const CORNER_LABEL: Record<Corner, string> = {
  nw: "top-left",
  ne: "top-right",
  sw: "bottom-left",
  se: "bottom-right",
};

interface CropFrameProps {
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  columnOrder: number;
  columnCount: number;
  initialCrop: Crop | null;
  onConfirm: (crop: Crop) => void;
}

export function CropFrame({
  photoUrl,
  photoWidth,
  photoHeight,
  columnOrder,
  columnCount,
  initialCrop,
  onConfirm,
}: CropFrameProps) {
  const [crop, setCrop] = useState<Crop>(initialCrop ?? guessedCrop(columnOrder, columnCount));
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: DragMode;
    startClientX: number;
    startClientY: number;
    startCrop: Crop;
  } | null>(null);

  function beginDrag(mode: DragMode, event: React.PointerEvent) {
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: crop,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const d = drag.current;
    const container = containerRef.current;
    if (!d || !container) return;

    const rect = container.getBoundingClientRect();
    const dx = (event.clientX - d.startClientX) / rect.width;
    const dy = (event.clientY - d.startClientY) / rect.height;
    setCrop(applyDelta(d.mode, d.startCrop, dx, dy));
  }

  function endDrag() {
    drag.current = null;
  }

  function onKeyDownFor(mode: DragMode) {
    return (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
      const delta = deltaForKey(event.key, step);
      if (!delta) return;
      event.preventDefault();
      setCrop((current) => applyDelta(mode, current, delta.dx, delta.dy));
    };
  }

  const guideLines = Array.from({ length: Math.max(columnCount - 1, 0) }, (_, i) =>
    ((i + 1) / columnCount) * 100,
  );

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">{CROP_GUESS_CAPTION}</p>
      <div
        ref={containerRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-[var(--radius)] bg-sunk"
        style={{ aspectRatio: `${photoWidth} / ${photoHeight}` }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="The whole sheet photo"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {guideLines.map((pct) => (
          <div
            key={pct}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-brand/40"
            style={{ left: `${pct}%` }}
          />
        ))}

        <div
          role="button"
          tabIndex={0}
          aria-label="Move the crop. Arrow keys nudge it; hold Shift to move further."
          onPointerDown={(event) => beginDrag("pan", event)}
          onKeyDown={onKeyDownFor("pan")}
          className="absolute cursor-move touch-none border-2 border-accent bg-accent/15"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.width * 100}%`,
            height: `${crop.height * 100}%`,
          }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize the ${CORNER_LABEL[corner]} corner. Arrow keys nudge it; hold Shift to move further.`}
              onPointerDown={(event) => beginDrag(corner, event)}
              onKeyDown={onKeyDownFor(corner)}
              className={[
                "absolute size-11 touch-none rounded-full border-2 border-accent bg-surface",
                corner === "nw" ? "-left-5 -top-5" : "",
                corner === "ne" ? "-right-5 -top-5" : "",
                corner === "sw" ? "-left-5 -bottom-5" : "",
                corner === "se" ? "-right-5 -bottom-5" : "",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onConfirm(crop)}
        className={`${buttonClasses("primary", { fullWidth: true })} mt-4`}
      >
        {CROP_CONFIRM_LABEL}
      </button>
    </div>
  );
}
