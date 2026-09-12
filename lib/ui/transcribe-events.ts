/**
 * Client-side event shapes for `POST /api/transcribe`'s NDJSON stream.
 *
 * Deliberately independent of `app/api/transcribe/route.ts` and everything
 * under `lib/vision`/`lib/draft` — those modules pull in `server-only` and
 * `node:crypto`, neither of which belongs in the browser bundle. This file
 * re-declares the wire shape and parses it defensively, since the only thing
 * connecting the two is the route's own doc comment.
 */

export interface TranscribeProgressEvent {
  type: "progress";
  stage: string;
}

export interface TranscribeColumnDiagnostic {
  columnId: string;
  nameConfidence: "high" | "medium" | "low";
  /** 0-based index into the column's values the model was least sure of. */
  leastConfidentIndex: number | null;
}

export interface TranscribeResultEvent {
  type: "result";
  status: "ok" | "invalid";
  draftId: string;
  updatedAt: string;
  transcriptionId: string;
  columns: TranscribeColumnDiagnostic[];
}

export interface TranscribeErrorEvent {
  type: "error";
  code: string;
  message: string;
}

export type TranscribeEvent =
  | TranscribeProgressEvent
  | TranscribeResultEvent
  | TranscribeErrorEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseColumn(raw: unknown): TranscribeColumnDiagnostic | null {
  if (!isRecord(raw) || typeof raw.columnId !== "string" || raw.columnId.length === 0) {
    return null;
  }
  const nameConfidence =
    raw.nameConfidence === "high" || raw.nameConfidence === "medium" || raw.nameConfidence === "low"
      ? raw.nameConfidence
      : "low";
  const leastConfidentIndex =
    typeof raw.leastConfidentIndex === "number" ? raw.leastConfidentIndex : null;
  return { columnId: raw.columnId, nameConfidence, leastConfidentIndex };
}

/** Defensive parsing: a malformed or unrecognised line is `null`, never a throw. */
export function parseTranscribeEvent(raw: unknown): TranscribeEvent | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  if (raw.type === "progress") {
    return { type: "progress", stage: typeof raw.stage === "string" ? raw.stage : "transcribing" };
  }

  if (raw.type === "error") {
    return {
      type: "error",
      code: typeof raw.code === "string" ? raw.code : "server_error",
      message:
        typeof raw.message === "string" ? raw.message : "Something went wrong at our end.",
    };
  }

  if (raw.type === "result") {
    if (
      typeof raw.draftId !== "string" ||
      typeof raw.updatedAt !== "string" ||
      typeof raw.transcriptionId !== "string" ||
      !Array.isArray(raw.columns)
    ) {
      return null;
    }
    return {
      type: "result",
      status: raw.status === "invalid" ? "invalid" : "ok",
      draftId: raw.draftId,
      updatedAt: raw.updatedAt,
      transcriptionId: raw.transcriptionId,
      columns: raw.columns.map(parseColumn).filter((c): c is TranscribeColumnDiagnostic => c !== null),
    };
  }

  return null;
}

/* -------------------------------------------- Stage 4: targeted column read */

/**
 * `POST /api/transcribe/column`'s result event — a sibling of
 * `TranscribeResultEvent`, not a variant of it (same relationship
 * `lib/draft/merge-column.ts` has to `lib/draft/merge-sheet.ts`): this route's
 * `diagnostics` is a **single object**, scoped to the one column the route
 * always operates on, never an array (`docs/DECISIONS.md`, "Column re-read
 * diagnostics: one object, not a one-element array"). The `progress` and
 * `error` events are wire-identical to the sheet path's, so this file reuses
 * `TranscribeProgressEvent`/`TranscribeErrorEvent` rather than redeclaring them.
 *
 * `state` carries the *whole* merged draft as the server now has it — the
 * caller should fold in only the named `columnId`'s slice of it (every other
 * column is guaranteed untouched by identity server-side) rather than
 * overwrite its own in-memory draft wholesale, so an edit made to a different
 * column while this call was in flight is never clobbered.
 */
