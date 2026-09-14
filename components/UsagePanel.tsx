"use client";

/**
 * The admin panel's usage-and-spend card — docs/DESIGN-SYSTEM.md § "Admin
 * panel — usage and spend" (PRD criteria 110-114).
 *
 * Fetches `GET /api/admin/usage` on mount, the same load-lifecycle shape as
 * `AdminKeyPanel` (loading / loaded / load-error). Three label/value pairs in
 * the uppercase `--text-xs` label over `--num` value shape, an A$ estimate
 * with its disclosure sentence, and today's two cap lines — every number
 * read straight from the response, never a literal written into this file:
 * a real mismatch between an old illustrative cap and the enforced one is
 * exactly why this rule exists (PRD criterion 113).
 *
 * ⚠️ A month with nothing transcribed still renders every value — real
 * zeroes and `A$0.00` (criterion 114) — because the API itself always
 * returns real numbers, never `null`. No `Banner`, no `Pill`: this section is
 * read-only arithmetic, not a status.
 */

import { useEffect, useState } from "react";

import { Banner } from "./Banner";
import {
  USAGE_ESTIMATE_LABEL,
  USAGE_HEADING,
  USAGE_LABEL_COLUMN_REREADS,
  USAGE_LABEL_SHEET_READS,
  USAGE_LABEL_TOTAL,
  USAGE_LOAD_ERROR_MESSAGE,
  USAGE_LOAD_ERROR_TITLE,
  formatAud,
  formatUsageMonthLabel,
  todayColumnRereadsLabel,
  todaySheetReadsLabel,
  usageEstimateDisclosure,
} from "@/lib/ui/copy";

interface UsageSummary {
  month: { label: string; sheetReads: number; columnRereads: number; total: number };
  spend: {
    estimatedAud: number;
    conversionRate: number;
    model: string;
    pricePerMillionInputUsd: number;
    pricePerMillionOutputUsd: number;
    pricesCheckedOn: string;
  };
  today: { sheetReads: number; sheetCap: number; columnRereads: number; columnCap: number };
}

type LoadState = "loading" | "loaded" | "load-error";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-label text-text-muted">{label}</p>
      <p className="tabular text-num font-black">{value}</p>
    </div>
  );
}

export function UsagePanel() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/usage");
        if (cancelled) return;
        if (!response.ok) {
          setLoadState("load-error");
          return;
        }
        const body = (await response.json()) as UsageSummary;
        setUsage(body);
        setLoadState("loaded");
      } catch {
        if (!cancelled) setLoadState("load-error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === "loading") {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (loadState === "load-error" || !usage) {
    return (
      <Banner tone="error" title={USAGE_LOAD_ERROR_TITLE}>
        {USAGE_LOAD_ERROR_MESSAGE}
      </Banner>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <p className="font-display text-lg font-bold">{USAGE_HEADING}</p>
      <p className="mb-4 text-sm text-text-muted">{formatUsageMonthLabel(usage.month.label)}</p>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label={USAGE_LABEL_SHEET_READS} value={String(usage.month.sheetReads)} />
        <Stat label={USAGE_LABEL_COLUMN_REREADS} value={String(usage.month.columnRereads)} />
        <Stat label={USAGE_LABEL_TOTAL} value={String(usage.month.total)} />
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-label text-text-muted">
          {USAGE_ESTIMATE_LABEL}
        </p>
        <p className="tabular text-num font-black">{formatAud(usage.spend.estimatedAud)}</p>
        <p className="mt-1 text-sm text-text-muted">
          {usageEstimateDisclosure(usage.spend.conversionRate, usage.spend.pricesCheckedOn)}
        </p>
      </div>

      <div className="flex flex-col gap-1 text-sm text-text-muted">
        <p>{todaySheetReadsLabel(usage.today.sheetReads, usage.today.sheetCap)}</p>
        <p>{todayColumnRereadsLabel(usage.today.columnRereads, usage.today.columnCap)}</p>
      </div>
    </div>
  );
}
