"use client";

/**
 * `/review/{draftId}` — the Column Sweep review screen.
 *
 * `docs/DESIGN-SYSTEM.md` § Review screen law and `docs/ARCHITECTURE.md` §
 * "The Stage 2 interface" are what this is built against. Every draft here
 * is typed by hand (Stage 3 adds the automatic read); the crop-setting flow
 * folded into assigning a column's player exists because Stage 2 has no
 * transcription to place columns for us.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/AppBar";
import { Banner } from "@/components/Banner";
import { BottomSheet } from "@/components/BottomSheet";
import { CellEditor } from "@/components/CellEditor";
import { ColumnPager, type ColumnPagerItem, type ColumnStatus } from "@/components/ColumnPager";
import { CropFrame } from "@/components/CropFrame";
import { Field } from "@/components/Field";
import { FinalRow, type FinalRowItem } from "@/components/FinalRow";
import { PhotoStrip } from "@/components/PhotoStrip";
import { Pill } from "@/components/Pill";
import { PickList, type PickListItem } from "@/components/PickList";
import { ReviewGrid } from "@/components/ReviewGrid";
import { SaveBar } from "@/components/SaveBar";
import { buttonClasses } from "@/components/Button";

import {
  deriveHandScores,
  determineWinners,
  validateGrid,
  type ColumnValidation,
  type PlayerScore,
} from "@/lib/scoring";
import { toGridColumns, type DraftColumn, type DraftState } from "@/lib/draft/state";
import { createDebouncer, type Debounced } from "@/lib/ui/autosave";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/ui/constants";
import {
  CROP_STEP_HEADING,
  NO_LOCATION_ROW,
  PASSING_STATEMENT,
  PLAYER_ADD_NEW_ROW,
  PLAYER_LIST_FIRST_GAME,
  VENUE_ADD_NEW_ROW,
  VENUE_FIELD_LABEL,
  VENUE_LIST_EMPTY,
  DATE_FIELD_LABEL,
  columnStatusLabel,
  saveBlockedMessage,
} from "@/lib/ui/copy";
import {
  addColumn,
  canAddColumn,
  clearLocation,
  removeColumn,
  setCellValue,
  setColumnCrop,
  setColumnNewPlayerName,
  setColumnPlayer,
  setLocation,
  setNewLocationName,
  setPlayedOn,
} from "@/lib/ui/draft-edits";
import { detectLargeHandWarnings } from "@/lib/ui/soft-warnings";
import { effectiveValues } from "@/lib/draft/state";

interface PhotoState {
  url: string;
  width: number;
  height: number;
}

type LoadStatus = "loading" | "ready" | "not-found" | "error";
type SaveStatus = "idle" | "saving" | "error";

function labelForColumn(column: DraftColumn, players: PickListItem[]): string {
  if (column.newPlayerName) return column.newPlayerName;
  if (column.playerId) {
    return players.find((p) => p.id === column.playerId)?.label ?? "Someone";
  }
  return column.sheetName ?? "This column";
}

function statusForColumn(
  ok: boolean,
  hasErr: boolean,
  hasSoftWarning: boolean,
): ColumnStatus {
  if (hasErr) return "err";
  if (!ok) return "todo";
  if (hasSoftWarning) return "warn";
  return "ok";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T | null }> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

export function ReviewScreen({ draftId }: { draftId: string }) {
  const router = useRouter();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [players, setPlayers] = useState<PickListItem[]>([]);
  const [locations, setLocations] = useState<PickListItem[]>([]);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [online, setOnline] = useState(true);
  const [autosaveError, setAutosaveError] = useState(false);

  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [cellEditor, setCellEditor] = useState<{ columnId: string; index: number } | null>(null);
  const [columnPicker, setColumnPicker] = useState<{ columnId: string; step: "pick" | "crop" } | null>(null);
  const [venueSheetOpen, setVenueSheetOpen] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const debouncedSave = useRef<Debounced<[DraftState]> | null>(null);

  const putDraft = useCallback(
    async (state: DraftState) => {
      const result = await fetchJson<{ updatedAt: string; savedGameId?: string }>(
        `/api/drafts/${draftId}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state }),
        },
      );

      if (result.status === 409) {
        const fresh = await fetchJson<{ savedGameId: string | null }>(`/api/drafts/${draftId}`);
        if (fresh.body?.savedGameId) router.replace(`/games/${fresh.body.savedGameId}`);
        return;
      }
      setAutosaveError(!result.ok);
    },
    [draftId, router],
  );

  useEffect(() => {
    debouncedSave.current = createDebouncer(
      (state: DraftState) => void putDraft(state),
      AUTOSAVE_DEBOUNCE_MS,
    );
    return () => debouncedSave.current?.cancel();
  }, [putDraft]);

  // Flush on tab switch or a force-quit-in-progress (criterion 28).
  useEffect(() => {
    function flush() {
      debouncedSave.current?.flush();
    }
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
      debouncedSave.current?.flush();
    }
    function goOffline() {
      setOnline(false);
    }
    setOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Initial load: the draft itself, plus the two pick-lists.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const draftResult = await fetchJson<{
        state: DraftState;
        savedGameId: string | null;
      }>(`/api/drafts/${draftId}`);

      if (cancelled) return;

      if (draftResult.status === 404) {
        setStatus("not-found");
        return;
      }
      if (!draftResult.ok || !draftResult.body) {
        setStatus("error");
        return;
      }
      if (draftResult.body.savedGameId) {
        router.replace(`/games/${draftResult.body.savedGameId}`);
        return;
      }

      setDraft(draftResult.body.state);
      setSelectedColumnId(draftResult.body.state.columns[0]?.id ?? null);
      setStatus("ready");

      const [playersResult, locationsResult] = await Promise.all([
        fetchJson<{ players: { id: string; displayName: string }[] }>("/api/players"),
        fetchJson<{ locations: { id: string; name: string }[]; mostRecentLocationId: string | null }>(
          "/api/locations",
        ),
      ]);
      if (cancelled) return;

      if (playersResult.ok && playersResult.body) {
        setPlayers(playersResult.body.players.map((p) => ({ id: p.id, label: p.displayName })));
      }
      if (locationsResult.ok && locationsResult.body) {
        setLocations(locationsResult.body.locations.map((l) => ({ id: l.id, label: l.name })));
        // Pre-fill the venue with the most recently used location, one tap to change (criterion 59).
        setDraft((current) => {
          if (!current) return current;
          if (current.locationId || current.newLocationName) return current;
          const mostRecent = locationsResult.body?.mostRecentLocationId;
          return mostRecent ? { ...current, locationId: mostRecent } : current;
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [draftId, router]);

  // The photo — never absent from the screen once loaded (criterion 15).
  useEffect(() => {
    if (!draft?.photoId) return;
    let cancelled = false;

    async function loadPhotoUrl() {
      const result = await fetchJson<{ url: string }>(
        `/api/photos/${draft!.photoId}/url?variant=original`,
      );
      if (cancelled || !result.ok || !result.body) return;

      const img = new window.Image();
      img.onload = () => {
        if (!cancelled) {
          setPhoto({ url: result.body!.url, width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.src = result.body.url;
    }

    void loadPhotoUrl();
    // The presigned URL expires after 5 minutes; refresh well inside that.
    const interval = setInterval(() => void loadPhotoUrl(), 4 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Deliberately keyed on the photo id alone, not the whole draft: the
    // photo itself never changes while a draft is being edited, and re-fetching
    // its URL on every keystroke would be wasteful and would flicker the strip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.photoId]);

  const applyEdit = useCallback((mutator: (state: DraftState) => DraftState) => {
    setDraft((current) => {
      if (!current) return current;
      const next = mutator(current);
      debouncedSave.current?.(next);
      return next;
    });
  }, []);

  const sortedColumns = useMemo(
    () => (draft ? [...draft.columns].sort((a, b) => a.order - b.order) : []),
    [draft],
  );

  const gridValidation = useMemo(
    () => (draft ? validateGrid(toGridColumns(draft)) : null),
    [draft],
  );

  const activeColumn = useMemo(
    () => sortedColumns.find((c) => c.id === selectedColumnId) ?? sortedColumns[0] ?? null,
    [sortedColumns, selectedColumnId],
  );

  if (status === "loading" || (status === "ready" && (!draft || !gridValidation))) {
    return (
      <>
        <AppBar title="Check the sheet" back={{ href: "/games", label: "Back to games" }} />
        <main className="mx-auto w-full max-w-read px-4 py-10 text-center text-text-muted">
          Loading the review…
        </main>
      </>
    );
  }

  if (status === "not-found") {
    return (
      <>
        <AppBar title="Check the sheet" back={{ href: "/games", label: "Back to games" }} />
        <main className="mx-auto w-full max-w-read px-4 py-6">
          <Banner tone="error" title="This review doesn't exist any more.">
            It may have already been saved, or the link is wrong.
          </Banner>
        </main>
      </>
    );
  }

  if (status === "error" || !draft || !gridValidation) {
    return (
      <>
        <AppBar title="Check the sheet" back={{ href: "/games", label: "Back to games" }} />
        <main className="mx-auto w-full max-w-read px-4 py-6">
          <Banner tone="error" title="Couldn't load this review.">
            Check your connection and reload the page.
          </Banner>
        </main>
      </>
    );
  }

  const venueLabel = draft.locationId
    ? locations.find((l) => l.id === draft.locationId)?.label ?? "…"
    : draft.newLocationName ?? NO_LOCATION_ROW;

  const columnItems: ColumnPagerItem[] = sortedColumns.map((column) => {
    const validation = gridValidation.columns[column.id]!;
    const values = effectiveValues(column);
    const softWarnings = detectLargeHandWarnings(deriveHandScores(values));
    const hasErr = validation.issues.some((issue) => issue.code !== "unread_cells" && issue.code !== "wrong_length");
    return {
      id: column.id,
      label: labelForColumn(column, players),
      status: statusForColumn(validation.ok, hasErr, softWarnings.length > 0),
    };
  });

  const scores: PlayerScore[] = sortedColumns.map((column) => ({
    playerId: column.id,
    score: effectiveValues(column).at(-1) ?? NaN,
  }));
  const winnerColumnIds = determineWinners(scores);
  const finalItems: FinalRowItem[] = sortedColumns.map((column) => ({
    id: column.id,
    label: labelForColumn(column, players),
    finalScore: effectiveValues(column).at(-1) ?? null,
  }));

  const blockedMessage = saveBlockedMessage(gridValidation, (columnId) => {
    const column = sortedColumns.find((c) => c.id === columnId);
    return column ? labelForColumn(column, players) : "";
  });

  const cellEditorColumn = cellEditor
    ? sortedColumns.find((c) => c.id === cellEditor.columnId) ?? null
    : null;
  const columnPickerColumn = columnPicker
    ? sortedColumns.find((c) => c.id === columnPicker.columnId) ?? null
    : null;

  function afterPlayerPicked(column: DraftColumn) {
    setColumnPicker(column.crop ? null : { columnId: column.id, step: "crop" });
  }

  async function handleSave() {
    if (!gridValidation || !gridValidation.ok) return;
    debouncedSave.current?.flush();
    setSaveStatus("saving");
    setSaveErrorMessage(null);

    const result = await fetchJson<{
      gameId: string;
      error?: { code: string; message: string };
      issues?: ReturnType<typeof validateGrid>;
    }>("/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId, state: draft }),
    });

    if (result.ok && result.body) {
      router.push(`/games/${result.body.gameId}?saved=1`);
      return;
    }

    setSaveStatus("error");
    if (result.body?.error?.code === "invalid_grid") {
      // The server re-validates independently and never trusts the browser's
      // own check — surface *its* issues (criterion: "handle 422 invalid_grid,
      // show the issues"), falling back to the client's own read only if the
      // shapes ever disagree.
      const serverIssues = result.body.issues;
      const message = serverIssues
        ? saveBlockedMessage(serverIssues, (columnId) => {
            const column = sortedColumns.find((c) => c.id === columnId);
            return column ? labelForColumn(column, players) : "";
          })
        : null;
      setSaveErrorMessage(message ?? "Something on this sheet still needs fixing — have another look above.");
    } else if (result.body?.error?.code === "missing_photo") {
      setSaveErrorMessage("This draft has no sheet photo to save with.");
    } else {
      setSaveErrorMessage("That didn't save. Check your connection and try again.");
    }
  }

  return (
    <>
      <AppBar
        title="Check the sheet"
        context={`${draft.playedOn} · ${venueLabel}`}
        back={{ href: "/games", label: "Back to games" }}
      />
      <main className="mx-auto w-full max-w-read px-4 py-4">
        {!online ? (
          <div className="mb-3">
            <Banner tone="warn" title="You&apos;re offline.">
              Your corrections are kept here and will save once you&apos;re back online.
            </Banner>
          </div>
        ) : autosaveError ? (
          <div className="mb-3">
            <Banner tone="warn" title="That correction hasn&apos;t saved yet.">
              We&apos;ll keep trying — check your connection.
            </Banner>
          </div>
        ) : null}

        {sortedColumns.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <p className="mb-3 font-bold">No player columns yet.</p>
            <button
              type="button"
              onClick={() => applyEdit(addColumn)}
              className={buttonClasses("primary")}
            >
              Add a player column
            </button>
          </div>
        ) : (
          <>
            <ColumnPager
              columns={columnItems}
              activeId={activeColumn?.id ?? ""}
              onSelect={setSelectedColumnId}
              onAddColumn={draft && canAddColumn(draft) ? () => applyEdit(addColumn) : undefined}
            />

            {activeColumn ? (
              <ActiveColumnCard
                column={activeColumn}
                label={labelForColumn(activeColumn, players)}
                validation={gridValidation.columns[activeColumn.id]!}
                photo={photo}
                canRemove={sortedColumns.length > 1}
                onPickPlayer={() => setColumnPicker({ columnId: activeColumn.id, step: "pick" })}
                onAdjustCrop={() => setColumnPicker({ columnId: activeColumn.id, step: "crop" })}
                onRemove={() => applyEdit((s) => removeColumn(s, activeColumn.id))}
                onEditCell={(index) => setCellEditor({ columnId: activeColumn.id, index })}
              />
            ) : null}

            <div className="mt-4">
              <FinalRow items={finalItems} winnerIds={winnerColumnIds} />
            </div>
          </>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <Field
            id="playedOn"
            label={DATE_FIELD_LABEL}
            type="date"
            value={draft.playedOn}
            onChange={(event) => applyEdit((s) => setPlayedOn(s, event.target.value))}
          />

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-label text-text-muted">
              {VENUE_FIELD_LABEL}
            </label>
            <button
              type="button"
              onClick={() => setVenueSheetOpen(true)}
              className="flex h-13 w-full items-center justify-between rounded-[var(--radius)] border border-text-muted bg-surface px-3 text-left text-base"
            >
              <span className="flex items-center gap-2">
                {venueLabel}
                {draft.newLocationName ? <Pill tone="new">new</Pill> : null}
              </span>
              <span aria-hidden="true" className="text-text-muted">
                ›
              </span>
            </button>
          </div>
        </div>

        {saveStatus === "error" && saveErrorMessage ? (
          <div className="mt-4">
            <Banner tone="error" title="That didn't save.">
              {saveErrorMessage}
            </Banner>
          </div>
        ) : null}
      </main>

      <SaveBar
        disabled={!gridValidation.ok}
        busy={saveStatus === "saving"}
        message={blockedMessage ?? PASSING_STATEMENT}
        onSave={handleSave}
      />

      <BottomSheet
        open={venueSheetOpen}
        onClose={() => setVenueSheetOpen(false)}
        title={VENUE_FIELD_LABEL}
      >
        <PickList
          items={locations}
          selectedId={draft.locationId}
          pendingLabel={draft.newLocationName}
          addNewLabel={VENUE_ADD_NEW_ROW}
          emptyMessage={locations.length === 0 ? VENUE_LIST_EMPTY : undefined}
          clearRowLabel={NO_LOCATION_ROW}
          onSelect={(id) => {
            applyEdit((s) => setLocation(s, id));
            setVenueSheetOpen(false);
          }}
          onAddNew={(name) => {
            applyEdit((s) => setNewLocationName(s, name));
            setVenueSheetOpen(false);
          }}
          onClear={() => {
            applyEdit(clearLocation);
            setVenueSheetOpen(false);
          }}
        />
      </BottomSheet>

      {columnPicker && columnPickerColumn ? (
        <BottomSheet
          open
          onClose={() => setColumnPicker(null)}
          title={
            columnPicker.step === "pick"
              ? "Who is this column?"
              : CROP_STEP_HEADING(labelForColumn(columnPickerColumn, players))
          }
        >
          {columnPicker.step === "pick" ? (
            <PickList
              items={players}
              selectedId={columnPickerColumn.playerId}
              pendingLabel={columnPickerColumn.newPlayerName}
              addNewLabel={PLAYER_ADD_NEW_ROW}
              emptyMessage={players.length === 0 ? PLAYER_LIST_FIRST_GAME : undefined}
              onSelect={(id) => {
                applyEdit((s) => setColumnPlayer(s, columnPickerColumn.id, id));
                afterPlayerPicked(columnPickerColumn);
              }}
              onAddNew={(name) => {
                applyEdit((s) => setColumnNewPlayerName(s, columnPickerColumn.id, name));
                afterPlayerPicked(columnPickerColumn);
              }}
            />
          ) : photo ? (
            <CropFrame
              photoUrl={photo.url}
              photoWidth={photo.width}
              photoHeight={photo.height}
              columnOrder={columnPickerColumn.order}
              columnCount={sortedColumns.length}
              initialCrop={columnPickerColumn.crop}
              onConfirm={(crop) => {
                applyEdit((s) => setColumnCrop(s, columnPickerColumn.id, crop));
                setColumnPicker(null);
              }}
            />
          ) : (
            <p className="text-text-muted">Loading the photo…</p>
          )}
        </BottomSheet>
      ) : null}

      {cellEditor && cellEditorColumn && photo ? (
        <CellEditor
          open
          onClose={() => setCellEditor(null)}
          columnLabel={labelForColumn(cellEditorColumn, players)}
          index={cellEditor.index}
          values={effectiveValues(cellEditorColumn)}
          handScores={deriveHandScores(effectiveValues(cellEditorColumn))}
          photoUrl={photo.url}
          photoWidth={photo.width}
          photoHeight={photo.height}
          crop={cellEditorColumn.crop}
          onChangeValue={(index, value) =>
            applyEdit((s) => setCellValue(s, cellEditorColumn.id, index, value))
          }
          onNavigate={(index) => setCellEditor({ columnId: cellEditorColumn.id, index })}
          onSetCrop={
            !cellEditorColumn.crop
              ? () => {
                  setCellEditor(null);
                  setColumnPicker({ columnId: cellEditorColumn.id, step: "crop" });
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}

function ActiveColumnCard({
  column,
  label,
  validation,
  photo,
  canRemove,
  onPickPlayer,
  onAdjustCrop,
  onRemove,
  onEditCell,
}: {
  column: DraftColumn;
  label: string;
  validation: ColumnValidation;
  photo: PhotoState | null;
  canRemove: boolean;
  onPickPlayer: () => void;
  onAdjustCrop: () => void;
  onRemove: () => void;
  onEditCell: (index: number) => void;
}) {
  const values = effectiveValues(column);
  const handScores = deriveHandScores(values);
  const softWarnings = detectLargeHandWarnings(handScores);
  const assigned = Boolean(column.playerId || column.newPlayerName);

  return (
    <div className="mt-3 rounded-[var(--radius)] border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{label}</h2>
        {validation.filled !== validation.expected ? (
          <Pill tone={validation.ok ? "neutral" : "warn"}>
            {columnStatusLabel(validation.filled, validation.expected)}
          </Pill>
        ) : null}
      </div>

      <div className="mb-3 flex gap-2">
        <button type="button" onClick={onPickPlayer} className={buttonClasses("ghost")}>
          {assigned ? `Not ${label}?` : "Who is this column?"}
        </button>
        {canRemove ? (
          <button type="button" onClick={onRemove} className={buttonClasses("ghost")}>
            Remove
          </button>
        ) : null}
      </div>

      {photo ? (
        <div className="flex gap-3">
          <PhotoStrip
            photoUrl={photo.url}
            photoWidth={photo.width}
            photoHeight={photo.height}
            crop={column.crop}
            onAdjustCrop={column.crop ? onAdjustCrop : undefined}
            onSetCrop={!column.crop ? onAdjustCrop : undefined}
          />
          <ReviewGrid
            values={values}
            handScores={handScores}
            columnValidation={validation}
            softWarnings={softWarnings}
            onEditCell={onEditCell}
          />
        </div>
      ) : (
        <p className="text-text-muted">Loading the photo…</p>
      )}
    </div>
  );
}
