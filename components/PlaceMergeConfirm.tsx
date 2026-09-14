"use client";

/**
 * `MergeConfirmScreen`, places — docs/DESIGN-SYSTEM.md § "Merging two places"
 * (PRD criteria 163–166). ⚠️ No preview endpoint and no same-game refusal
 * (a game has exactly one location, so two places can never both be "in the
 * same game" the way two players can) — both places' games-played counts are
 * already known from the places index, so this renders the survivor picker
 * straight away.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MergeSurvivorPicker } from "./MergeSurvivorPicker";
import { mergeDetailSentencePlace, survivorGamesPlayedThereLabel } from "@/lib/ui/copy";
import { requestLocationMerge } from "@/lib/ui/merge-actions";

interface PlaceSide {
  id: string;
  name: string;
  gamesPlayed: number;
}

export function PlaceMergeConfirm({ a, b }: { a: PlaceSide; b: PlaceSide }) {
  const router = useRouter();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function commit() {
    if (!pickedId) return;
    setBusy(true);
    setError(false);
    const loserId = pickedId === a.id ? b.id : a.id;
    const loserName = pickedId === a.id ? b.name : a.name;
    const survivorName = pickedId === a.id ? a.name : b.name;

    try {
      const response = await requestLocationMerge(pickedId, loserId);
      if (response.ok) {
        const params = new URLSearchParams({ merged: loserName, mergedInto: survivorName });
        router.push(`/places?${params.toString()}`);
        return;
      }
      setError(true);
      setBusy(false);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <MergeSurvivorPicker
      a={{ id: a.id, name: a.name, gamesLabel: survivorGamesPlayedThereLabel(a.gamesPlayed) }}
      b={{ id: b.id, name: b.name, gamesLabel: survivorGamesPlayedThereLabel(b.gamesPlayed) }}
      pickedId={pickedId}
      onPick={setPickedId}
      detailSentence={mergeDetailSentencePlace}
      cancelHref="/places"
      busy={busy}
      error={error}
      onCommit={() => void commit()}
    />
  );
}
