"use client";

/**
 * `TranscribeProgress` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Appears within 2s of submitting a photo for reading (PRD criterion 52).
 * Photo thumbnail, an **indeterminate** bar — there's nothing real to measure
 * against a tens-of-seconds model call — and a caption that cycles through
 * every caption but the last, with that last, slower-only line earning its
 * place after ~20s so a fast read never shows it.
 *
 * Stage 4 reuses this component, narrower, for the column-scoped read
 * (docs/DESIGN-SYSTEM.md § "Column-scoped `TranscribeProgress`"): a custom
 * `heading` and `captions` — one regular caption instead of two, sharing the
 * same slow-only last line — rather than a second, near-identical component.
 */

import { useEffect, useState } from "react";

import { TRANSCRIBE_PROGRESS_CAPTIONS, TRANSCRIBE_PROGRESS_HEADING } from "@/lib/ui/copy";

const CAPTION_CYCLE_MS = 3500;
const SLOW_CAPTION_AFTER_MS = 20_000;

interface TranscribeProgressProps {
  thumbnailUrl: string;
  /** Defaults to the full-sheet read's heading (Stage 3). */
  heading?: string;
  /** Every caption but the last cycles normally; the last is the slow-only
   *  line, shared verbatim between the sheet and column-scoped reads. */
  captions?: readonly string[];
  thumbnailAlt?: string;
}

export function TranscribeProgress({
  thumbnailUrl,
  heading = TRANSCRIBE_PROGRESS_HEADING,
  captions = TRANSCRIBE_PROGRESS_CAPTIONS,
  thumbnailAlt = "The sheet being read",
}: TranscribeProgressProps) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  const regularCaptions = captions.slice(0, -1);
  const slowCaption = captions[captions.length - 1];

  useEffect(() => {
    const cycle = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % Math.max(regularCaptions.length, 1));
    }, CAPTION_CYCLE_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_CAPTION_AFTER_MS);
    return () => {
      clearInterval(cycle);
      clearTimeout(slowTimer);
    };
  }, [regularCaptions.length]);

  const caption = slow ? slowCaption : (regularCaptions[captionIndex] ?? slowCaption);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[var(--radius)] border border-line bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={thumbnailAlt}
          className="size-14 shrink-0 rounded-[var(--radius)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 font-display text-lg font-bold">{heading}</p>
          <progress className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-sunk [&::-webkit-progress-value]:bg-brand" />
        </div>
      </div>
      <p className="mt-3 text-sm text-text-muted">{caption}</p>
    </div>
  );
}
