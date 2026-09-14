"use client";

/**
 * The admin panel's group-password form — docs/DESIGN-SYSTEM.md § "Admin
 * panel — changing the group password" (PRD criteria 88-90).
 *
 * Reuses `AdminKeyPanel`'s shape exactly: one masked `Field` with a
 * show/hide toggle in its `trailing` slot, one primary `Button`. ⚠️ No
 * current-password field — rotating this one is often *because* it's been
 * lost, so demanding the old value would be the one place the product locks
 * the founder out on purpose.
 *
 * The warning banner is shown **before** the button is even usable — it
 * describes what submitting will do, not a result of having submitted
 * (criterion 90) — and stays up through every state except success, where a
 * plain confirmation banner replaces it. This route only bumps the group
 * epoch (criterion 88), not the admin one, so the *admin* cookie on this
 * device survives. But `/admin` requires a valid *group* session first
 * (`requireGroupSession()` in `app/admin/page.tsx`), and the group cookie on
 * this very device is one of the ones this change just revoked — so this
 * device is not exempt. It just isn't bounced *immediately*: the success
 * banner above renders client-side, on the page already in the browser, with
 * no server round trip that would notice the stale cookie. The next time
 * this device asks the server for anything gated on a group session — a
 * navigation, a refresh — it lands back on `/login`, same as any other
 * device that held the old group cookie.
 */

import { useRef, useState } from "react";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { Field } from "./Field";
import { EyeIcon } from "./icons";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { errorCodeOf } from "@/lib/ui/api-error";
import {
  GENERIC_ERROR_MESSAGE,
  GENERIC_ERROR_TITLE,
  GROUP_PASSWORD_FIELD_LABEL,
  GROUP_PASSWORD_SAVED_MESSAGE,
  GROUP_PASSWORD_SAVED_TITLE,
  GROUP_PASSWORD_SAVE_BUSY_LABEL,
  GROUP_PASSWORD_SAVE_LABEL,
  GROUP_PASSWORD_WARNING_MESSAGE,
  GROUP_PASSWORD_WARNING_TITLE,
  OFFLINE_MESSAGE,
  OFFLINE_TITLE,
  PASSWORD_FIELD_EMPTY_MESSAGE,
  PASSWORD_LENGTH_HELPER,
  SESSION_ENDED_MESSAGE,
  SESSION_ENDED_TITLE,
  hidePasswordAriaLabel,
  showPasswordAriaLabel,
} from "@/lib/ui/copy";

type SaveState = "idle" | "saving" | "success" | "error";

export function GroupPasswordPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; message: string } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saveState === "saving") return;

    if (value.length === 0) {
      setFieldError(PASSWORD_FIELD_EMPTY_MESSAGE);
      inputRef.current?.focus();
      return;
    }
    if (value.length < NEW_PASSWORD_MIN_LENGTH) {
      setFieldError(PASSWORD_LENGTH_HELPER);
      inputRef.current?.focus();
      return;
    }

    setFieldError(null);
    setBanner(null);
    setSaveState("saving");

    try {
      const response = await fetch("/api/admin/password/group", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: value }),
      });

      if (response.ok) {
        setValue("");
        setSaveState("success");
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      const code = errorCodeOf(body);

      if (code === "bad_request") {
        setFieldError(PASSWORD_LENGTH_HELPER);
        setSaveState("idle");
        inputRef.current?.focus();
        return;
      }

      if (code === "unauthorised") {
        setBanner({ title: SESSION_ENDED_TITLE, message: SESSION_ENDED_MESSAGE });
      } else {
        setBanner({ title: GENERIC_ERROR_TITLE, message: GENERIC_ERROR_MESSAGE });
      }
      setSaveState("error");
    } catch {
      setBanner({ title: OFFLINE_TITLE, message: OFFLINE_MESSAGE });
      setSaveState("error");
    }
  }

  const saving = saveState === "saving";

  return (
    <div className="flex flex-col gap-4">
      {saveState === "success" ? (
        <Banner tone="ok" title={GROUP_PASSWORD_SAVED_TITLE}>
          {GROUP_PASSWORD_SAVED_MESSAGE}
        </Banner>
      ) : (
        <Banner tone="warn" title={GROUP_PASSWORD_WARNING_TITLE}>
          {GROUP_PASSWORD_WARNING_MESSAGE}
        </Banner>
      )}

      {banner ? (
        <Banner tone="error" title={banner.title}>
          {banner.message}
        </Banner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <Field
          ref={inputRef}
          id="group-password"
          name="group-password"
          label={GROUP_PASSWORD_FIELD_LABEL}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          disabled={saving}
          hint={PASSWORD_LENGTH_HELPER}
          onChange={(event) => {
            setValue(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "group-password-error" : undefined}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword
                  ? hidePasswordAriaLabel(GROUP_PASSWORD_FIELD_LABEL)
                  : showPasswordAriaLabel(GROUP_PASSWORD_FIELD_LABEL)
              }
              className="inline-flex size-11 items-center justify-center text-text-muted"
            >
              <EyeIcon crossed={showPassword} />
            </button>
          }
        />

        {fieldError ? (
          <p id="group-password-error" role="alert" className="text-sm font-bold text-error">
            {fieldError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving || undefined}
          className={buttonClasses("primary", { fullWidth: true })}
        >
          {saving ? GROUP_PASSWORD_SAVE_BUSY_LABEL : GROUP_PASSWORD_SAVE_LABEL}
        </button>
      </form>
    </div>
  );
}
