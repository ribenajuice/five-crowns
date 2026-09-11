/**
 * The database client.
 *
 * Turso over its HTTP driver in production, a local libSQL file (or `:memory:`
 * in tests) in development. The HTTP driver means there is no connection-pool
 * problem in Lambda, so one client reused across warm invocations is correct.
 *
 * ⚠️ The production (remote) path uses `@libsql/client/http` and
 * `drizzle-orm/libsql/http` — pure JS, talking Hrana-over-HTTP, with **no
 * native addon**. The default `@libsql/client` entry pulls in the `libsql`
 * package, which ships prebuilt binaries per OS/architecture; CI builds on an
 * x86_64 runner, the Lambda is arm64 (`sst.config.ts`), and the matching
 * native binary is never installed. That combination previously took down
 * every request that touched the database — `import`ing `@libsql/client` at
 * the top of this file loaded `libsql` unconditionally, whether or not the
 * code path was reached. The native client is now `require`d lazily, and only
 * from the local branch below, so the arm64 Lambda never touches it at all.
 *
 * ⚠️ Created **lazily**. A module-level connection would be opened during
 * Next.js's build-time page-data collection, where there is no database and no
 * credentials — and the build would fail for no reason.
 */

import { createRequire } from "node:module";

import { createClient, type Client } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql/http";
// The `/http` entry point declares `LibSQLDatabase` but only re-exports it
// from the shared base module (`drizzle-orm/libsql/driver-core`); the plain
// `drizzle-orm/libsql` entry does re-export it, and it is the same type.
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { databaseCredentials, isRemoteDatabase } from "./url";

let client: Client | undefined;
let database: LibSQLDatabase<typeof schema> | undefined;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!database) {
    const credentials = databaseCredentials();

    if (isRemoteDatabase(credentials.url)) {
      client = createClient(credentials);
      database = drizzle(client, { schema });
    } else {
      // Local dev and tests: a real libSQL file on disk, or `:memory:`. Needs
      // the native `libsql` package, which the Node entry of `@libsql/client`
      // pulls in — `require`d here, lazily, so it is never even referenced,
      // let alone loaded, when talking to a remote (`libsql://`/`https://`)
      // database. `createRequire` rather than a bare `require` because this
      // file is ESM (`package.json` `"type": "module"`).
      const nodeRequire = createRequire(import.meta.url);
      const nodeClient =
        nodeRequire("@libsql/client") as typeof import("@libsql/client");
      const nodeDrizzle =
        nodeRequire("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");
      client = nodeClient.createClient(credentials);
      database = nodeDrizzle.drizzle(client, { schema });
    }
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
