"use client";

/**
 * `MergeConflictRefusal` — docs/DESIGN-SYSTEM.md § component inventory,
 * players only (criterion 160). Where the two players share a game, this
 * **replaces** the entire survivor-picker — refused before anything changes,
 * not a warning sitting above a still-enabled one. Every offending game is
 * named with a link to it and a link to edit it (which is how one of the two
 * players comes off that game), then a single "Back to {player}" way out.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { EntityLink } from "./EntityLink";
import {
  EDIT_GAME_BUTTON_LABEL,
  EDIT_GAME_START_ERROR_BODY,
  EDIT_GAME_START_ERROR_TITLE,
  NO_LOCATION_GAMES_LIST,
  SAME_GAME_REFUSAL_BODY,
  sameGameBackButtonLabel,
  sameGameRefusalTitle,
} from "@/lib/ui/copy";
import { requestGameEdit } from "@/lib/ui/game-actions";

export interface ConflictingGameLike {
  id: string;
  playedOn: string;
  locationName: string | null;
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EditGameLink({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  async function handleEdit() {
    setStarting(true);
    setError(false);
    try {
      const response = await requestGameEdit(gameId);
      if (!response.ok) throw new Error("edit_start_failed");
      const body = (await response.json()) as { draftId: string };
      router.push(`/review/${body.draftId}`);
    } catch {
      setError(true);
      setStarting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleEdit()}
        disabled={starting}
        aria-busy={starting || undefined}
        className="text-sm font-bold text-brand underline underline-offset-2"
      >
        {starting ? "Starting…" : EDIT_GAME_BUTTON_LABEL}
      </button>
      {error ? (
        <Banner tone="error" title={EDIT_GAME_START_ERROR_TITLE}>
          {EDIT_GAME_START_ERROR_BODY}
        </Banner>
      ) : null}
    </>
  );
}

export interface MergeConflictRefusalProps {
  aName: string;
  bName: string;
  games: ConflictingGameLike[];
  /** The originating player's own page — where "Back to {player}" returns to. */
  backHref: string;
  backPlayerName: string;
}

export function MergeConflictRefusal({
  aName,
  bName,
  games,
  backHref,
  backPlayerName,
}: MergeConflictRefusalProps) {
  return (
    <div className="flex flex-col gap-4">
      <Banner tone="error" title={sameGameRefusalTitle(aName, bName)}>
        {SAME_GAME_REFUSAL_BODY}
      </Banner>

      <div className="flex flex-col gap-2">
        {games.map((game) => (
          <div key={game.id} className="rounded-[var(--radius)] border border-line bg-surface p-3">
            <EntityLink href={`/games/${game.id}`}>
              {formatDate(game.playedOn)} · {game.locationName ?? NO_LOCATION_GAMES_LIST}
            </EntityLink>
            <div className="mt-1">
              <EditGameLink gameId={game.id} />
            </div>
          </div>
        ))}
      </div>

      <Link href={backHref} className={buttonClasses("ghost", { fullWidth: true })}>
        {sameGameBackButtonLabel(backPlayerName)}
      </Link>
    </div>
  );
}
