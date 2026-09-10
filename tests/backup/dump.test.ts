import { describe, expect, it } from "vitest";

import {
  backupKey,
  buildDump,
  insertStatement,
  quoteIdentifier,
  quoteLiteral,
} from "@/lib/backup/dump";
import { ALL_TABLES } from "@/lib/db/schema";

describe("quoteLiteral", () => {
  it("escapes a quote in a name rather than ending the statement", () => {
    expect(quoteLiteral("O'Brien")).toBe("'O''Brien'");
    expect(quoteLiteral("'); DROP TABLE game; --")).toBe(
      "'''); DROP TABLE game; --'",
    );
  });

  it("writes NULL for a missing value", () => {
    expect(quoteLiteral(null)).toBe("NULL");
  });

  it("writes integers unquoted so they restore as integers", () => {
    expect(quoteLiteral(64)).toBe("64");
    expect(quoteLiteral(0)).toBe("0");
    expect(quoteLiteral(-1)).toBe("-1");
  });

  it("writes a blob as a hex literal", () => {
    expect(quoteLiteral(new Uint8Array([0, 15, 255]))).toBe("X'000fff'");
  });

  it("never emits a bare NaN or Infinity, which are not valid SQL", () => {
    expect(quoteLiteral(Number.NaN)).toBe("NULL");
    expect(quoteLiteral(Number.POSITIVE_INFINITY)).toBe("NULL");
  });
});

describe("quoteIdentifier", () => {
  it("double-quotes and escapes", () => {
    expect(quoteIdentifier("round_score")).toBe('"round_score"');
    expect(quoteIdentifier('od"d')).toBe('"od""d"');
  });
});

describe("insertStatement", () => {
  it("writes one row of round_score the way the paper has it", () => {
    const statement = insertStatement(
      {
        name: "round_score",
        columns: ["game_id", "player_id", "hand", "running_total", "score"],
        rows: [],
      },
      ["g_1", "p_c410", 3, 27, 4],
    );

    expect(statement).toBe(
      'INSERT INTO "round_score" ("game_id", "player_id", "hand", "running_total", "score") VALUES (\'g_1\', \'p_c410\', 3, 27, 4);',
    );
  });
});

describe("buildDump", () => {
  const dump = buildDump({
    schemaStatements: ["CREATE TABLE player (id text PRIMARY KEY)"],
    tables: [
      {
        name: "player",
        columns: ["id", "display_name"],
        rows: [["p_1", "Player A"]],
      },
    ],
    takenAt: new Date("2026-09-10T14:15:00.000Z"),
  });

  it("is replayable: one transaction, foreign keys off during the restore", () => {
    expect(dump).toContain("PRAGMA foreign_keys=OFF;");
    expect(dump).toContain("BEGIN TRANSACTION;");
    expect(dump).toContain("COMMIT;");
    expect(dump).toContain("PRAGMA foreign_keys=ON;");
  });

  it("terminates every schema statement", () => {
    expect(dump).toContain("CREATE TABLE player (id text PRIMARY KEY);");
  });

  it("says on its face that the photos are not in it", () => {
    // The one thing that gets discovered at the moment it matters most.
    expect(dump).toContain("aws s3 sync s3://five-crowns-photos ./photos");
  });

  it("says it holds no secret, because no table could hold one", () => {
    expect(dump).toContain("no secret is ever stored in the database");
  });
});

describe("backupKey", () => {
  it("is backups/YYYY-MM-DD.sql in the photos bucket", () => {
    expect(backupKey(new Date("2026-09-10T14:15:00.000Z"))).toBe(
      "backups/2026-09-10.sql",
    );
  });
});

describe("the record's table list", () => {
  it("holds no table that could carry a secret", () => {
    // ⚠️ Permanent, not a one-off check (PRD criterion 79). If a table for keys,
    // hashes or tokens is ever added, this fails and the reviewer has to argue
    // for it rather than merge it by accident.
    const forbidden = ["secret", "key", "password", "hash", "token", "credential"];

    for (const table of ALL_TABLES) {
      for (const word of forbidden) {
        // login_attempt.ip_hash is a column, not a table, and holds an HMAC of
        // an address rather than anything secret.
        expect(table).not.toContain(word);
      }
    }
  });
});
