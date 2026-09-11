/**
 * `UploadProgress` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Thumbnail + determinate `progress` bar + one-line label. Error state swaps
 * to `Banner error` + "Try again", which re-sends the same local photo —
 * never asks the founder to re-photograph.
 */

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { UPLOAD_IN_PROGRESS_LABEL, UPLOAD_RETRY_LABEL } from "@/lib/ui/copy";

interface UploadProgressProps {
  thumbnailUrl: string;
  /** 0–1. */
  progress: number;
  error: boolean;
  onRetry: () => void;
}

export function UploadProgress({ thumbnailUrl, progress, error, onRetry }: UploadProgressProps) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt="The sheet you're uploading"
          className="size-14 shrink-0 rounded-[var(--radius)] object-cover"
        />
        <div className="min-w-0 flex-1">
          {error ? null : (
            <>
              <p className="mb-1.5 text-sm font-bold">{UPLOAD_IN_PROGRESS_LABEL}</p>
              <progress
                value={progress}
                max={1}
                className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-sunk [&::-webkit-progress-value]:bg-brand"
              />
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <Banner tone="error" title="That didn't upload.">
            Check your connection and try again.
          </Banner>
          <button type="button" onClick={onRetry} className={`${buttonClasses("primary")} mt-3`}>
            {UPLOAD_RETRY_LABEL}
          </button>
        </div>
      ) : null}
    </div>
  );
}
