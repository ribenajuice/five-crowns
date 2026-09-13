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

/**
 * Excel, LibreOffice and Numbers all evaluate a cell starting with one of
 * these characters as a formula when a CSV is opened — regardless of RFC
 * 4180 quoting, which only escapes commas and line breaks, not formula
 * evaluation. `\t` and `\r` are included because a leading tab or carriage
 * return before an `=`/`+`/`-`/`@` is still treated as a formula prefix by
 * some of these applications.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export type CsvValue = string | number | boolean;

/** One field, quoted per RFC 4180 only when it needs to be. */
export function csvField(value: CsvValue): string {
  const raw = String(value);
  if (!NEEDS_QUOTING.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

/**
 * `csvField`, but first defused against spreadsheet formula injection.
 *
 * Use this — never plain {@link csvField} — for any column that carries
 * free text supplied by a user rather than data the app generates itself
 * (in this export: `location`, `roster_name`, `player_name`, `sheet_name`;
 * see `lib/games/export.ts`). A value starting with `=`, `+`, `-`, `@`, a
 * tab or a carriage return gets a leading apostrophe, the standard
 * mitigation: spreadsheet applications then read the cell as literal text
 * instead of evaluating it. This applies even to a value that legitimately
 * starts with a bare `-` or `+` — there is no free-text name for which a
 * leading formula character is a value worth preserving over a defused
 * file, and the prefix is invisible in the app itself (it only ever
 * appears in the exported file, never on screen — see criterion 105).
 */
export function csvSafeTextField(value: CsvValue): string {
  const raw = String(value);
  const defused = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return csvField(defused);
}

/**
 * One row, comma-joined, no trailing line ending.
 *
 * `unsafeTextIndices` names the zero-based column positions that must go
 * through {@link csvSafeTextField} instead of plain {@link csvField} — the
 * free-text columns that can carry a formula-injection payload. Every other
 * column is app-generated (an id, a date, a count, a derived score) and
 * cannot start with a formula-prefix character, so plain RFC 4180 quoting
 * is enough for it.
 */
export function csvRow(
  values: readonly CsvValue[],
  unsafeTextIndices?: ReadonlySet<number>,
): string {
  return values
    .map((value, i) => (unsafeTextIndices?.has(i) ? csvSafeTextField(value) : csvField(value)))
    .join(",");
}

/** Prepended so Excel and other spreadsheets read the file as UTF-8. */
export const CSV_BOM = "\uFEFF";

/**
 * A complete RFC 4180 file: BOM, header row, every data row, each line
 * CRLF-terminated including the last.
 *
 * `unsafeTextIndices` is forwarded to {@link csvRow} for every data row
 * (never the header row — column names are fixed strings the app writes
 * itself, not user input).
 */
export function buildCsv(
  header: readonly string[],
  rows: readonly (readonly CsvValue[])[],
  unsafeTextIndices?: ReadonlySet<number>,
): string {
  const lines = [csvRow(header), ...rows.map((row) => csvRow(row, unsafeTextIndices))];
  return CSV_BOM + lines.map((line) => `${line}\r\n`).join("");
}
