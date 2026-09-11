/**
 * ⚠️ Production talks to Turso over `libsql://`, on an **arm64** Lambda built
 * by an x86_64 CI runner (docs/ARCHITECTURE.md § Stack, `sst.config.ts`).
 * `lib/db` must never let the native `libsql` package near that code path —
 * it ships prebuilt binaries per OS/architecture, and the arm64 one is never
 * installed on the build runner. Previously, `lib/db/index.ts` statically
 * `import`ed the Node entry of `@libsql/client` (which pulls in `libsql`
 * unconditionally, at module load, regardless of which database URL was
 * configured), so every request that touched the database returned 500:
 *
 *   Error: Cannot find module '@libsql/linux-arm64-gnu'
 *   Require stack: - /var/task/node_modules/libsql/index.js
 *
 * The first test below patches Node's module loader to record every module id
 * actually requested while `lib/db` is imported and used against a remote
 * URL, so the assertion holds regardless of whether some earlier test in this
 * worker already warmed the native client for a `file:`/`:memory:` case —
 * this only cares about what *this* import does, not the process-wide
 * require cache. It needs no network: constructing an HTTP libSQL client
 * makes no connection by itself.
 *
 * The second test pins the local `file:` path — the one the native client
 * still has to serve — so a fix here cannot remove it by accident.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { Module } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Every module id passed to Node's CJS loader while `run` is in flight. */
async function loadedModuleIds(run: () => Promise<void>): Promise<string[]> {
  const ids: string[] = [];
  const loader = Module as unknown as {
    _load: (request: string, ...rest: unknown[]) => unknown;
  };
  const originalLoad = loader._load;
  loader._load = (request: string, ...rest: unknown[]) => {
    ids.push(request);
    return originalLoad.call(Module, request, ...rest);
  };
  try {
    await run();
  } finally {
    loader._load = originalLoad;
  }
  return ids;
}

/**
 * Whether a module id names the native `libsql` package or the Node entry of
 * `@libsql/client` that requires it — as either a bare specifier (how the
 * lazy `require()` in `lib/db` names it) or a resolved absolute path (how it
 * shows up when reached through an ESM `import`, which resolves before
 * `Module._load` sees it).
 */
function isNativeLibsqlModule(id: string): boolean {
  return (
    id === "libsql" ||
    id === "@libsql/client" ||
    /[/\\]node_modules[/\\]libsql[/\\]/.test(id) ||
    /[/\\]node_modules[/\\]@libsql[/\\]client[/\\]lib-(cjs|esm)[/\\](node|sqlite3)\.js$/.test(
      id,
    )
  );
}

describe("lib/db driver selection", () => {
  const originalUrl = process.env.TURSO_DATABASE_URL;
  const originalToken = process.env.TURSO_AUTH_TOKEN;

  beforeEach(() => {
    // Forces the next `import("@/lib/db")` to re-run the module's top level —
    // otherwise a module already loaded by an earlier test in this file would
    // make the "does it load at import time" assertion vacuous.
    vi.resetModules();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
    else process.env.TURSO_AUTH_TOKEN = originalToken;
  });

  it("never loads the native libsql package for a remote (libsql://) database", async () => {
    process.env.TURSO_DATABASE_URL = "libsql://example.turso.io";
    delete process.env.TURSO_AUTH_TOKEN;

    let db: unknown;
    const ids = await loadedModuleIds(async () => {
      const { getDb, resetDb } = await import("@/lib/db");
      resetDb();
      db = getDb();
    });

    expect(db).toBeDefined();
    expect(ids.filter(isNativeLibsqlModule)).toEqual([]);
  });

  it("still serves a local file: database through the native client", async () => {
    const directory = mkdtempSync(join(tmpdir(), "five-crowns-db-driver-"));
    const path = join(directory, "test.db");

    try {
      process.env.TURSO_DATABASE_URL = `file:${path}`;
      delete process.env.TURSO_AUTH_TOKEN;

      const { getDb, resetDb } = await import("@/lib/db");
      resetDb();
      const db = getDb();

      const result = await db.get<{ one: number }>(sql`select 1 as one`);
      expect(result?.one).toBe(1);

      resetDb();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
