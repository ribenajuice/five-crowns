/**
 * The nightly database dump.
 *
 * A scheduled Lambda (EventBridge) writes the whole database to
 * `s3://five-crowns-photos/backups/YYYY-MM-DD.sql` — PRD criterion 83. At this
 * volume the dump is a few hundred kilobytes and the cost is a rounding error.
 *
 * Losing Turso entirely therefore costs at most one day of games and an
 * afternoon restoring into a fresh libSQL database. It is the mitigation for
 * the one dependency in this design that AWS does not host and we do not own.
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";

import { databaseCredentials } from "@/lib/db/url";
import { describeError, log } from "@/lib/log";

import { backupKey, buildDump, type DumpTable, type DumpValue } from "./dump";

export interface BackupResult {
  bucket: string;
  key: string;
  bytes: number;
  tables: number;
  rows: number;
}

export async function runBackup(now: Date = new Date()): Promise<BackupResult> {
  const bucket = process.env.PHOTOS_BUCKET;
  if (!bucket) throw new Error("PHOTOS_BUCKET is not set.");

  const client = createClient(databaseCredentials());

  try {
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
      const data = await client.execute(`SELECT * FROM "${name}"`);
      tables.push({
        name,
        columns: [...data.columns],
        rows: data.rows.map((row) =>
          data.columns.map((column) => row[column] as DumpValue),
        ),
      });
      rowCount += data.rows.length;
    }

    const body = buildDump({ schemaStatements, tables, takenAt: now });
    const key = backupKey(now);

    await new S3Client({}).send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/sql",
      }),
    );

    const result: BackupResult = {
      bucket,
      key,
      bytes: Buffer.byteLength(body, "utf8"),
      tables: tables.length,
      rows: rowCount,
    };

    log.info("backup.ok", { ...result });
    return result;
  } finally {
    client.close();
  }
}

/** EventBridge entry point. Named in `sst.config.ts`. */
export async function handler(): Promise<BackupResult> {
  try {
    return await runBackup();
  } catch (error) {
    log.error("backup.failed", describeError(error));
    throw error;
  }
}
