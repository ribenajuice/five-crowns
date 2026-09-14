"use client";

/**
 * `PlaceRow` — docs/DESIGN-SYSTEM.md § Component inventory (Stage 3).
 *
 * Unlike `IndexRow`, **not** a `Link` — there's no place page for it to lead
 * to (criterion 140). Name, an optional muted caption on a never-used venue,
 * a right-aligned games-played count (0 renders like any other number), and
 * the row's own `RenameControl` trigger: a 44×44 pencil `IconButton` opening
 * a `Field` **in place** of the row's normal content — no separate screen,
 * the same "reveal the form in place" convention `AdminKeyPanel`'s "Replace
 * key" already established.
 *
 * A `name_key` collision (criterion 146) is **refused, not warned**:
 * `PATCH /api/locations/{id}` 409s, and its own error message is already the
 * exact fixed sentence ("{Existing place} already has that name.") —used
 * verbatim as the banner's bold line, so this component never reconstructs
 * that string itself. No merge action is offered (Stage 4 scope).
 */

import { useId, useState } from "react";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { Field } from "./Field";
import { PencilIcon } from "./icons";
import { MAX_LOCATION_NAME_LENGTH } from "@/lib/ui/constants";
import { requestLocationRename } from "@/lib/ui/rename-actions";
import {
  gamesNoun,
  LOCATION_COLLISION_BODY,
  PLACES_UNUSED_CAPTION,
  RENAME_CANCEL_BUTTON,
  RENAME_FIELD_LABEL_PLACE,
  RENAME_GENERIC_ERROR_BODY,
  RENAME_GENERIC_ERROR_TITLE,
  RENAME_HELPER_PLACE,
  RENAME_SAVE_BUSY_BUTTON,
  RENAME_SAVE_BUTTON,
  renameOpenAriaLabelPlace,
} from "@/lib/ui/copy";

export interface PlaceRowProps {
  id: string;
  name: string;
  gamesPlayed: number;
}

type SaveState = "idle" | "saving" | "refused" | "error";

export function PlaceRow({ id, name, gamesPlayed }: PlaceRowProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [value, setValue] = useState(name);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [refusalTitle, setRefusalTitle] = useState<string | null>(null);

  function openForm() {
    setValue(displayName);
    setSaveState("idle");
    setRefusalTitle(null);
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    setSaveState("idle");
    setRefusalTitle(null);
  }

  async function save() {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    setSaveState("saving");
    setRefusalTitle(null);
    try {
      const response = await requestLocationRename(id, trimmed);
      if (response.ok) {
        const body = (await response.json()) as { location: { name: string } };
        setDisplayName(body.location.name);
        setOpen(false);
        setSaveState("idle");
        return;
      }

      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        // The server's own message is already the exact fixed sentence
        // ("{Existing place} already has that name.") — used verbatim rather
        // than reconstructed here, so this can never drift from what the API
        // actually refused. The fallback only covers a malformed response.
        const message =
          (body as { error?: { message?: string } } | null)?.error?.message ??
          "That name's already taken by another place.";
        setRefusalTitle(message);
        setSaveState("refused");
        return;
      }

      setSaveState("error");
    } catch {
      setSaveState("error");
    }
  }

  if (!open) {
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
          onClick={openForm}
          aria-label={renameOpenAriaLabelPlace(displayName)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-brand"
        >
          <PencilIcon />
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
        <Banner tone="error" title={refusalTitle}>
          {LOCATION_COLLISION_BODY}
        </Banner>
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
