/**
 * GET /api/admin/export — PRD criteria 102-109.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { ADMIN_COOKIE, GROUP_COOKIE } from "@/lib/auth/cookies";

import { setupTestDb, teardownTestDb } from "../helpers/db";
import { setUpDraft } from "../helpers/draft";
import { SHEET_01, SHEET_02 } from "../fixtures/sheets";

const requestCookies = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined,
    set: () => undefined,
  }),
}));

let verifyResult = true;
vi.mock("@/lib/vision/verify-key", () => ({
  verifyAnthropicApiKey: async () => verifyResult,
}));

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "export-test-secret";
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  verifyResult = true;
  requestCookies.clear();
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import("@/lib/config");
  invalidateAllParameters();
  resetLocalParameterOverrides();

  const { signSession } = await import("@/lib/auth/token");
  requestCookies.set(GROUP_COOKIE, await signSession({ s: "group", v: 0 }, process.env.SESSION_SECRET!));
  requestCookies.set(ADMIN_COOKIE, await signSession({ s: "admin", v: 0 }, process.env.SESSION_SECRET!));
});

afterEach(async () => {
  await teardownTestDb();
  await setupTestDb();
});

/**
 * A small RFC 4180 reader for these tests \u2014 quoted fields (a roster's
 * auto-name has commas in it), doubled-quote escaping, CRLF row endings.
 */
function parseCsv(text: string): string[][] {
  const body = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" && body[i + 1] === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

describe("GET /api/admin/export — criterion 109, admin gating", () => {
  it("401s with no session at all", async () => {
    requestCookies.clear();
    const { GET } = await import("@/app/api/admin/export/route");
    expect((await GET()).status).toBe(401);
  });

  it("401s a group session with no admin session — group access grants nothing here", async () => {
    requestCookies.delete(ADMIN_COOKIE);
    const { GET } = await import("@/app/api/admin/export/route");
    expect((await GET()).status).toBe(401);
  });

  it("200s with both sessions", async () => {
    const { GET } = await import("@/app/api/admin/export/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="five-crowns-scores-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });
});

describe("GET /api/admin/export — criteria 102-105, the file itself", () => {
  it("criterion 102: UTF-8 BOM, header row, RFC-4180 body", async () => {
    const { GET } = await import("@/app/api/admin/export/route");
    const response = await GET();
    // `.text()`'s TextDecoder strips a leading BOM per the WHATWG spec
    // (`ignoreBOM: false` by default) — check the actual bytes sent to the
    // client instead, which is what a spreadsheet reads.
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));

    const text = await (await GET()).text();
    expect(text).toContain(
      "game_id,played_on,location,roster_name,roster_size,player_name,column_order,sheet_name,final_score,is_winner," +
        Array.from({ length: 11 }, (_, i) => `rt_${i + 1}`).join(",") +
        "," +
        Array.from({ length: 11 }, (_, i) => `hand_${i + 1}`).join(","),
    );
  });

  it("criterion 103/104: 9 data rows over both fixture games, rt_/hand_ match stored values exactly", async () => {
    await setUpDraft(SHEET_01).then(async ({ draftId, state }) => {
      const { saveGame } = await import("@/lib/games/save");
      await saveGame(draftId, state);
    });
    await setUpDraft(SHEET_02).then(async ({ draftId, state }) => {
      const { saveGame } = await import("@/lib/games/save");
      await saveGame(draftId, state);
    });

    const { GET } = await import("@/app/api/admin/export/route");
    const text = await (await GET()).text();
    const [header, ...rows] = parseCsv(text);

    expect(rows).toHaveLength(9); // 4 + 5 players

    const playerCRow = rows.find(
      (r) => r[header!.indexOf("game_id")] && r[header!.indexOf("player_name")] === "Player C" && r[header!.indexOf("roster_size")] === "4",
    )!;
    expect(playerCRow).toBeDefined();
    const rtIndex = header!.indexOf("rt_1");
    const handIndex = header!.indexOf("hand_1");
    expect(playerCRow.slice(rtIndex, rtIndex + 11).map(Number)).toEqual(SHEET_01.columns[2]!.runningTotals);
    expect(playerCRow.slice(handIndex, handIndex + 11).map(Number)).toEqual(SHEET_01.columns[2]!.handScores);
    expect(playerCRow[header!.indexOf("final_score")]).toBe("78");
    expect(playerCRow[header!.indexOf("is_winner")]).toBe("true");

    const playerBRow5 = rows.find(
      (r) => r[header!.indexOf("player_name")] === "Player B" && r[header!.indexOf("roster_size")] === "5",
    )!;
    expect(playerBRow5.slice(rtIndex, rtIndex + 11).map(Number)).toEqual(SHEET_02.columns[1]!.runningTotals);
    expect(playerBRow5.slice(handIndex, handIndex + 11).map(Number)).toEqual(SHEET_02.columns[1]!.handScores);
    expect(playerBRow5[header!.indexOf("is_winner")]).toBe("true");
  });

  it("criterion 105: an empty location is '' not 'No location', and roster_name matches the app's auto-name", async () => {
    const { draftId, state } = await setUpDraft(SHEET_01);
    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const { getGame } = await import("@/lib/games/queries");
    const { listGames } = await import("@/lib/games/queries");
    const [listed] = await listGames();
    const detail = await getGame(listed!.id);

    const { GET } = await import("@/app/api/admin/export/route");
    const text = await (await GET()).text();
    const [header, ...rows] = parseCsv(text);

    for (const row of rows) {
      expect(row[header!.indexOf("location")]).toBe("");
      expect(row[header!.indexOf("roster_name")]).toBe(detail!.rosterName);
    }
    // Never the literal placeholder the games list uses for display.
    expect(text).not.toContain("No location");
  });

  it("criterion 105: a custom roster name in the file matches the one the app displays", async () => {
    const { draftId, state } = await setUpDraft(SHEET_01);
    const { saveGame } = await import("@/lib/games/save");
    const { gameId } = await saveGame(draftId, state);

    const { getDb } = await import("@/lib/db");
    const { game, roster } = await import("@/lib/db/schema");
    const db = getDb();
    const [gameRow] = await db.select().from(game).where(eq(game.id, gameId));
    await db.update(roster).set({ name: "Thursday crew" }).where(eq(roster.id, gameRow!.rosterId));

    const { GET } = await import("@/app/api/admin/export/route");
    const text = await (await GET()).text();
    const [header, ...rows] = parseCsv(text);
    for (const row of rows) {
      expect(row[header!.indexOf("roster_name")]).toBe("Thursday crew");
    }
  });

  it("criterion 106: a shared win sets is_winner true on every tied row", async () => {
    const totals = [...SHEET_01.columns[3]!.runningTotals]; // Player D
    totals[10] = 78; // ties Player C's 78, row 10 (67) still climbs
    const { draftId, state } = await setUpDraft(SHEET_01, { overrides: { 3: totals } });
    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const { GET } = await import("@/app/api/admin/export/route");
    const text = await (await GET()).text();
    const [header, ...rows] = parseCsv(text);

    const winners = rows.filter((r) => r[header!.indexOf("is_winner")] === "true");
    expect(winners.map((r) => r[header!.indexOf("player_name")]).sort()).toEqual([
      "Player C",
      "Player D",
    ]);
  });
});