export interface TypedCellDisagreementWire {
  index: number;
  typedValue: number;
  closeUpValue: number;
}

export interface ColumnMergeDiagnosticsWire {
  columnId: string;
  nameConfidence: "high" | "medium" | "low";
  leastConfidentIndex: number | null;
  readPlayerName: string | null;
  possibleWrongColumn: boolean;
  disagreesWithTypedCells: TypedCellDisagreementWire[];
}

export interface TranscribeColumnResultEvent {
  type: "result";
  status: "ok" | "invalid";
  draftId: string;
  columnId: string;
  updatedAt: string;
  transcriptionId: string;
  /** The full merged draft state, JSON-shaped — deliberately untyped here (see
   *  this section's docstring for why this file doesn't import `DraftState`). */
  state: unknown;
  diagnostics: ColumnMergeDiagnosticsWire;
}

export type TranscribeColumnEvent =
  | TranscribeProgressEvent
  | TranscribeColumnResultEvent
  | TranscribeErrorEvent;

function parseTypedCellDisagreement(raw: unknown): TypedCellDisagreementWire | null {
  if (
    !isRecord(raw) ||
    typeof raw.index !== "number" ||
    typeof raw.typedValue !== "number" ||
    typeof raw.closeUpValue !== "number"
  ) {
    return null;
  }
  return { index: raw.index, typedValue: raw.typedValue, closeUpValue: raw.closeUpValue };
}

function parseColumnDiagnostics(raw: unknown, fallbackColumnId: string): ColumnMergeDiagnosticsWire {
  const record = isRecord(raw) ? raw : {};
  const nameConfidence =
    record.nameConfidence === "high" || record.nameConfidence === "medium" || record.nameConfidence === "low"
      ? record.nameConfidence
      : "low";
  const leastConfidentIndex =
    typeof record.leastConfidentIndex === "number" ? record.leastConfidentIndex : null;
  const readPlayerName = typeof record.readPlayerName === "string" ? record.readPlayerName : null;
  const disagreesWithTypedCells = Array.isArray(record.disagreesWithTypedCells)
    ? record.disagreesWithTypedCells
        .map(parseTypedCellDisagreement)
        .filter((d): d is TypedCellDisagreementWire => d !== null)
    : [];
  return {
    columnId: typeof record.columnId === "string" ? record.columnId : fallbackColumnId,
    nameConfidence,
    leastConfidentIndex,
    readPlayerName,
    possibleWrongColumn: record.possibleWrongColumn === true,
    disagreesWithTypedCells,
  };
}

/** Defensive parsing, same contract as {@link parseTranscribeEvent}: a
 *  malformed or unrecognised line is `null`, never a throw. */
export function parseTranscribeColumnEvent(raw: unknown): TranscribeColumnEvent | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  if (raw.type === "progress") {
    return { type: "progress", stage: typeof raw.stage === "string" ? raw.stage : "transcribing" };
  }

  if (raw.type === "error") {
    return {
      type: "error",
      code: typeof raw.code === "string" ? raw.code : "server_error",
      message:
        typeof raw.message === "string" ? raw.message : "Something went wrong at our end.",
    };
  }

  if (raw.type === "result") {
    if (
      typeof raw.draftId !== "string" ||
      typeof raw.columnId !== "string" ||
      typeof raw.updatedAt !== "string" ||
      typeof raw.transcriptionId !== "string" ||
      raw.state === undefined
    ) {
      return null;
    }
    return {
      type: "result",
      status: raw.status === "invalid" ? "invalid" : "ok",
      draftId: raw.draftId,
      columnId: raw.columnId,
      updatedAt: raw.updatedAt,
      transcriptionId: raw.transcriptionId,
      state: raw.state,
      diagnostics: parseColumnDiagnostics(raw.diagnostics, raw.columnId),
    };
  }

  return null;
}
