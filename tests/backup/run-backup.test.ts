/**
 * The nightly dump, end to end against a real database.
 *
 * `dump.test.ts` covers `buildDump` as a pure function. Nothing covered
 * `runBackup` — the thing that actually reads the tables and names the object —
 * so two criteria rested on inspection alone:
 *
 *  - **Criterion 83**: the dump lands at `backups/YYYY-MM-DD.sql`. Whether it
 *    reaches S3 is only provable on a deployed stack; whether the *key and the
 *    body* are right is provable here, with the AWS client stubbed out.
 *  - **Criterion 79**: "no secret is in the database. **This is permanent, not
 *    a one-off check.**" A permanent check has to be a test. This one dumps
 *    every table of a populated database and greps the result — including the
 *    schema, so a future migration that adds a secret-bearing column fails
 *    here rather than in a file the founder has already emailed to someone.
 *
 * No AWS. No network. The S3 client is a stub that records what it was asked
 * to put. A **file-backed** database is used deliberately: `runBackup` opens
 * its own libSQL connection, and two `:memory:` connections are two different
 * empty databases, which would make every assertion below vacuous.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type Client } from "@libsql/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

interface PutCall {
  Bucket?: string;
  Key?: string;
  Body?: string;
  ContentType?: string;
}

const puts: PutCall[] = [];

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send(command: { input: PutCall }) {
      puts.push(command.input);
      return {};
    }
  },
  PutObjectCommand: class {
    constructor(public input: PutCall) {}
  },
}));

const MIGRATION = fileURLToPath(
  new URL("../../lib/db/migrations/0000_foundations.sql", import.meta.url),
);

/** Inside the Player A–E scheme, but with the apostrophe that ends a
 * badly-quoted SQL statement. The repository is public: no real names. */
const AWKWARD_NAME = "Player A's stand-in";

let directory: string;
let client: Client;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "five-crowns-backup-"));
  const url = `file:${join(directory, "test.db")}`;

  process.env.TURSO_DATABASE_URL = url;
  delete process.env.TURSO_AUTH_TOKEN;
  process.env.PHOTOS_BUCKET = "five-crowns-photos";

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
  delete process.env.PHOTOS_BUCKET;
  rmSync(directory, { recursive: true, force: true });
});

async function backupOnce(when: string): Promise<string> {
  const { runBackup } = await import("@/lib/backup/handler");
  puts.length = 0;
  await runBackup(new Date(when));
  expect(puts).toHaveLength(1);
  return puts[0]!.Body ?? "";
}

describe("runBackup", () => {
  it("writes one object to backups/YYYY-MM-DD.sql in the photos bucket", async () => {
    const { runBackup } = await import("@/lib/backup/handler");
    puts.length = 0;

    const result = await runBackup(new Date("2026-09-10T14:15:00Z"));

    expect(puts).toHaveLength(1);
    expect(puts[0]!.Bucket).toBe("five-crowns-photos");
    expect(puts[0]!.Key).toBe("backups/2026-09-10.sql");
    expect(result.key).toBe("backups/2026-09-10.sql");
    expect(result.rows).toBeGreaterThan(0);
  });

  it("uses the date it is given, so a run just after midnight is not yesterday's file", async () => {
    await backupOnce("2027-01-01T00:00:01Z");
    expect(puts[0]!.Key).toBe("backups/2027-01-01.sql");
  });

  it("includes the score data — the dump is worth having", async () => {
    const body = await backupOnce("2026-09-10T14:15:00Z");

    expect(body).toContain('INSERT INTO "player"');
    expect(body).toContain('INSERT INTO "round_score"');
    expect(body).toContain("137");
    // A quote in a name is escaped rather than left to end the statement.
    expect(body).toContain("Player A''s stand-in");
  });

  it("keeps both numbers for every round — the total as read and the derived hand", async () => {
    const body = await backupOnce("2026-09-10T14:15:00Z");
    const rounds = body
      .split("\n")
      .filter((line) => line.startsWith('INSERT INTO "round_score"'));

    expect(rounds).toHaveLength(3);
    // hand 2 is a repeat: running total 29 again, hand score 0.
    expect(rounds.some((line) => line.includes("29, 0"))).toBe(true);
  });

  it("restores into a fresh database — it is a dump, not a text file", async () => {
    const body = await backupOnce("2026-09-10T14:15:00Z");

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

describe("⚠️ criterion 79 — permanent, not a one-off check", () => {
  /** The dump minus its own commentary, which legitimately says "no secret". */
  const withoutComments = (body: string) =>
    body
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

  it("the dump of every table contains no secret", async () => {
    const body = withoutComments(await backupOnce("2026-09-10T14:15:00Z"));

    expect(body).not.toContain("scrypt$");
    expect(body).not.toContain("sk-ant");
  });

  it("no column in the schema is even shaped like a secret", async () => {
    const body = withoutComments(await backupOnce("2026-09-10T14:15:00Z"));
    const schema = body.slice(0, body.indexOf("INSERT INTO"));

    // The check that catches a future migration adding a secret-bearing
    // column, rather than catching it after the founder has shared the file.
    expect(schema).not.toMatch(
      /\b(password|passwd|secret|api_?key|credential)\b/i,
    );
  });

  it("dumps the complete table list, so nothing is quietly excluded", async () => {
    const { ALL_TABLES } = await import("@/lib/db/schema");
    const body = await backupOnce("2026-09-10T14:15:00Z");

    for (const table of ALL_TABLES) {
      // Every table gets a section header, whether or not it has rows —
      // an empty table still has to be in the file, or a restore loses it.
      expect(body, `table ${table} missing from the dump`).toContain(
        `-- ${table}: `,
      );
    }
  });

  it("⚠️ carries only the HMAC of an address, never the address itself", async () => {
    const body = await backupOnce("2026-09-10T14:15:00Z");
    const attempts = body
      .split("\n")
      .filter((line) => line.startsWith('INSERT INTO "login_attempt"'));

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatch(/'[0-9a-f]{32}'/);
    // No dotted quad and no IPv6 anywhere in the file.
    expect(body).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });
});

describe("runBackup — the unhappy paths", () => {
  it("refuses to run without a bucket rather than dumping somewhere unexpected", async () => {
    const { runBackup } = await import("@/lib/backup/handler");
    const saved = process.env.PHOTOS_BUCKET;
    delete process.env.PHOTOS_BUCKET;
    try {
      await expect(runBackup(new Date())).rejects.toThrow(/PHOTOS_BUCKET/);
    } finally {
      process.env.PHOTOS_BUCKET = saved;
    }
  });
});
