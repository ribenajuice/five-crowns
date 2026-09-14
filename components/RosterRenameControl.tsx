"use client";

/**
 * `RenameControl` for a roster's own page — docs/DESIGN-SYSTEM.md § "Renaming
 * a roster" (PRD criteria 141–144). A `ghost` "Rename" link reveals a `Field`
 * in place — no separate screen, the same convention `AdminKeyPanel`'s
 * "Replace key" already established.
 *
 * Save always previews first with `dryRun: true` (`PATCH /api/rosters/{id}`).
 * When no other roster shares the resulting display name, that preview is
 * immediately followed by the real write in the same tap — nothing to warn
 * about, so there's nothing to make the founder confirm. When another roster
 * *does* share it, the non-blocking warning (criterion 143) is shown instead
 * and the write is held back until the founder taps "Save name" a second
 * time for that same value — "confirm anyway" — or cancels. Editing the
 * field again after a warning re-arms the preview, since the founder may
 * have changed their mind about the exact text.
 *
 * A successful save calls `router.refresh()` so the server-rendered `AppBar`
 * title (and every other server-rendered mention of this roster on the page)
 * picks up the new name immediately, per criterion 141 — this component only
 * owns its own form, not the page's heading.
 */

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { Field } from "./Field";
import { MAX_ROSTER_NAME_LENGTH } from "@/lib/ui/constants";
import { requestRosterRename } from "@/lib/ui/rename-actions";
import {
  RENAME_CANCEL_BUTTON,
  RENAME_FIELD_LABEL_ROSTER,
  RENAME_GENERIC_ERROR_BODY,
  RENAME_GENERIC_ERROR_TITLE,
  RENAME_HELPER_ROSTER,
  RENAME_OPEN_LINK_ROSTER,
  RENAME_SAVED_ROSTER_MESSAGE,
  RENAME_SAVED_ROSTER_TITLE,
  RENAME_SAVE_BUSY_BUTTON,
  RENAME_SAVE_BUTTON,
  rosterDuplicateWarningBody,
  rosterDuplicateWarningTitle,
} from "@/lib/ui/copy";

export interface RosterRenameControlProps {
  rosterId: string;
  initialDisplayName: string;
}

interface DuplicateWarning {
  /** The trimmed value this warning was raised for — re-armed if the field changes. */
  forValue: string;
  title: string;
  body: string;
}

type SaveState = "idle" | "saving" | "error";

export function RosterRenameControl({ rosterId, initialDisplayName }: RosterRenameControlProps) {
  const router = useRouter();
  const fieldId = useId();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialDisplayName);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [warning, setWarning] = useState<DuplicateWarning | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function openForm() {
    setValue(initialDisplayName);
    setSaveState("idle");
    setWarning(null);
    setJustSaved(false);
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    setSaveState("idle");
    setWarning(null);
  }

  async function commit(name: string) {
    const response = await requestRosterRename(rosterId, name, false);
    if (!response.ok) throw new Error("rename_failed");
    setOpen(false);
    setSaveState("idle");
    setWarning(null);
    setJustSaved(true);
    router.refresh();
  }

  async function save() {
    const trimmed = value.trim();
    setSaveState("saving");

    try {
      // Already warned for this exact value — a second tap is "save anyway".
      if (warning && warning.forValue === trimmed) {
        await commit(trimmed);
        return;
      }

      const previewResponse = await requestRosterRename(rosterId, trimmed, true);
      if (!previewResponse.ok) throw new Error("preview_failed");
      const preview = (await previewResponse.json()) as {
        roster: { displayName: string };
        duplicate: { membersLabel: string } | null;
      };

      if (preview.duplicate) {
        setWarning({
          forValue: trimmed,
          title: rosterDuplicateWarningTitle(preview.roster.displayName),
          body: rosterDuplicateWarningBody(preview.duplicate.membersLabel),
        });
        setSaveState("idle");
        return;
      }

      await commit(trimmed);
    } catch {
      setSaveState("error");
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-2">
        {justSaved ? (
          <Banner tone="ok" title={RENAME_SAVED_ROSTER_TITLE}>
            {RENAME_SAVED_ROSTER_MESSAGE}
          </Banner>
        ) : null}
        <button
          type="button"
          onClick={openForm}
          className={`${buttonClasses("ghost")} h-9 w-auto px-3.5`}
        >
          {RENAME_OPEN_LINK_ROSTER}
        </button>
      </div>
    );
  }

  const busy = saveState === "saving";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
      <Field
        id={fieldId}
        label={RENAME_FIELD_LABEL_ROSTER}
        value={value}
        maxLength={MAX_ROSTER_NAME_LENGTH}
        disabled={busy}
        onChange={(event) => {
          setValue(event.target.value);
          setWarning(null);
        }}
        hint={RENAME_HELPER_ROSTER}
      />

      {warning ? (
        <Banner tone="warn" title={warning.title}>
          {warning.body}
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
          disabled={busy}
          aria-busy={busy || undefined}
          className={buttonClasses("primary")}
        >
          {busy ? RENAME_SAVE_BUSY_BUTTON : RENAME_SAVE_BUTTON}
        </button>
      </div>
    </div>
  );
}
