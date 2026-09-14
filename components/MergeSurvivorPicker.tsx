"use client";

/**
 * `MergeConfirmScreen`'s ordinary case — docs/DESIGN-SYSTEM.md § "Merging two
 * players" / "Merging two places": two `MergeSurvivorCard`s, neither
 * pre-selected (criterion 156), then — once one is picked — the two plain
 * sentences (not a `Banner`, same "plain text under the heading" precedent
 * "Deleting a game" set) and the same two-deliberate-action Cancel/"Merge
 * permanently" footer the delete-game confirmation established.
 *
 * Shared between the player and place flows: the only thing that differs
 * between them is the detail sentence's exact wording, so that's the one
 * thing the caller supplies rather than this component choosing.
 */

import Link from "next/link";

import { Banner } from "./Banner";
import { buttonClasses, destructiveButtonClasses } from "./Button";
import { MergeIcon } from "./icons";
import { MergeSurvivorCard } from "./MergeSurvivorCard";
import {
  MERGE_CANCEL_BUTTON,
  MERGE_COMMIT_BUSY_BUTTON,
  MERGE_COMMIT_BUTTON,
  MERGE_CONFIRM_INTRO,
  MERGE_GENERIC_ERROR_BODY,
  MERGE_GENERIC_ERROR_TITLE,
  MERGE_NO_UNDO_SENTENCE,
} from "@/lib/ui/copy";

export interface MergeCandidate {
  id: string;
  name: string;
  gamesLabel: string;
}

interface MergeSurvivorPickerProps {
  a: MergeCandidate;
  b: MergeCandidate;
  pickedId: string | null;
  onPick: (id: string) => void;
  /** Built from the caller's own player-vs-place template (e.g.
   *  `mergeDetailSentencePlayer`/`mergeDetailSentencePlace`). */
  detailSentence: (loserName: string, survivorName: string) => string;
  cancelHref: string;
  busy: boolean;
  error: boolean;
  onCommit: () => void;
}

export function MergeSurvivorPicker({
  a,
  b,
  pickedId,
  onPick,
  detailSentence,
  cancelHref,
  busy,
  error,
  onCommit,
}: MergeSurvivorPickerProps) {
  const survivor = pickedId === a.id ? a : pickedId === b.id ? b : null;
  const loser = survivor ? (survivor.id === a.id ? b : a) : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted">{MERGE_CONFIRM_INTRO}</p>

      <MergeSurvivorCard
        name={a.name}
        gamesLabel={a.gamesLabel}
        state={pickedId === null ? "unselected" : pickedId === a.id ? "stays" : "deleted"}
        onClick={() => onPick(a.id)}
      />
      <MergeSurvivorCard
        name={b.name}
        gamesLabel={b.gamesLabel}
        state={pickedId === null ? "unselected" : pickedId === b.id ? "stays" : "deleted"}
        onClick={() => onPick(b.id)}
      />

      {survivor && loser ? (
        <div className="flex flex-col gap-1">
          <p>{detailSentence(loser.name, survivor.name)}</p>
          <p className="text-sm text-text-muted">{MERGE_NO_UNDO_SENTENCE}</p>
        </div>
      ) : null}

      {error ? (
        <Banner tone="error" title={MERGE_GENERIC_ERROR_TITLE}>
          {MERGE_GENERIC_ERROR_BODY}
        </Banner>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onCommit}
          disabled={!survivor || busy}
          aria-busy={busy || undefined}
          className={destructiveButtonClasses()}
        >
          <MergeIcon />
          {busy ? MERGE_COMMIT_BUSY_BUTTON : MERGE_COMMIT_BUTTON}
        </button>
        <Link href={cancelHref} className={buttonClasses("ghost", { fullWidth: true })}>
          {MERGE_CANCEL_BUTTON}
        </Link>
      </div>
    </div>
  );
}