describe("GET /api/admin/export — permanent criterion 107", () => {
  it("never contains the Anthropic key, either password hash, the session secret, or an SSM parameter value", async () => {
    const { draftId, state } = await setUpDraft(SHEET_01);
    const { saveGame } = await import("@/lib/games/save");
    await saveGame(draftId, state);

    const { putParameter } = await import("@/lib/config");
    const { PARAM } = await import("@/lib/config/parameters");
    await putParameter(PARAM.groupPasswordHash, "scrypt$group-secret-hash-value");
    await putParameter(PARAM.adminPasswordHash, "scrypt$admin-secret-hash-value");

    const { setAnthropicApiKey } = await import("@/lib/vision/api-key");
    await setAnthropicApiKey("sk-ant-super-secret-key-value-0001");

    const { GET } = await import("@/app/api/admin/export/route");
    const text = await (await GET()).text();

    expect(text).not.toContain("sk-ant-super-secret-key-value-0001");
    expect(text).not.toContain("scrypt$group-secret-hash-value");
    expect(text).not.toContain("scrypt$admin-secret-hash-value");
    expect(text).not.toContain(process.env.SESSION_SECRET);
    // Belt and braces: no field in this file should ever look like an
    // Anthropic key or a scrypt hash, whatever test data changes later.
    expect(text).not.toMatch(/sk-ant-/);
    expect(text).not.toMatch(/scrypt\$/);
  });
});
