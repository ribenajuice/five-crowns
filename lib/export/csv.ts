/**
 * RFC 4180 CSV encoding — pure, dependency-free.
 *
 * A field is quoted only when it contains a comma, a double quote, or a line
 * break; an embedded quote is escaped by doubling it, exactly as RFC 4180
 * specifies. Rows are joined with CRLF, the line ending the RFC specifies,
 * and {@link buildCsv} prepends a UTF-8 BOM so a spreadsheet opens the file as
 * UTF-8 instead of guessing at the system codepage (PRD criterion 102).
 *
 * Nothing here touches the database or Next.js — see `lib/games/export.ts`
 * for the query that supplies the rows.
 */

const NEEDS_QUOTING = /["\n\r,]/;

export type CsvValue = string | number | boolean;

/** One field, quoted per RFC 4180 only when it needs to be. */
export function csvField(value: CsvValue): string {
  const raw = String(value);
  if (!NEEDS_QUOTING.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

/** One row, comma-joined, no trailing line ending. */
export function csvRow(values: readonly CsvValue[]): string {
  return values.map(csvField).join(",");
}

/** Prepended so Excel and other spreadsheets read the file as UTF-8. */
export const CSV_BOM = "\uFEFF";

/**
 * A complete RFC 4180 file: BOM, header row, every data row, each line
 * CRLF-terminated including the last.
 */
export function buildCsv(
  header: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): string {
  const lines = [csvRow(header), ...rows.map((row) => csvRow(row))];
  return CSV_BOM + lines.map((line) => `${line}\r\n`).join("");
}
