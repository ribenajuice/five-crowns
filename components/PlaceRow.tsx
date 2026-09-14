"use client";

/**
 * `PlaceRow` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3, extended
 * Stage 4).
 *
 * Unlike `IndexRow`, **not** a `Link` — there's no place page for it to lead
 * to (criterion 140). Name, an optional muted caption on a never-used venue,
 * a right-aligned games-played count (0 renders like any other number), and
 * the row's own pencil `IconButton`.
 *
 * Stage 4 (`PlaceRowActions`, criterion 163): the pencil no longer jumps
 * straight to the rename `Field` — it opens a two-row chooser in the same
 * "reveal in place" slot ("Rename" / "Merge with another place…"), so
 * `PlaceRow` stays pixel-identical to Stage 3 at rest. Picking "Rename" swaps
 * to the unchanged Stage 3 `Field` editor below; picking "Merge…" navigates
 * to `/places/{id}/merge`, the dedicated "which place?" picker.
 *
 * A `name_key` collision (criterion 146) is **refused, not warned**:
 * `PATCH /api/locations/{id}` 409s, and its own error message is already the
 * exact fixed sentence ("{Existing place} already has that name.") — used
 * verbatim as the banner's bold line, so this component never reconstructs
 * that string itself. Stage 4: the 409 also carries the existing place's own
 * id, which is what lets the refusal offer a direct "Merge with {existing
 * place}" button straight into `MergeConfirmScreen` (criterion 163 fulfils
 * criterion 146's promise).
 */

import { useId, useState } from "react";
import Link from "next/link";

import { Banner } from "./Banner";
import { buttonClasses, destructiveButtonClasses } from "./Button";
import { Field } from "./Field";
import { MergeIcon, PencilIcon } from "./icons";
import { MAX_LOCATION_NAME_LENGTH } from "@/lib/ui/constants";
import { requestLocationRename } from "@/lib/ui/rename-actions";
import {
  editPlaceAriaLabel,
  gamesNoun,
  locationCollisionMergeButtonLabel,
  LOCATION_COLLISION_BODY,
  PLACES_UNUSED_CAPTION,
  PLACE_CHOOSER_CANCEL_BUTTON,
  PLACE_ROW_ACTIONS_MERGE_ROW,
  PLACE_ROW_ACTIONS_MERGE_SUBCAPTION,
  PLACE_ROW_ACTIONS_RENAME_ROW,
  PLACE_ROW_ACTIONS_RENAME_SUBCAPTION,
  RENAME_CANCEL_BUTTON,
  RENAME_FIELD_LABEL_PLACE,
  RENAME_GENERIC_ERROR_BODY,
  RENAME_GENERIC_ERROR_TITLE,
  RENAME_HELPER_PLACE,
  RENAME_SAVE_BUSY_BUTTON,
  RENAME_SAVE_BUTTON,
} from "@/lib/ui/copy";

export interface PlaceRowProps {
  id: string;
  name: string;
  gamesPlayed: number;
}

type Mode = "closed" | "choose" | "rename";
type SaveState = "idle" | "saving" | "refused" | "error";

