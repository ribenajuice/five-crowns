/**
 * The draft: one in-progress review, and the contract both halves of Stage 2
 * are built against.
 *
 * `docs/ARCHITECTURE.md` § "The Stage 2 interface: draft, upload, save" is the
 * prose version. If the two ever disagree, this file wins; fix the doc.
 *
 * Everything here is pure and runs in the browser and on the server alike:
 * the review screen validates on every keystroke with exactly the code the
 * save handler re-runs, so the two can never disagree about what blocks a save.
 *
 * ⚠️ Players and venues created during a draft are **pending names**, not rows.
 * The save resolves them in the same transaction as the game, so an abandoned
 * draft leaves nothing behind in the pick-lists, and a name that matches an
 * existing entry by `nameKey` becomes that entry rather than a duplicate
 * (PRD criteria 60, 62, 63).
 */

import { z } from "zod";

import { ORIGINAL_MAX_LONG_EDGE } from "@/lib/ui/constants";

import {
  HANDS_PER_GAME,
  MAX_RUNNING_TOTAL,
  type CellValue,
  type GridColumn,
} from "../scoring";

export const DRAFT_STATE_VERSION = 1;

/** Five Crowns seats 1–7; one spare so a structural repair never hits the cap. */
export const MAX_COLUMNS = 8;

/** Room for Stage 4's "insert a value" repair, which briefly leaves 12. */
export const MAX_VALUES_PER_COLUMN = HANDS_PER_GAME + 1;

/** Every reading a column has ever had, kept forever (Stage 4's re-shoot ladder). */
export const MAX_READINGS_PER_COLUMN = 20;

export const MAX_NAME_LENGTH = 60;

/**
 * The typo backstop for people and places: trimmed, lower-cased, whitespace
 * collapsed. "Player C's place" and "  player c's place " share one key.
 */
export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ---------------------------------------------------------------- schema */

const cellValue = z
  .number()
  .int()
  .min(0)
  .max(MAX_RUNNING_TOTAL)
  .nullable();

const pendingName = z
  .string()
  .max(MAX_NAME_LENGTH)
  .refine((name) => nameKey(name).length > 0, {
    message: "A new name can't be blank.",
  });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Dates are YYYY-MM-DD." })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    { message: "That isn't a real date." },
  );

/**
 * One version of a column's numbers. Stage 2 never creates one: every draft
 * is typed by hand. Stage 3 adds `sheet` readings and Stage 4 `close-up`
 * readings, and the shape is fixed now so the stored format never changes.
 */
export const readingSchema = z.object({
  id: z.string().min(1).max(64),
  source: z.enum(["sheet", "close-up"]),
  photoId: z.string().min(1).max(64),
  transcriptionId: z.string().min(1).max(64).nullable(),
  values: z.array(cellValue).max(MAX_VALUES_PER_COLUMN),
  at: z.string().max(40),
});

const editIndex = z
  .string()
  .regex(/^\d{1,2}$/)
  .refine((key) => Number(key) < MAX_VALUES_PER_COLUMN, {
    message: "Edit index out of range.",
  });

const unit = z.number().min(0).max(1);

/**
 * Where one column sits on the sheet photo, so the review screen can show a
 * strip of that column alone, row for row beside the grid (PRD criterion 14).
 *
 * Normalised 0–1 in the **upright** (already rotated) photo, covering the
 * column's eleven cells from the top of hand 1 to the bottom of hand 11. The
 * strip scales it so `height / 11` equals the grid's row pitch. Stage 2 has no
 * transcription to find columns, so the founder marks each one; `null` until
 * they do, and the strip shows the whole photo meanwhile (criterion 15).
 */
export const cropSchema = z
  .object({
    x: unit,
    y: unit,
    width: unit.refine((w) => w > 0, { message: "A crop needs some width." }),
    height: unit.refine((h) => h > 0, { message: "A crop needs some height." }),
  })
  .refine((c) => c.x + c.width <= 1 + 1e-9 && c.y + c.height <= 1 + 1e-9, {
    message: "A crop must sit inside the photo.",
  });

export type Crop = z.infer<typeof cropSchema>;

export const draftColumnSchema = z
  .object({
    /** Client-generated and stable: identity survives reordering. */
    id: z.string().min(1).max(64),
    order: z.number().int().min(0).max(MAX_COLUMNS),
    /** An existing player picked from the list… */
    playerId: z.string().min(1).max(64).nullable(),
    /** …or someone new, created at save. Never both. */
    newPlayerName: pendingName.nullable(),
    /** The handwritten header, if known. Stage 2 leaves it null. */
    sheetName: z.string().max(MAX_NAME_LENGTH).nullable(),
    activeReadingId: z.string().min(1).max(64).nullable(),
    readings: z.array(readingSchema).max(MAX_READINGS_PER_COLUMN),
    /** Index → value the founder typed, layered over the reading. `null` = cleared. */
    manualEdits: z.record(editIndex, cellValue),
    /** This column's place on the sheet photo. Null until the founder marks it. */
    crop: cropSchema.nullable(),
  })
  .refine((column) => !(column.playerId && column.newPlayerName), {
    message: "A column is either an existing player or a new one, not both.",
  });

export const draftStateSchema = z
  .object({
    version: z.literal(DRAFT_STATE_VERSION),
    /** The sheet photo. Display only: the save checks the `photo` table. */
    photoId: z.string().min(1).max(64),
    /** The browser's local calendar day by default, never the server's UTC one. */
    playedOn: isoDate,
    locationId: z.string().min(1).max(64).nullable(),
    newLocationName: pendingName.nullable(),
    columns: z.array(draftColumnSchema).max(MAX_COLUMNS),
  })
  .refine((state) => !(state.locationId && state.newLocationName), {
    message: "A venue is either an existing one or a new one, not both.",
  })
  .refine(
    (state) => new Set(state.columns.map((c) => c.id)).size === state.columns.length,
    { message: "Column ids must be unique." },
  );

