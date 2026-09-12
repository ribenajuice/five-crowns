"use client";

/**
 * The admin panel's API key form — docs/DESIGN-SYSTEM.md § "Admin panel — the
 * API key screen". Six states: empty (no key ever set), saving, just saved,
 * just rejected, and the two resting states for a returning visit (working /
 * not working right now) — plus the `untried` and `unknown` values `works`
 * can also hold on a fresh `GET`.
 *
 * ⚠️ The panel is plain — no jokes anywhere near the key. The key is never
 * rendered back in any state (PRD criterion 76): only last four characters,
 * when it was set, and a status `Pill`, sourced from `GET /api/admin/key`.
 *
 * `docs/DECISIONS.md`, "The API key's status is derived, not stored": the
 * design mockup's "not working right now" state describes last-worked *and*
 * last-failed timestamps, but the ADR deliberately derives `works` from the
 * most recent `transcription` row rather than storing that pair, so the API
 * only carries `setAt`. This card shows what the API actually returns.
 */

import { useEffect, useRef, useState } from "react";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { Field } from "./Field";
import { Pill, type PillTone } from "./Pill";
import {
  ADMIN_HIDE_KEY_LABEL,
  ADMIN_KEY_FIELD_LABEL,
  ADMIN_NO_KEY_MESSAGE,
  ADMIN_NO_KEY_TITLE,
  ADMIN_REJECTED_MESSAGE,
  ADMIN_REJECTED_TITLE,
  ADMIN_REPLACE_BUTTON_LABEL,
  ADMIN_SAVED_MESSAGE,
  ADMIN_SAVED_TITLE,
  ADMIN_SAVE_BUSY_LABEL,
  ADMIN_SAVE_BUTTON_LABEL,
  ADMIN_SHOW_KEY_LABEL,
  ADMIN_STATUS_NOT_WORKING,
  ADMIN_STATUS_UNTRIED,
  ADMIN_STATUS_WORKING,
  ADMIN_TESTING_HELPER,
} from "@/lib/ui/copy";

interface ApiKeyStatus {
  configured: boolean;
  last4: string | null;
  setAt: string | null;
  works: "yes" | "no" | "untried" | "unknown";
}

type LoadState = "loading" | "loaded" | "load-error";
type SaveState = "idle" | "saving" | "success" | "error";

const EMPTY_KEY_MESSAGE = "Paste the key first.";

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

function formatSetAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusPill(works: ApiKeyStatus["works"]): { tone: PillTone; label: string } {
  if (works === "yes") return { tone: "ok", label: ADMIN_STATUS_WORKING };
  if (works === "no") return { tone: "err", label: ADMIN_STATUS_NOT_WORKING };
  return { tone: "neutral", label: ADMIN_STATUS_UNTRIED };
}

function StatusCard({ status, onReplace }: { status: ApiKeyStatus; onReplace: () => void }) {
  const pill = statusPill(status.works);
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display text-lg font-bold">Key ending {status.last4}</p>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      {status.setAt ? (
        <p className="text-sm text-text-muted">Set {formatSetAt(status.setAt)}</p>
      ) : null}
      <button type="button" onClick={onReplace} className={`${buttonClasses("ghost")} mt-3`}>
        {ADMIN_REPLACE_BUTTON_LABEL}
      </button>
    </div>
  );
}

export function AdminKeyPanel() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [emptyError, setEmptyError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/key");
        if (cancelled) return;
        if (!response.ok) {
          setLoadState("load-error");
          return;
        }
        const body = (await response.json()) as ApiKeyStatus;
        setStatus(body);
        setFormOpen(!body.configured);
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

  function openReplaceForm() {
    setSaveState("idle");
    setKeyValue("");
    setEmptyError(false);
    setFormOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saveState === "saving") return;

    const trimmed = keyValue.trim();
    if (trimmed.length === 0) {
      setEmptyError(true);
      inputRef.current?.focus();
      return;
    }

    setEmptyError(false);
    setSaveState("saving");

    try {
      const response = await fetch("/api/admin/key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      if (response.ok) {
        const body = (await response.json()) as ApiKeyStatus;
        setStatus(body);
        setSaveState("success");
        setFormOpen(false);
        setKeyValue("");
        return;
      }

      setSaveState("error");
    } catch {
      setSaveState("error");
    }
  }

  if (loadState === "loading") {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (loadState === "load-error" || !status) {
    return (
      <Banner tone="error" title="Couldn't load the admin panel.">
        Check your connection and reload the page.
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {saveState === "success" ? (
        <Banner tone="ok" title={ADMIN_SAVED_TITLE}>
          {ADMIN_SAVED_MESSAGE}
        </Banner>
      ) : null}

      {saveState === "error" ? (
        <Banner tone="error" title={ADMIN_REJECTED_TITLE}>
          {ADMIN_REJECTED_MESSAGE}
        </Banner>
      ) : null}

      {!status.configured ? (
        <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
          <p className="font-bold">{ADMIN_NO_KEY_TITLE}</p>
          <p className="text-text-muted">{ADMIN_NO_KEY_MESSAGE}</p>
        </div>
      ) : null}

      {status.configured && !formOpen ? (
        <StatusCard status={status} onReplace={openReplaceForm} />
      ) : null}

      {formOpen ? (
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-3">
          <Field
            ref={inputRef}
            id="admin-api-key"
            name="admin-api-key"
            label={ADMIN_KEY_FIELD_LABEL}
            type={showKey ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={keyValue}
            disabled={saveState === "saving"}
            onChange={(event) => {
              setKeyValue(event.target.value);
              if (emptyError) setEmptyError(false);
            }}
            aria-invalid={emptyError ? true : undefined}
            aria-describedby={emptyError ? "admin-api-key-empty" : undefined}
            trailing={
              <button
                type="button"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? ADMIN_HIDE_KEY_LABEL : ADMIN_SHOW_KEY_LABEL}
                className="inline-flex size-8 items-center justify-center text-text-muted"
              >
                <EyeIcon crossed={showKey} />
              </button>
            }
          />

          {emptyError ? (
            <p id="admin-api-key-empty" role="alert" className="text-sm font-bold text-error">
              {EMPTY_KEY_MESSAGE}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saveState === "saving"}
            aria-busy={saveState === "saving" || undefined}
            className={buttonClasses("primary", { fullWidth: true })}
          >
            {saveState === "saving" ? ADMIN_SAVE_BUSY_LABEL : ADMIN_SAVE_BUTTON_LABEL}
          </button>

          {saveState === "saving" ? (
            <p className="text-sm text-text-muted">{ADMIN_TESTING_HELPER}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
