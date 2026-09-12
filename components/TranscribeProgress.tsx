"use client";

/**
 * `TranscribeProgress` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Appears within 2s of submitting a photo for reading (PRD criterion 52).
 * Photo thumbnail, an **indeterminate** bar — there's nothing real to measure
 * against a tens-of-seconds model call — and a caption that cycles through
 * two present-tense lines, with a third, slower-only line that earns its
 * place after ~20s so a fast read never shows it.
 */

import { useEffect, useState } from "react";

import { TRANSCRIBE_PROGRESS_CAPTIONS, TRANSCRIBE_PROGRESS_HEADING } from "@/lib/ui/copy";

const CAPTION_CYCLE_MS = 3500;
const SLOW_CAPTION_AFTER_MS = 20_000;

interface TranscribeProgressProps {
  thumbnailUrl: string;
}

export function TranscribeProgress({ thumbnailUrl }: TranscribeProgressProps) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const cycle = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % 2);
    }, CAPTION_CYCLE_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_CAPTION_AFTER_MS);
    return () => {
      clearInterval(cycle);
      clearTimeout(slowTimer);
    };
  }, []);

  const caption = slow ? TRANSCRIBE_PROGRESS_CAPTIONS[2] : TRANSCRIBE_PROGRESS_CAPTIONS[captionIndex];

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
          alt="The sheet being read"
          className="size-14 shrink-0 rounded-[var(--radius)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 font-display text-lg font-bold">{TRANSCRIBE_PROGRESS_HEADING}</p>
          <progress className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-sunk [&::-webkit-progress-value]:bg-brand" />
        </div>
      </div>
      <p className="mt-3 text-sm text-text-muted">{caption}</p>
    </div>
  );
}
