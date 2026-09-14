"use client";

/**
 * `MergeConfirmScreen`, players — docs/DESIGN-SYSTEM.md § "Merging two
 * players" (PRD criteria 156–162). Fetches `GET /api/players/merge-preview`
 * itself, on every mount — criterion 160's same-game refusal has to be
 * current at the moment this screen opens, not stale from whenever the
 * player page it was reached from last rendered.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Banner } from "./Banner";
import { MergeConflictRefusal, type ConflictingGameLike } from "./MergeConflictRefusal";
import { MergeSurvivorPicker } from "./MergeSurvivorPicker";
import {
  mergeDetailSentencePlayer,
  MERGE_GENERIC_ERROR_BODY,
  MERGE_GENERIC_ERROR_TITLE,
  survivorGamesPlayedLabel,
} from "@/lib/ui/copy";
import { requestPlayerMerge, requestPlayerMergePreview } from "@/lib/ui/merge-actions";

interface PlayerSide {
  id: string;
  displayName: string;
  gamesPlayed: number;
}

type Status = "loading" | "error" | "conflict" | "ready";

export function PlayerMergeConfirm({
  meId,
  otherId,
}: {
  meId: string;
  otherId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<PlayerSide | null>(null);
  const [other, setOther] = useState<PlayerSide | null>(null);
  const [conflicts, setConflicts] = useState<ConflictingGameLike[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const response = await requestPlayerMergePreview(meId, otherId);
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          return;
        }
        const body = (await response.json()) as {
          survivor: PlayerSide;
          other: PlayerSide;
          conflicts: ConflictingGameLike[];
        };
        setMe(body.survivor);
        setOther(body.other);
        setConflicts(body.conflicts);
        setStatus(body.conflicts.length > 0 ? "conflict" : "ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [meId, otherId]);

  async function commit() {
    if (!pickedId || !me || !other) return;
    setCommitting(true);
    setCommitError(false);
    const loserId = pickedId === me.id ? other.id : me.id;

    try {
      const response = await requestPlayerMerge(pickedId, loserId);
      if (response.ok) {
        const body = (await response.json()) as {
          survivorId: string;
          deletedPlayerId: string;
          rosterFolds: { keptName: string | null; bothHadCustomNames: boolean }[];
        };
        const loserName = pickedId === me.id ? other.displayName : me.displayName;
        const fold = body.rosterFolds.find((f) => f.bothHadCustomNames && f.keptName);
        const params = new URLSearchParams({ merged: loserName });
        if (fold?.keptName) params.set("foldedRoster", fold.keptName);
        router.push(`/players/${body.survivorId}?${params.toString()}`);
        return;
      }
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        setConflicts(
          (body as { conflicts?: ConflictingGameLike[] } | null)?.conflicts ?? [],
        );
        setStatus("conflict");
        setCommitting(false);
        return;
      }
      setCommitError(true);
      setCommitting(false);
    } catch {
      setCommitError(true);
      setCommitting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (status === "error") {
    return (
      <Banner tone="error" title={MERGE_GENERIC_ERROR_TITLE}>
        {MERGE_GENERIC_ERROR_BODY}
      </Banner>
    );
  }

  if (status === "conflict" && me && other) {
    return (
      <MergeConflictRefusal
        aName={me.displayName}
        bName={other.displayName}
        games={conflicts}
        backHref={`/players/${meId}`}
        backPlayerName={me.displayName}
      />
    );
  }

  if (!me || !other) return null;

  return (
    <MergeSurvivorPicker
      a={{ id: me.id, name: me.displayName, gamesLabel: survivorGamesPlayedLabel(me.gamesPlayed) }}
      b={{
        id: other.id,
        name: other.displayName,
        gamesLabel: survivorGamesPlayedLabel(other.gamesPlayed),
      }}
      pickedId={pickedId}
      onPick={setPickedId}
      detailSentence={mergeDetailSentencePlayer}
      cancelHref={`/players/${meId}`}
      busy={committing}
      error={commitError}
      onCommit={() => void commit()}
    />
  );
}
