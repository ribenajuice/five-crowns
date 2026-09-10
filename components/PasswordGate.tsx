"use client";

/**
 * ⚠️ **Placeholder.** The gate has to work for stage 1 to be testable end to
 * end, but the screen itself belongs to the frontend developer from stage 2 —
 * `docs/DESIGN-SYSTEM.md` is law and this is not yet it. Structure, labels,
 * focus and touch targets are honoured; the Kitchen Table treatment is not.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PasswordGateProps {
  title: string;
  /** One line under the title. Plain. No jokes anywhere near a password. */
  hint: string;
  /** The JSON endpoint to post to. */
  action: string;
  /** Where to go on success. */
  next: string;
  label: string;
}

export function PasswordGate({
  title,
  hint,
  action,
  next,
  label,
}: PasswordGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

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
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: { message?: unknown } }).error?.message ===
          "string"
          ? (body as { error: { message: string } }).error.message
          : "That did not work. Try again.";

      setError(message);
    } catch {
      setError("Could not reach the app. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center px-4 py-8">
      <h1
        className="mb-2 text-[28px] font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mb-6 text-[var(--color-text-muted)]">{hint}</p>

      <form onSubmit={submit} noValidate>
        <label
          htmlFor="password"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--color-text-muted)]"
        >
          {label}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? "password-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="h-[52px] w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)]"
        />

        {error ? (
          <p
            id="password-error"
            role="alert"
            className="mt-3 rounded-[var(--radius)] bg-[var(--color-error-soft)] px-3 py-2 text-[var(--color-error)]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-6 h-12 w-full rounded-[var(--radius)] bg-[var(--color-brand)] px-4 text-base font-bold text-[var(--color-on-brand)] disabled:opacity-60"
        >
          {busy ? "Checking…" : "Let me in"}
        </button>
      </form>
    </main>
  );
}
