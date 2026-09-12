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
