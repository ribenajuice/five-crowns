"use client";

/**
 * `PhotoStrip` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * One column of the sheet photo, cropped to that column's `crop` rectangle,
 * rows on `--pitch`. If `crop` is `null`, shows the **whole photo** scaled to
 * fit instead of a blank — the photo is never absent (PRD criterion 15).
 */

import {
  computeCropStripGeometry,
  rowBandHeight,
  rowBandTop,
  rowTop,
  wholePhotoFit,
  type NormalisedCrop,
} from "@/lib/ui/crop-strip";
import { REVIEW_ROW_PITCH_PX } from "@/lib/ui/constants";
import {
  ADJUST_CROP_ARIA_LABEL,
  CROP_NOT_SET_BUTTON,
  CROP_NOT_SET_STRIP,
} from "@/lib/ui/copy";
import { buttonClasses } from "./Button";

/**
 * Caps the strip's width regardless of the crop's own aspect ratio, so it
 * always leaves the grid room at 375px (PRD criterion 13). Purely a display
 * clip — the underlying `crop` and its pitch alignment are untouched.
 */
const MAX_STRIP_WIDTH_PX = 130;

interface PhotoStripProps {
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  crop: NormalisedCrop | null;
  pitch?: number;
  hands?: number;
  /** Used only when there's no crop yet, to size the whole-photo fallback. */
  fallbackWidth?: number;
  /** Highlights one row — the cell editor's edited line. */
  highlightIndex?: number | null;
  onAdjustCrop?: () => void;
  onSetCrop?: () => void;
}

export function PhotoStrip({
  photoUrl,
  photoWidth,
  photoHeight,
  crop,
  pitch = REVIEW_ROW_PITCH_PX,
  hands = 11,
  fallbackWidth = 110,
  highlightIndex = null,
  onAdjustCrop,
  onSetCrop,
}: PhotoStripProps) {
  if (!crop) {
    const fit = wholePhotoFit(photoWidth, photoHeight, fallbackWidth);
    const bandTop =
      highlightIndex !== null ? rowBandTop(highlightIndex, fit.height, hands) : null;
    const bandHeight = rowBandHeight(fit.height, hands);

    return (
      <div className="flex shrink-0 flex-col items-center gap-2" style={{ width: fallbackWidth }}>
        <div
          className="relative overflow-hidden rounded-[var(--radius)] border border-line"
          style={{ width: fit.width, height: fit.height }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="The whole sheet photo — this column isn't lined up yet"
            className="block h-full w-full object-cover"
          />
          {bandTop !== null ? (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-y-2 border-accent bg-accent/20"
              style={{ top: bandTop, height: bandHeight }}
            />
          ) : null}
        </div>
        <p className="text-center text-sm text-text-muted">{CROP_NOT_SET_STRIP}</p>
        {onSetCrop ? (
          <button type="button" onClick={onSetCrop} className={buttonClasses("ghost")}>
            {CROP_NOT_SET_BUTTON}
          </button>
        ) : null}
      </div>
    );
  }

  const geometry = computeCropStripGeometry(crop, photoWidth, photoHeight, pitch, hands);
  // The pitch match (criterion 14) is a height constraint only; cap the width
  // so a wide or shallow crop can never force the sweep — strip beside grid —
  // into horizontal scroll at 375px (criterion 13). A capped strip clips its
  // right edge rather than breaking the layout; "Adjust crop" narrows it properly.
  const stripWidth = Math.min(geometry.stripWidth, MAX_STRIP_WIDTH_PX);

  return (
    <div
      className="relative shrink-0"
      style={{ width: stripWidth, height: geometry.stripHeight }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[var(--radius)] border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="This player's column, cropped from the sheet photo"
          className="absolute max-w-none"
          style={{
            width: geometry.photoDisplayWidth,
            height: geometry.photoDisplayHeight,
            left: geometry.offsetX,
            top: geometry.offsetY,
          }}
        />
        {highlightIndex !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-y-2 border-accent bg-accent/20"
            style={{ top: rowTop(highlightIndex, pitch), height: pitch }}
          />
        ) : null}
      </div>
      {onAdjustCrop ? (
        <button
          type="button"
          onClick={onAdjustCrop}
          aria-label={ADJUST_CROP_ARIA_LABEL}
          className="absolute bottom-1 right-1 inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-brand shadow-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 21l4-1 11-11-3-3L4 17l-1 4Z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