export type Reading = z.infer<typeof readingSchema>;
export type DraftColumn = z.infer<typeof draftColumnSchema>;
export type DraftState = z.infer<typeof draftStateSchema>;

/* ---------------------------------------------------- request bodies (API) */

const uploadRotation = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);
const uploadDimension = z.number().int().min(1).max(ORIGINAL_MAX_LONG_EDGE);

const sheetUploadRequestSchema = z.object({
  kind: z.literal("sheet"),
  rotation: uploadRotation,
  width: uploadDimension,
  height: uploadDimension,
});

/**
 * A targeted column re-shoot (`docs/ARCHITECTURE.md` § "Targeted column
 * re-read", sequence diagram step 2). Unlike a sheet upload, the draft and
 * the column both already exist by this point — `draftId` and `columnId` are
 * what lets the route stamp the resulting `photo` row with `draft_id` and
 * `draft_column_id` at creation, before anything is transcribed.
 */
const columnUploadRequestSchema = z.object({
  kind: z.literal("column"),
  draftId: z.string().min(1).max(64),
  columnId: z.string().min(1).max(64),
  rotation: uploadRotation,
  width: uploadDimension,
  height: uploadDimension,
});

export const uploadRequestSchema = z.discriminatedUnion("kind", [
  sheetUploadRequestSchema,
  columnUploadRequestSchema,
]);

export const createDraftSchema = z
  .object({ photoId: z.string().min(1).max(64), state: draftStateSchema })
  .refine((body) => body.state.photoId === body.photoId, {
    message: "The draft's photo must be the photo it was created for.",
  });

export const updateDraftSchema = z.object({ state: draftStateSchema });

/**
 * `POST /api/transcribe` — the only thing the client supplies is which photo
 * to read. `playedOn` is optional and exists only for the "no draft yet"
 * branch: when the draft is created here rather than by a prior
 * `POST /api/drafts`, there is no browser-local calendar day available
 * unless the caller sends one (docs/ARCHITECTURE.md § Data model, `game`: "the
 * default date is resolved from the browser's local calendar day … the server
 * never invents one"). Omitting it falls back to UTC-today, which is
 * occasionally the wrong local day — callers that already know the local date
 * should send it.
 */
export const transcribeSheetRequestSchema = z.object({
  photoId: z.string().min(1).max(64),
  playedOn: isoDate.optional(),
});

/**
 * `POST /api/transcribe/column` — the photo already exists by this point (the
 * upload step created it, per the sequence diagram), so unlike
 * `transcribeSheetRequestSchema` this needs no `playedOn` fallback and no
 * "create a draft if none exists" branch: a column re-read only ever happens
 * against a draft that already has that column.
 */
export const transcribeColumnRequestSchema = z.object({
  photoId: z.string().min(1).max(64),
  columnId: z.string().min(1).max(64),
});

export const saveGameSchema = z.object({
  draftId: z.string().min(1).max(64),
  state: draftStateSchema,
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type CreateDraftRequest = z.infer<typeof createDraftSchema>;
export type UpdateDraftRequest = z.infer<typeof updateDraftSchema>;
export type SaveGameRequest = z.infer<typeof saveGameSchema>;
export type TranscribeSheetRequest = z.infer<typeof transcribeSheetRequestSchema>;
export type TranscribeColumnRequest = z.infer<typeof transcribeColumnRequestSchema>;

/* --------------------------------------------------------------- helpers */

/** A fresh draft for a just-uploaded sheet photo, typed entirely by hand. */
export function emptyDraftState(args: {
  photoId: string;
  playedOn: string;
  columnIds: readonly string[];
}): DraftState {
  return {
    version: DRAFT_STATE_VERSION,
    photoId: args.photoId,
    playedOn: args.playedOn,
    locationId: null,
    newLocationName: null,
    columns: args.columnIds.map((id, order) => ({
      id,
      order,
      playerId: null,
      newPlayerName: null,
      sheetName: null,
      activeReadingId: null,
      readings: [],
      manualEdits: {},
      crop: null,
    })),
  };
}

/**
 * The numbers a column currently holds: its active reading (or eleven empty
 * cells when typed by hand), with every manual edit laid on top.
 */
export function effectiveValues(column: DraftColumn): CellValue[] {
  const reading = column.readings.find((r) => r.id === column.activeReadingId);
  const base: CellValue[] = reading
    ? [...reading.values]
    : Array.from({ length: HANDS_PER_GAME }, () => null);

  for (const [key, value] of Object.entries(column.manualEdits)) {
    const index = Number(key);
    while (base.length <= index) base.push(null);
    base[index] = value;
  }
  return base;
}

/**
 * Who a column belongs to, as a comparable key: an existing player by id, a
 * pending new one by `nameKey`. Two columns with the same key are the same
 * person, which is what the duplicate-player check needs. A pending name that
 * matches an existing player is only caught at save, once names are resolved.
 */
export function columnPlayerKey(column: DraftColumn): string | null {
  if (column.playerId) return `id:${column.playerId}`;
  if (column.newPlayerName) return `new:${nameKey(column.newPlayerName)}`;
  return null;
}

/** The draft as `validateGrid` wants it, in the paper's column order. */
export function toGridColumns(state: DraftState): GridColumn[] {
  return [...state.columns]
    .sort((a, b) => a.order - b.order)
    .map((column) => ({
      id: column.id,
      playerId: columnPlayerKey(column),
      values: effectiveValues(column),
    }));
}