export function PlaceRow({ id, name, gamesPlayed }: PlaceRowProps) {
  const fieldId = useId();
  const [mode, setMode] = useState<Mode>("closed");
  const [displayName, setDisplayName] = useState(name);
  const [value, setValue] = useState(name);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [refusalTitle, setRefusalTitle] = useState<string | null>(null);
  const [collision, setCollision] = useState<{ id: string; name: string } | null>(null);

  function openChooser() {
    setMode("choose");
  }

  function openRenameForm() {
    setValue(displayName);
    setSaveState("idle");
    setRefusalTitle(null);
    setCollision(null);
    setMode("rename");
  }

  function cancel() {
    setMode("closed");
    setSaveState("idle");
    setRefusalTitle(null);
    setCollision(null);
  }

  async function save() {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    setSaveState("saving");
    setRefusalTitle(null);
    setCollision(null);
    try {
      const response = await requestLocationRename(id, trimmed);
      if (response.ok) {
        const body = (await response.json()) as { location: { name: string } };
        setDisplayName(body.location.name);
        setMode("closed");
        setSaveState("idle");
        return;
      }

      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        // The server's own message is already the exact fixed sentence
        // ("{Existing place} already has that name.") — used verbatim rather
        // than reconstructed here, so this can never drift from what the API
        // actually refused. The fallback only covers a malformed response.
        const parsed = body as
          | { error?: { message?: string }; existingLocation?: { id: string; name: string } }
          | null;
        const message = parsed?.error?.message ?? "That name's already taken by another place.";
        setRefusalTitle(message);
        setCollision(parsed?.existingLocation ?? null);
        setSaveState("refused");
        return;
      }

      setSaveState("error");
    } catch {
      setSaveState("error");
    }
  }

  if (mode === "closed") {
    return (
      <div className="flex min-h-13 items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">{displayName}</p>
          {gamesPlayed === 0 ? (
            <p className="mt-0.5 text-xs text-text-muted">{PLACES_UNUSED_CAPTION}</p>
          ) : null}
        </div>
        <div className="mr-1 shrink-0 text-right">
          <span className="tabular block text-base font-black">{gamesPlayed}</span>
          <span className="block text-[10px] uppercase tracking-label text-text-muted">
            {gamesNoun(gamesPlayed)}
          </span>
        </div>
        <button
          type="button"
          onClick={openChooser}
          aria-label={editPlaceAriaLabel(displayName)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-brand"
        >
          <PencilIcon />
        </button>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-line bg-surface p-2">
        <button
          type="button"
          onClick={openRenameForm}
          className="flex min-h-13 w-full items-center gap-3 rounded-[var(--radius)] px-2 py-2 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-brand">
            <PencilIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{PLACE_ROW_ACTIONS_RENAME_ROW}</span>
            <span className="block text-xs text-text-muted">{PLACE_ROW_ACTIONS_RENAME_SUBCAPTION}</span>
          </span>
        </button>
        <Link
          href={`/places/${id}/merge`}
          className="flex min-h-13 w-full items-center gap-3 rounded-[var(--radius)] px-2 py-2 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-brand">
            <MergeIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{PLACE_ROW_ACTIONS_MERGE_ROW}</span>
            <span className="block text-xs text-text-muted">{PLACE_ROW_ACTIONS_MERGE_SUBCAPTION}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={cancel}
          className="mt-1 flex h-11 items-center justify-center rounded-[var(--radius)] px-2 text-sm font-bold text-brand"
        >
          {PLACE_CHOOSER_CANCEL_BUTTON}
        </button>
      </div>
    );
  }

  const busy = saveState === "saving";

  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius)] border bg-surface p-4 ${
        saveState === "refused" ? "border-error" : "border-line"
      }`}
    >
      <Field
        id={fieldId}
        label={RENAME_FIELD_LABEL_PLACE}
        value={value}
        maxLength={MAX_LOCATION_NAME_LENGTH}
        disabled={busy}
        onChange={(event) => {
          setValue(event.target.value);
          if (saveState !== "idle") setSaveState("idle");
        }}
        hint={RENAME_HELPER_PLACE}
      />

      {saveState === "refused" && refusalTitle ? (
        <>
          <Banner tone="error" title={refusalTitle}>
            {LOCATION_COLLISION_BODY}
          </Banner>
          {collision ? (
            <Link href={`/places/${id}/merge/${collision.id}`} className={destructiveButtonClasses()}>
              <MergeIcon />
              {locationCollisionMergeButtonLabel(collision.name)}
            </Link>
          ) : null}
        </>
      ) : null}

      {saveState === "error" ? (
        <Banner tone="error" title={RENAME_GENERIC_ERROR_TITLE}>
          {RENAME_GENERIC_ERROR_BODY}
        </Banner>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={cancel} disabled={busy} className={buttonClasses("ghost")}>
          {RENAME_CANCEL_BUTTON}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || value.trim().length === 0}
          aria-busy={busy || undefined}
          className={buttonClasses("primary")}
        >
          {busy ? RENAME_SAVE_BUSY_BUTTON : RENAME_SAVE_BUTTON}
        </button>
      </div>
    </div>
  );
}
