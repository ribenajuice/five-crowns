/**
 * The manual database backup, end to end against a real database.
 *
 * `dump.test.ts` covers `buildDump` as a pure function. This file covers what
 * sits around it:
 *
 *  - `dumpDatabase`, which reads every table of a real libSQL database and
 *    produces the replayable script; and
 *  - `npm run db:backup` itself (`scripts/db-backup.mjs`), run in a child
 *    process exactly as the founder runs it: it writes
 *    `five-crowns-YYYY-MM-DD.sql`, prints the path, never echoes a credential,
 *    and refuses — rather than "backing up" an empty file — when the database
 *    is not there.
 *
 * **Criterion 79**: "no secret is in the database. **This is permanent, not a
 * one-off check.**" A permanent check has to be a test. This one dumps every
 * table of a populated database and greps the result — including the schema,
 * so a future migration that adds a secret-bearing column fails here rather
 * than in a file the founder has already emailed to someone.
 *
 * No AWS. No network. A **file-backed** database, because the backup script
 * opens its own connection and a second `:memory:` connection would be a
 * different, empty database.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { backupFileName, dumpDatabase } from "@/lib/backup/dump";

const MIGRATION = fileURLToPath(
  new URL("../../lib/db/migrations/0000_foundations.sql", import.meta.url),
);
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCRIPT = join(REPO_ROOT, "scripts", "db-backup.mjs");

/** Inside the Player A–E scheme, but with the apostrophe that ends a
 * badly-quoted SQL statement. The repository is public: no real names. */
const AWKWARD_NAME = "Player A's stand-in";

let directory: string;
let url: string;
let client: Client;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "five-crowns-backup-"));
  url = `file:${join(directory, "test.db")}`;
  client = createClient({ url });

  for (const statement of readFileSync(MIGRATION, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await client.execute(statement);
  }

  await client.batch(
    [
      `INSERT INTO player (id, display_name, slug) VALUES ('p1', '${AWKWARD_NAME.replaceAll("'", "''")}', 'player-a')`,
      `INSERT INTO player (id, display_name, slug) VALUES ('p2', 'Player B', 'player-b')`,
      `INSERT INTO roster (id, signature, size) VALUES ('r1', 'p1:p2', 2)`,
      `INSERT INTO roster_member (roster_id, player_id) VALUES ('r1', 'p1')`,
      `INSERT INTO roster_member (roster_id, player_id) VALUES ('r1', 'p2')`,
      `INSERT INTO game (id, played_on, roster_id) VALUES ('g1', '2026-09-10', 'r1')`,
      `INSERT INTO game_player (game_id, player_id, column_order, final_score) VALUES ('g1', 'p1', 0, 137)`,
      `INSERT INTO game_player (game_id, player_id, column_order, final_score) VALUES ('g1', 'p2', 1, 78)`,
      // A repeat, i.e. a hand scored zero. It must survive a dump/restore.
      `INSERT INTO round_score (game_id, player_id, hand, running_total, score) VALUES ('g1', 'p1', 1, 29, 29)`,
      `INSERT INTO round_score (game_id, player_id, hand, running_total, score) VALUES ('g1', 'p1', 2, 29, 0)`,
      `INSERT INTO round_score (game_id, player_id, hand, running_total, score) VALUES ('g1', 'p2', 1, 23, 23)`,
      `INSERT INTO login_attempt (ip_hash, scope, minute_bucket, count) VALUES ('ef0e335d7346240a2694db0445375acf', 'group', 29817440, 6)`,
    ],
    "write",
  );
});

afterAll(() => {
  client?.close();
  rmSync(directory, { recursive: true, force: true });
});

async function dumpOnce(when = "2026-09-10T14:15:00Z"): Promise<string> {
  return (await dumpDatabase(client, new Date(when))).sql;
}

/** `npm run db:backup`, with a clean environment plus `env`. */
function backupCli(env: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", SCRIPT],
    {
      cwd: REPO_ROOT,
      // A clean environment on purpose: nothing inherited can point the script
      // at another database. (Cast: the project's ProcessEnv requires NODE_ENV.)
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        ...env,
      } as unknown as NodeJS.ProcessEnv,
      encoding: "utf8",
      timeout: 30_000,
    },
  );
}

describe("dumpDatabase", () => {
  it("counts what it dumped", async () => {
    const result = await dumpDatabase(client, new Date("2026-09-10T14:15:00Z"));
    expect(result.tables).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
  });

  it("includes the score data — the dump is worth having", async () => {
    const body = await dumpOnce();

    expect(body).toContain('INSERT INTO "player"');
    expect(body).toContain('INSERT INTO "round_score"');
    expect(body).toContain("137");
    // A quote in a name is escaped rather than left to end the statement.
    expect(body).toContain("Player A''s stand-in");
  });

  it("keeps both numbers for every round — the total as read and the derived hand", async () => {
    const body = await dumpOnce();
    const rounds = body
      .split("\n")
      .filter((line) => line.startsWith('INSERT INTO "round_score"'));

    expect(rounds).toHaveLength(3);
    // hand 2 is a repeat: running total 29 again, hand score 0.
    expect(rounds.some((line) => line.includes("29, 0"))).toBe(true);
  });

  it("restores into a fresh database — it is a dump, not a text file", async () => {
    const body = await dumpOnce();

    const restored = createClient({ url: ":memory:" });
    try {
      // The whole file, replayed as one script — which is what "replayable"
      // has to mean. Statement-at-a-time splitting would quietly skip the
      // multi-line CREATE TABLEs and prove nothing.
      await restored.executeMultiple(body);

      const players = await restored.execute("SELECT display_name FROM player");
      expect(players.rows.map((r) => r.display_name)).toContain(AWKWARD_NAME);

      const rounds = await restored.execute(
        "SELECT running_total, score FROM round_score WHERE player_id = 'p1' AND hand = 2",
      );
      expect(rounds.rows[0]).toMatchObject({ running_total: 29, score: 0 });
    } finally {
      restored.close();
    }
  });
});

