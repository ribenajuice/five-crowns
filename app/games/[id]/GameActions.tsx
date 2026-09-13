"use client";

/**
 * "Edit this game" and "Delete game" on the game view.
 *
 * PRD criterion 115: "Edit this game" posts to `POST /api/games/{id}/edit`
 * (mints or resumes an open edit draft) and navigates to `/review/{draftId}`
 * — the exact "start a flow, POST, navigate to the review screen" shape
 * `AddGameFlow`'s "type it in by hand" path already uses.
 *
 * Criterion 124: "Delete game" is never the delete itself — it only navigates
 * to the dedicated confirmation screen at `/games/{id}/delete`
 * (docs/DESIGN-SYSTEM.md § "Deleting a game": "an interstitial screen, never
 * a single extra tap on the same view").
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Banner } from "@/components/Banner";
import { buttonClasses, destructiveButtonClasses } from "@/components/Button";
import { TrashIcon } from "@/components/icons";
import {
  DELETE_GAME_BUTTON_LABEL,
  EDIT_GAME_BUTTON_LABEL,
  EDIT_GAME_START_ERROR_BODY,
  EDIT_GAME_START_ERROR_TITLE,
} from "@/lib/ui/copy";

export function GameActions({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  async function handleEdit() {
    setStarting(true);
    setError(false);
    try {
      const response = await fetch(`/api/games/${gameId}/edit`, { method: "POST" });
      if (!response.ok) throw new Error("edit_start_failed");
      const body = (await response.json()) as { draftId: string };
      router.push(`/review/${body.draftId}`);
    } catch {
      setError(true);
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void handleEdit()}
        disabled={starting}
        aria-busy={starting || undefined}
        className={buttonClasses("ghost", { fullWidth: true })}
      >
        {starting ? "Starting…" : EDIT_GAME_BUTTON_LABEL}
      </button>

      {error ? (
        <Banner tone="error" title={EDIT_GAME_START_ERROR_TITLE}>
          {EDIT_GAME_START_ERROR_BODY}
        </Banner>
      ) : null}

      <Link href={`/games/${gameId}/delete`} className={destructiveButtonClasses()}>
        <TrashIcon />
        {DELETE_GAME_BUTTON_LABEL}
      </Link>
    </div>
  );
}
