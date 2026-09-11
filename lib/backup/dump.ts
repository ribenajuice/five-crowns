/**
 * SQL dump generation — the manual database backup (`npm run db:backup`,
 * `scripts/db-backup.mjs`).
 *
 * ⚠️ **The dump is secret-free by construction, not by filtering.** No secret is
 * ever written to the database at all — the API key, both password hashes and
 * the cookie signing secret live in Parameter Store — so there is no table this
 * could accidentally include (docs/ARCHITECTURE.md § Backups).
 *
 * `buildDump` is pure: takes rows, returns a string. `dumpDatabase` reads the
 * rows through a libSQL client it is handed, so this module opens no
 * connection and touches no AWS or network itself, and the escaping can be
 * tested properly.
 *
 * ⚠️ Loaded directly by Node (type stripping) from `scripts/db-backup.mjs`:
 * keep it to erasable TypeScript — type-only imports, no enums, no parameter
 * properties, no `@/` path aliases.
 */

import type { Client } from "@libsql/client";

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
    "-- Five Crowns Ledger — database dump.",
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

export interface DatabaseDump {
  sql: string;
  tables: number;
  rows: number;
}

/** libSQL returns BLOBs as ArrayBuffer; the dump quotes Uint8Array. */
function toDumpValue(value: unknown): DumpValue {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return value as DumpValue;
}

/**
 * Every table of the database the client is connected to — schema and rows —
 * as one replayable SQL script.
 */
export async function dumpDatabase(
  client: Pick<Client, "execute">,
  takenAt: Date,
): Promise<DatabaseDump> {
  const schema = await client.execute(
    "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name",
  );
  const schemaStatements = schema.rows
    .map((row) => row.sql)
    .filter((sql): sql is string => typeof sql === "string");

  const tableNames = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  const tables: DumpTable[] = [];
  let rowCount = 0;

  for (const entry of tableNames.rows) {
    const name = entry.name;
    if (typeof name !== "string") continue;

    // Table names come from sqlite_master, not from user input, so there is
    // nothing here a caller could inject.
    const data = await client.execute(`SELECT * FROM ${quoteIdentifier(name)}`);
    tables.push({
      name,
      columns: [...data.columns],
      rows: data.rows.map((row) =>
        data.columns.map((column) => toDumpValue(row[column])),
      ),
    });
    rowCount += data.rows.length;
  }

  return {
    sql: buildDump({ schemaStatements, tables, takenAt }),
    tables: tables.length,
    rows: rowCount,
  };
}

/**
 * `five-crowns-YYYY-MM-DD.sql`, dated in the local time zone of whoever runs
 * the backup — a dump taken on a Sydney morning is named for that morning,
 * not for the UTC day before.
 */
export function backupFileName(day: Date): string {
  const yyyy = String(day.getFullYear());
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  const dd = String(day.getDate()).padStart(2, "0");
  return `five-crowns-${yyyy}-${mm}-${dd}.sql`;
}

/**
 * `backups/YYYY-MM-DD.sql` — the S3 key the retired nightly Lambda wrote to.
 * Unused since backups became manual (docs/DECISIONS.md, 2026-09-11); kept
 * only because `tests/backup/dump.test.ts` pins it. Remove the two together.
 */
export function backupKey(day: Date): string {
  const iso = day.toISOString().slice(0, 10);
  return `backups/${iso}.sql`;
}