describe("backupFileName", () => {
  it("is five-crowns-YYYY-MM-DD.sql, dated in local time", () => {
    // Local-time constructor: the name must match the day the founder sees.
    expect(backupFileName(new Date(2026, 8, 10, 23, 30))).toBe(
      "five-crowns-2026-09-10.sql",
    );
    expect(backupFileName(new Date(2027, 0, 1, 0, 0, 1))).toBe(
      "five-crowns-2027-01-01.sql",
    );
  });
});

describe("⚠️ criterion 79 — permanent, not a one-off check", () => {
  /** The dump minus its own commentary, which legitimately says "no secret". */
  const withoutComments = (body: string) =>
    body
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

  it("the dump of every table contains no secret", async () => {
    const body = withoutComments(await dumpOnce());

    expect(body).not.toContain("scrypt:");
    expect(body).not.toContain("scrypt$"); // the retired format, for good measure
    expect(body).not.toContain("sk-ant");
  });

  it("no column in the schema is even shaped like a secret", async () => {
    const body = withoutComments(await dumpOnce());
    const schema = body.slice(0, body.indexOf("INSERT INTO"));

    // The check that catches a future migration adding a secret-bearing
    // column, rather than catching it after the founder has shared the file.
    expect(schema).not.toMatch(
      /\b(password|passwd|secret|api_?key|credential)\b/i,
    );
  });

  it("dumps the complete table list, so nothing is quietly excluded", async () => {
    const { ALL_TABLES } = await import("@/lib/db/schema");
    const body = await dumpOnce();

    for (const table of ALL_TABLES) {
      // Every table gets a section header, whether or not it has rows —
      // an empty table still has to be in the file, or a restore loses it.
      expect(body, `table ${table} missing from the dump`).toContain(
        `-- ${table}: `,
      );
    }
  });

  it("⚠️ carries only the HMAC of an address, never the address itself", async () => {
    const body = await dumpOnce();
    const attempts = body
      .split("\n")
      .filter((line) => line.startsWith('INSERT INTO "login_attempt"'));

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatch(/'[0-9a-f]{32}'/);
    // No dotted quad and no IPv6 anywhere in the file.
    expect(body).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });
});

describe("npm run db:backup", () => {
  it("writes five-crowns-YYYY-MM-DD.sql to the backup folder and prints the path", () => {
    const out = join(directory, "out-write");
    const run = backupCli({ TURSO_DATABASE_URL: url, BACKUP_DIR: out });

    expect(run.status, run.stderr).toBe(0);
    const files = readdirSync(out);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^five-crowns-\d{4}-\d{2}-\d{2}\.sql$/);
    expect(run.stdout).toContain(join(out, files[0]!));

    const body = readFileSync(join(out, files[0]!), "utf8");
    expect(body).toContain("Player A''s stand-in");
  });

  it("is safe to run twice — one file, replaced, no leftovers", () => {
    const out = join(directory, "out-twice");
    expect(backupCli({ TURSO_DATABASE_URL: url, BACKUP_DIR: out }).status).toBe(0);
    expect(backupCli({ TURSO_DATABASE_URL: url, BACKUP_DIR: out }).status).toBe(0);

    const files = readdirSync(out);
    expect(files).toHaveLength(1);
    expect(files[0]).not.toMatch(/\.partial$/);
  });

  it("reads the credentials `sst shell` provides, which are not the plain variable names", () => {
    const out = join(directory, "out-sst");
    const run = backupCli({
      SST_RESOURCE_TURSO_DATABASE_URL: JSON.stringify({ value: url }),
      BACKUP_DIR: out,
    });

    expect(run.status, run.stderr).toBe(0);
    const [file] = readdirSync(out);
    // The database it was pointed at, not the local dev file it falls back to.
    expect(readFileSync(join(out, file!), "utf8")).toContain("Player A''s stand-in");
  });

  it("never prints a credential", () => {
    const token = "qa-turso-token-must-never-print";
    const ok = backupCli({
      TURSO_DATABASE_URL: url,
      TURSO_AUTH_TOKEN: token,
      BACKUP_DIR: join(directory, "out-token"),
    });
    expect(ok.status, ok.stderr).toBe(0);
    expect(ok.stdout + ok.stderr).not.toContain(token);

    // A malformed URL is refused without being echoed back.
    const bad = backupCli({
      TURSO_DATABASE_URL: "postgres://user:qa-password-must-never-print@example.invalid/db",
      BACKUP_DIR: join(directory, "out-bad"),
    });
    expect(bad.status).toBe(1);
    expect(bad.stdout + bad.stderr).not.toContain("qa-password-must-never-print");
  });

  it("refuses a database that is not there, rather than backing up an empty one", () => {
    const missing = join(directory, "missing.db");
    const out = join(directory, "out-missing");
    const run = backupCli({ TURSO_DATABASE_URL: `file:${missing}`, BACKUP_DIR: out });

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/nothing to back up/);
    expect(existsSync(out)).toBe(false);
    // …and does not create one as a side effect.
    expect(existsSync(missing)).toBe(false);
  });

  it("refuses a remote database without a token, before connecting to anything", () => {
    const run = backupCli({
      TURSO_DATABASE_URL: "libsql://five-crowns.example.invalid",
      BACKUP_DIR: join(directory, "out-remote"),
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/TURSO_AUTH_TOKEN/);
  });
});
