#!/usr/bin/env node
/**
 * Manual database backup — the only database backup there is. There is no
 * nightly job (docs/DECISIONS.md, 2026-09-11 "Database backups are manual").
 *
 *   npm run db:backup                                  # the local dev database
 *   npx sst shell --stage prod -- npm run db:backup    # production (Turso)
 *
 * Writes `five-crowns-YYYY-MM-DD.sql` into `./backups/` (gitignored) — or into
 * `$BACKUP_DIR` if set — and prints the path. Running it twice on one day
 * replaces that day's file; the write is atomic, so a failed run never leaves
 * a half-written backup in place of a good one.
 *
 * No AWS and no S3: the dump goes to this machine. The Turso token is read
 * from the environment (or the `sst shell` link) and is never printed.
 *
 * ⚠️ Score data only. The photos are not in it — they stay in the versioned
 * S3 bucket (`aws s3 sync s3://five-crowns-photos ./photos` to copy them).
 */

import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";

import { backupFileName, dumpDatabase } from "../lib/backup/dump.ts";
import { LOCAL_DATABASE_URL } from "../lib/db/url.ts";
import { isRemote, tursoCredentials } from "./turso-env.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function localPath(url) {
  return url.startsWith("file://") ? fileURLToPath(url) : resolve(url.slice("file:".length));
}

/**
 * Dump the configured database to a file. Throws, with a message safe to
 * print, on anything that would otherwise produce a misleading backup.
 */
export async function backupDatabase({ env = process.env, now = new Date() } = {}) {
  const credentials = tursoCredentials(env);
  const url = credentials.url ?? LOCAL_DATABASE_URL;

  let source;
  let clientConfig;
  if (isRemote(url)) {
    if (!credentials.authToken) {
      throw new Error("TURSO_AUTH_TOKEN is not set, so the remote database cannot be read.");
    }
    source = "the remote Turso database";
    clientConfig = { url, authToken: credentials.authToken };
  } else if (url.startsWith("file:")) {
    const path = localPath(url);
    // libSQL would silently create an empty database here, and the "backup"
    // would be an empty file that looks like a success.
    if (!existsSync(path)) {
      throw new Error(`No database at ${path} — nothing to back up.`);
    }
    source = `the local database ${relative(process.cwd(), path) || path}`;
    clientConfig = { url };
  } else {
    // Deliberately does not echo the value.
    throw new Error("TURSO_DATABASE_URL must be a file:, libsql:// or https:// URL.");
  }

  const outDir = resolve(env.BACKUP_DIR || join(REPO_ROOT, "backups"));
  const client = createClient(clientConfig);
  try {
    const dump = await dumpDatabase(client, now);

    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, backupFileName(now));
    const partial = `${file}.partial`;
    try {
      writeFileSync(partial, dump.sql, { encoding: "utf8", mode: 0o600 });
      renameSync(partial, file);
    } catch (error) {
      rmSync(partial, { force: true });
      throw error;
    }

    return {
      file,
      source,
      tables: dump.tables,
      rows: dump.rows,
      bytes: Buffer.byteLength(dump.sql, "utf8"),
    };
  } finally {
    client.close();
  }
}

async function main() {
  try {
    const result = await backupDatabase();
    console.log(`✅ Backed up ${result.source}: ${result.tables} tables, ${result.rows} rows.`);
    console.log(`   ${result.file}`);
    console.log("   Score data only — the photos stay in S3.");
  } catch (error) {
    console.error(`❌ Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
