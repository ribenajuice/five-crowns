/**
 * An in-memory libSQL database for tests.
 *
 * The real generated migrations are applied, in order, so these tests
 * exercise the schema that will actually be deployed rather than a
 * hand-written approximation of it. SQLite is SQLite.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../lib/db/migrations/", import.meta.url),
);

/**
 * Every top-level `*.sql` file in `lib/db/migrations/`, sorted by name —
 * `0000_foundations.sql`, `0001_...sql`, and so on — which is also drizzle's
 * own apply order. `down/` and `meta/` are subdirectories, not `.sql` files
 * at this level, so `readdirSync` never sees them.
 */
function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

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

  for (const file of migrationFiles()) {
    const statements = readFileSync(`${MIGRATIONS_DIR}${file}`, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await db.run(sql.raw(statement));
    }
  }
}

export async function teardownTestDb(): Promise<void> {
  const { resetDb } = await import("@/lib/db");
  resetDb();
}
