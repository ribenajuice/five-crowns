"use client";

/**
 * The one `Card` on the delete confirmation screen: the heading naming the
 * game itself, the two fixed sentences, then Cancel / Delete permanently
 * (docs/DESIGN-SYSTEM.md § "Deleting a game"; PRD criteria 124–126).
 *
 * `DELETE /api/games/{id}` is only ever called from the commit button below —
 * this is the "deliberate second action" criterion 124 requires.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Banner } from "@/components/Banner";
import { ButtonLink, destructiveButtonClasses } from "@/components/Button";
import { TrashIcon } from "@/components/icons";
import {
  DELETE_CONFIRM_BODY,
  DELETE_CONFIRM_CANCEL_BUTTON,
  DELETE_CONFIRM_COMMIT_BUTTON,
  DELETE_GAME_ERROR_BODY,
  DELETE_GAME_ERROR_TITLE,
  deleteConfirmHeading,
} from "@/lib/ui/copy";

interface DeleteGameCardProps {
  gameId: string;
  playedOn: string;
  rosterName: string;
}

export function DeleteGameCard({ gameId, playedOn, rosterName }: DeleteGameCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(false);
    try {
      const response = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      // A 404 here means the game is already gone by the time the tap
      // landed — the desired end state (no such game) already holds, so
      // this is treated the same as success rather than shown as a failure
      // to retry.
      if (response.ok || response.status === 404) {
        router.push("/games");
        return;
      }
      throw new Error("delete_failed");
    } catch {
      setError(true);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-line bg-surface p-4">
      <div>
        <h2 className="font-display text-lg font-bold">
          {deleteConfirmHeading(playedOn, rosterName)}
        </h2>
        <p className="mt-2 text-text-muted">{DELETE_CONFIRM_BODY}</p>
      </div>

      {error ? (
        <Banner tone="error" title={DELETE_GAME_ERROR_TITLE}>
          {DELETE_GAME_ERROR_BODY}
        </Banner>
      ) : null}

      <div className="flex flex-col gap-3">
        <ButtonLink href={`/games/${gameId}`} variant="ghost" fullWidth>
          {DELETE_CONFIRM_CANCEL_BUTTON}
        </ButtonLink>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          aria-busy={deleting || undefined}
          className={destructiveButtonClasses()}
        >
          <TrashIcon />
          {deleting ? "Deleting…" : DELETE_CONFIRM_COMMIT_BUTTON}
        </button>
      </div>
    </div>
  );
}
