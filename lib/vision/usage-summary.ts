/**
 * The admin panel's "usage and spend" section (PRD criteria 110-114).
 *
 * Three independent facts, each computed straight from storage with no
 * caching: this UTC calendar month's transcription counts and token spend,
 * and today's counts against both daily caps. A month or day with nothing in
 * it still returns real zeroes — never `null`, `undefined` or an omitted
 * field (criterion 114) — so the panel always has a consistent shape to
 * render.
 */

import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { transcription, usageDay } from "@/lib/db/schema";

import {
  DAILY_COLUMN_TRANSCRIPTION_CAP,
  DAILY_SHEET_TRANSCRIPTION_CAP,
} from "./usage-cap";
import {
  estimateCostAud,
  INPUT_USD_PER_MILLION_TOKENS,
  OUTPUT_USD_PER_MILLION_TOKENS,
  PRICED_MODEL,
  PRICES_CHECKED_ON,
  USD_TO_AUD_RATE,
} from "./pricing";

export interface UsageSummary {
  month: {
    /** UTC calendar month, e.g. "2026-09" (criterion 110 — labelled as UTC). */
    label: string;
    sheetReads: number;
    columnRereads: number;
    total: number;
  };
  spend: {
    /** A$, rounded to the cent. Derived from stored tokens, not a request count. */
    estimatedAud: number;
    conversionRate: number;
    model: string;
    pricePerMillionInputUsd: number;
    pricePerMillionOutputUsd: number;
    /** ISO date the prices were last checked against the Anthropic console. */
    pricesCheckedOn: string;
  };
  today: {
    sheetReads: number;
    sheetCap: number;
    columnRereads: number;
    columnCap: number;
  };
}

function utcMonthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function utcMonthEnd(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function utcMonthLabel(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export async function getUsageSummary(now: Date = new Date()): Promise<UsageSummary> {
  const db = getDb();

  // Independent tables, neither read depending on the other's result, so they
  // run concurrently rather than one after the other.
  const [monthRows, [todayRow]] = await Promise.all([
    // Counted as an attempt whatever its status — 'ok', 'invalid' and 'error'
    // all contribute their stored tokens (or zero, where none were recorded)
    // to the estimate (criterion 111, 114). No status filter here on purpose.
    db
      .select({
        kind: transcription.kind,
        count: sql<number>`count(*)`,
        inputTokens: sql<number>`coalesce(sum(coalesce(${transcription.inputTokens}, 0)), 0)`,
        outputTokens: sql<number>`coalesce(sum(coalesce(${transcription.outputTokens}, 0)), 0)`,
      })
      .from(transcription)
      .where(
        and(
          gte(transcription.createdAt, utcMonthStart(now)),
          lt(transcription.createdAt, utcMonthEnd(now)),
        ),
      )
      .groupBy(transcription.kind),
    db
      .select({
        sheetTranscriptions: usageDay.sheetTranscriptions,
        columnTranscriptions: usageDay.columnTranscriptions,
      })
      .from(usageDay)
      .where(eq(usageDay.day, utcDay(now))),
  ]);

  let sheetReads = 0;
  let columnRereads = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const row of monthRows) {
    const count = Number(row.count);
    totalInputTokens += Number(row.inputTokens);
    totalOutputTokens += Number(row.outputTokens);
    if (row.kind === "sheet") sheetReads = count;
    else if (row.kind === "column") columnRereads = count;
  }

  return {
    month: {
      label: utcMonthLabel(now),
      sheetReads,
      columnRereads,
      total: sheetReads + columnRereads,
    },
    spend: {
      estimatedAud: estimateCostAud(totalInputTokens, totalOutputTokens),
      conversionRate: USD_TO_AUD_RATE,
      model: PRICED_MODEL,
      pricePerMillionInputUsd: INPUT_USD_PER_MILLION_TOKENS,
      pricePerMillionOutputUsd: OUTPUT_USD_PER_MILLION_TOKENS,
      pricesCheckedOn: PRICES_CHECKED_ON,
    },
    today: {
      sheetReads: todayRow?.sheetTranscriptions ?? 0,
      sheetCap: DAILY_SHEET_TRANSCRIPTION_CAP,
      columnRereads: todayRow?.columnTranscriptions ?? 0,
      columnCap: DAILY_COLUMN_TRANSCRIPTION_CAP,
    },
  };
}
