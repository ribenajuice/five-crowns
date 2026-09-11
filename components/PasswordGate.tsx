"use client";

/**
 * The password screen, used by both gates (group and admin).
 *
 * No app bar: the display-face `h1` is the wordmark (docs/DESIGN-SYSTEM.md).
 * Errors are `Banner`s whose copy is fixed by the design system
 * (§ Voice & tone), keyed on the API's stable error `code`, never on its
 * sentence. No jokes anywhere near a password.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Banner, type BannerTone } from "@/components/Banner";
import { buttonClasses, ButtonLink } from "@/components/Button";

interface PasswordGateProps {
  title: string;
  /** One line under the title. Plain. */
  hint: string;
  /** The JSON endpoint to post to. */
  action: string;
  /** Where to go on success. */
  next: string;
  label: string;
  /** An optional ghost button under the submit button. */
  back?: { href: string; label: string };
}

interface GateError {
  tone: BannerTone;
  title: string;
  action: string;
  /** Whether the password itself is what's wrong (sets `aria-invalid`). */
  invalid: boolean;
}

const EMPTY_MESSAGE = "Type the password.";

function errorFor(code: string | null): GateError {
  switch (code) {
    case "invalid_credentials":
      return {
        tone: "error",
        title: "That password's wrong.",
        action: "Check it with whoever set it up.",
        invalid: true,
      };
    case "rate_limited":
      // PRD criterion 5: a plain "try again later".
      return {
        tone: "warn",
        title: "Too many tries.",
        action: "Try again later.",
        invalid: false,
      };
    case "not_configured":
      return {
        tone: "error",
        title: "This app has no password set yet.",
        action: "It needs setting up before anyone can get in.",
        invalid: false,
      };
    case "unauthorised":
      // The admin prompt after the group session has lapsed.
      return {
        tone: "error",
        title: "You're signed out.",
        action: "Reload the page and put the group password in first.",
        invalid: false,
      };
    default:
      return {
        tone: "error",
        title: "That didn't work.",
        action: "Try again.",
        invalid: false,
      };
  }
}

const OFFLINE: GateError = {
  tone: "error",
  title: "Couldn't reach the app.",
  action: "Check your connection.",
  invalid: false,
};

function codeOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }
  const code = (body as { error: { code?: unknown } }).error?.code;
  return typeof code === "string" ? code : null;
}

export function PasswordGate({
  title,
  hint,
  action,
  next,
  label,
  back,
}: PasswordGateProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<GateError | null>(null);
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setError(null);

    if (password.length === 0) {
      setEmpty(true);
      inputRef.current?.focus();
      return;
    }

    setEmpty(false);
    setBusy(true);

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setPassword("");
        router.replace(next);
        router.refresh();
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      const code = codeOf(body);

      if (code === "bad_request") {
        setEmpty(true);
      } else {
        setError(errorFor(code));
      }
      inputRef.current?.focus();
    } catch {
      setError(OFFLINE);
    } finally {
      setBusy(false);
    }
  }

  const describedBy = empty
    ? "password-empty"
    : error
      ? "password-error"
      : undefined;
  const invalid = empty || error?.invalid === true;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-read flex-col justify-center px-4 py-8">
      <h1 className="mb-2 font-display text-xl font-bold">{title}</h1>
      <p className="mb-6 text-text-muted">{hint}</p>

      <form onSubmit={submit} noValidate>
        <label
          htmlFor="password"
          className="mb-2 block text-xs font-bold uppercase tracking-label text-text-muted"
        >
          {label}
        </label>
        <input
          ref={inputRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (empty) setEmpty(false);
          }}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          className="h-13 w-full rounded-[var(--radius)] border border-text-muted bg-surface px-3 text-base text-text aria-invalid:border-error"
        />

        {empty ? (
          <p
            id="password-empty"
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-sm font-bold text-error"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 7v6" />
              <path d="M12 16.75v.01" />
            </svg>
            {EMPTY_MESSAGE}
          </p>
        ) : null}

        {error ? (
          <div className="mt-3">
            <Banner id="password-error" tone={error.tone} title={error.title}>
              {error.action}
            </Banner>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          aria-busy={busy || undefined}
          className={`mt-6 ${buttonClasses("primary", { fullWidth: true })}`}
        >
          {busy ? "Checking…" : "Let me in"}
        </button>

        {back ? (
          <div className="mt-3">
            <ButtonLink href={back.href} variant="ghost" fullWidth>
              {back.label}
            </ButtonLink>
          </div>
        ) : null}
      </form>
    </main>
  );
}
