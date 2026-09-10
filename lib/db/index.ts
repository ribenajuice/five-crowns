/**
 * The database client.
 *
 * Turso over its HTTP driver in production, a local libSQL file in development.
 * The HTTP driver means there is no connection-pool problem in Lambda, so one
 * client reused across warm invocations is correct.
 *
 * ⚠️ Created **lazily**. A module-level connection would be opened during
 * Next.js's build-time page-data collection, where there is no database and no
 * credentials — and the build would fail for no reason.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { databaseCredentials } from "./url";

let client: Client | undefined;
let database: LibSQLDatabase<typeof schema> | undefined;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!database) {
    client ??= createClient(databaseCredentials());
    database = drizzle(client, { schema });
  }
  return database;
}

/** Drop the cached client. Tests only. */
export function resetDb(): void {
  client?.close();
  client = undefined;
  database = undefined;
}

export { schema };
export * from "./schema";
