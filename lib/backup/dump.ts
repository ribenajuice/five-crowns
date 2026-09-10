/**
 * SQL dump generation.
 *
 * ⚠️ **The dump is secret-free by construction, not by filtering.** No secret is
 * ever written to the database at all — the API key, both password hashes and
 * the cookie signing secret live in Parameter Store — so there is no table this
 * could accidentally include (docs/ARCHITECTURE.md § Backups).
 *
 * Pure: takes rows, returns a string. No AWS, no database, no network, so the
 * escaping can be tested properly.
 */

export type DumpValue = string | number | bigint | boolean | null | Uint8Array;

export interface DumpTable {
  name: string;
  columns: string[];
  rows: DumpValue[][];
}

/**
 * SQLite string literal quoting: double every single quote. Deliberately
 * hand-rolled rather than interpolated — this output is replayed as SQL, and a
 * player called `O'Brien` must not be able to end the statement.
 */
export function quoteLiteral(value: DumpValue): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Uint8Array) {
    const hex = [...value].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `X'${hex}'`;
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

/** `"name"` — double quotes, doubled internally. */
export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

export function insertStatement(table: DumpTable, row: DumpValue[]): string {
  const columns = table.columns.map(quoteIdentifier).join(", ");
  const values = row.map(quoteLiteral).join(", ");
  return `INSERT INTO ${quoteIdentifier(table.name)} (${columns}) VALUES (${values});`;
}

export interface DumpOptions {
  /** `CREATE TABLE`/`CREATE INDEX` statements, in dependency order. */
  schemaStatements: string[];
  tables: DumpTable[];
  takenAt: Date;
}

/**
 * A replayable SQL dump: schema, then data, wrapped in one transaction with
 * foreign keys off so table order cannot break a restore.
 */
export function buildDump({
  schemaStatements,
  tables,
  takenAt,
}: DumpOptions): string {
  const lines: string[] = [
    "-- Five Crowns Ledger — nightly database dump.",
    `-- Taken ${takenAt.toISOString()}.`,
    "--",
    "-- This is the score data. It is NOT the whole archive: the photographs live",
    "-- in S3 and are not in this file. A full reconstruction needs this dump plus",
    "--   aws s3 sync s3://five-crowns-photos ./photos",
    "--",
    "-- It contains no API key, no password hash and no signing secret:",
    "-- no secret is ever stored in the database, so none can be in this file.",
    "",
    "PRAGMA foreign_keys=OFF;",
    "BEGIN TRANSACTION;",
    "",
  ];

  for (const statement of schemaStatements) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    lines.push(trimmed.endsWith(";") ? trimmed : `${trimmed};`);
  }

  for (const table of tables) {
    lines.push("", `-- ${table.name}: ${table.rows.length} rows`);
    for (const row of table.rows) {
      lines.push(insertStatement(table, row));
    }
  }

  lines.push("", "COMMIT;", "PRAGMA foreign_keys=ON;", "");
  return lines.join("\n");
}

/** `backups/YYYY-MM-DD.sql`, as named in docs/ARCHITECTURE.md § Backups. */
export function backupKey(day: Date): string {
  const iso = day.toISOString().slice(0, 10);
  return `backups/${iso}.sql`;
}
