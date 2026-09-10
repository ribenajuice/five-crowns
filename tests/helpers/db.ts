/**
 * An in-memory libSQL database for tests.
 *
 * The real generated migration is applied, so these tests exercise the schema
 * that will actually be deployed rather than a hand-written approximation of
 * it. SQLite is SQLite.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

const MIGRATION = fileURLToPath(
  new URL("../../lib/db/migrations/0000_foundations.sql", import.meta.url),
);

/**
 * Point the app at an in-memory database and create the schema.
 *
 * Must run before anything calls `getDb()` — the client is lazy, so importing
 * the module first is fine, using it is not.
 */
export async function setupTestDb(): Promise<void> {
  process.env.TURSO_DATABASE_URL = ":memory:";
  delete process.env.TURSO_AUTH_TOKEN;

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const statements = readFileSync(MIGRATION, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.run(sql.raw(statement));
  }
}

export async function teardownTestDb(): Promise<void> {
  const { resetDb } = await import("@/lib/db");
  resetDb();
}
