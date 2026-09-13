"use client";

/**
 * The admin panel's own-password form — docs/DESIGN-SYSTEM.md § "Admin panel
 * — changing the admin password" (PRD criteria 91-93, 95-96).
 *
 * Three masked `Field`s stacked (current, new, confirm), each with its own
 * show/hide toggle in the existing `trailing` slot. The reasoning for asking
 * for the current password lives as ordinary helper text under that field
 * (`Field`'s `hint`), not a `Banner` — nothing risky is about to happen yet.
 * A wrong current password is a normal form error: the field gets the
 * standard invalid state plus the same fixed banner every other wrong-
 * password case in this app uses.
 *
 * On success, `admin-session-epoch` is bumped and this session's own admin
 * cookie dies with it (criterion 93): there is nothing to confirm, only
 * `router.refresh()` to let `/admin`'s server component notice the epoch has
 * moved and render the gate again — the redirect *is* the confirmation, per
 * the design system, so no success banner exists here.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Banner } from "./Banner";
import { buttonClasses } from "./Button";
import { Field } from "./Field";
import { EyeIcon } from "./icons";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { errorCodeOf } from "@/lib/ui/api-error";
import {
  ADMIN_PASSWORD_ASYMMETRY_LINE,
  ADMIN_PASSWORD_CONFIRM_FIELD_LABEL,
  ADMIN_PASSWORD_CURRENT_FIELD_LABEL,
  ADMIN_PASSWORD_INVALID_MESSAGE,
  ADMIN_PASSWORD_MISMATCH_MESSAGE,
  ADMIN_PASSWORD_NEW_FIELD_LABEL,
  ADMIN_PASSWORD_SAVE_BUSY_LABEL,
  ADMIN_PASSWORD_SAVE_LABEL,
  GENERIC_ERROR_MESSAGE,
  GENERIC_ERROR_TITLE,
  OFFLINE_MESSAGE,
  OFFLINE_TITLE,
  PASSWORD_FIELD_EMPTY_MESSAGE,
  PASSWORD_LENGTH_HELPER,
  SESSION_ENDED_MESSAGE,
  SESSION_ENDED_TITLE,
  TOO_MANY_TRIES_MESSAGE,
  TOO_MANY_TRIES_TITLE,
  WRONG_PASSWORD_MESSAGE,
  WRONG_PASSWORD_TITLE,
  hidePasswordAriaLabel,
  showPasswordAriaLabel,
} from "@/lib/ui/copy";

type FieldName = "current" | "new" | "confirm";

function RevealToggle({
  fieldLabel,
  shown,
  onToggle,
}: {
  fieldLabel: string;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? hidePasswordAriaLabel(fieldLabel) : showPasswordAriaLabel(fieldLabel)}
      className="inline-flex size-11 items-center justify-center text-text-muted"
    >
      <EyeIcon crossed={shown} />
    </button>
  );
}

export function AdminPasswordPanel() {
  const router = useRouter();
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shown, setShown] = useState<Record<FieldName, boolean>>({
    current: false,
    new: false,
    confirm: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [banner, setBanner] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(field: FieldName) {
    setShown((state) => ({ ...state, [field]: !state[field] }));
  }

  function clearFieldError(field: FieldName) {
    setFieldErrors((state) => {
      if (!(field in state)) return state;
      const updated = { ...state };
      delete updated[field];
      return updated;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (current.length === 0) {
      setFieldErrors({ current: PASSWORD_FIELD_EMPTY_MESSAGE });
      currentRef.current?.focus();
      return;
    }
    if (newPassword.length === 0) {
      setFieldErrors({ new: PASSWORD_FIELD_EMPTY_MESSAGE });
      newRef.current?.focus();
      return;
    }
    if (newPassword.length < NEW_PASSWORD_MIN_LENGTH) {
      setFieldErrors({ new: PASSWORD_LENGTH_HELPER });
      newRef.current?.focus();
      return;
    }
    if (confirm !== newPassword) {
      setFieldErrors({ confirm: ADMIN_PASSWORD_MISMATCH_MESSAGE });
      confirmRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setBanner(null);
    setSaving(true);

    try {
      const response = await fetch("/api/admin/password/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword,
          confirmPassword: confirm,
        }),
      });

      if (response.ok) {
        // Criterion 93: this session's own admin cookie is already dead.
        // Refreshing lets `/admin`'s server component re-check and render
        // the gate again — no local success state to show first.
        router.refresh();
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      const code = errorCodeOf(body);

      if (code === "invalid_credentials") {
        setFieldErrors({ current: WRONG_PASSWORD_TITLE });
        setBanner({ title: WRONG_PASSWORD_TITLE, message: WRONG_PASSWORD_MESSAGE });
        currentRef.current?.focus();
      } else if (code === "rate_limited") {
        setBanner({ title: TOO_MANY_TRIES_TITLE, message: TOO_MANY_TRIES_MESSAGE });
      } else if (code === "bad_request") {
        setBanner({ title: GENERIC_ERROR_TITLE, message: ADMIN_PASSWORD_INVALID_MESSAGE });
      } else if (code === "unauthorised") {
        setBanner({ title: SESSION_ENDED_TITLE, message: SESSION_ENDED_MESSAGE });
      } else {
        setBanner({ title: GENERIC_ERROR_TITLE, message: GENERIC_ERROR_MESSAGE });
      }
    } catch {
      setBanner({ title: OFFLINE_TITLE, message: OFFLINE_MESSAGE });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {banner ? (
        <Banner tone={banner.title === TOO_MANY_TRIES_TITLE ? "warn" : "error"} title={banner.title}>
          {banner.message}
        </Banner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          ref={currentRef}
          id="admin-password-current"
          name="admin-password-current"
          label={ADMIN_PASSWORD_CURRENT_FIELD_LABEL}
          type={shown.current ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={current}
          disabled={saving}
          hint={ADMIN_PASSWORD_ASYMMETRY_LINE}
          onChange={(event) => {
            setCurrent(event.target.value);
            clearFieldError("current");
          }}
          aria-invalid={fieldErrors.current ? true : undefined}
          aria-describedby={fieldErrors.current ? "admin-password-current-error" : undefined}
          trailing={
            <RevealToggle
              fieldLabel={ADMIN_PASSWORD_CURRENT_FIELD_LABEL}
              shown={shown.current}
              onToggle={() => toggle("current")}
            />
          }
        />
        {fieldErrors.current ? (
          <p
            id="admin-password-current-error"
            role="alert"
            className="text-sm font-bold text-error"
          >
            {fieldErrors.current}
          </p>
        ) : null}

        <Field
          ref={newRef}
          id="admin-password-new"
          name="admin-password-new"
          label={ADMIN_PASSWORD_NEW_FIELD_LABEL}
          type={shown.new ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={newPassword}
          disabled={saving}
          hint={PASSWORD_LENGTH_HELPER}
          onChange={(event) => {
            setNewPassword(event.target.value);
            clearFieldError("new");
          }}
          aria-invalid={fieldErrors.new ? true : undefined}
          aria-describedby={fieldErrors.new ? "admin-password-new-error" : undefined}
          trailing={
            <RevealToggle
              fieldLabel={ADMIN_PASSWORD_NEW_FIELD_LABEL}
              shown={shown.new}
              onToggle={() => toggle("new")}
            />
          }
        />
        {fieldErrors.new ? (
          <p id="admin-password-new-error" role="alert" className="text-sm font-bold text-error">
            {fieldErrors.new}
          </p>
        ) : null}

        <Field
          ref={confirmRef}
          id="admin-password-confirm"
          name="admin-password-confirm"
          label={ADMIN_PASSWORD_CONFIRM_FIELD_LABEL}
          type={shown.confirm ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={confirm}
          disabled={saving}
          onChange={(event) => {
            setConfirm(event.target.value);
            clearFieldError("confirm");
          }}
          aria-invalid={fieldErrors.confirm ? true : undefined}
          aria-describedby={fieldErrors.confirm ? "admin-password-confirm-error" : undefined}
          trailing={
            <RevealToggle
              fieldLabel={ADMIN_PASSWORD_CONFIRM_FIELD_LABEL}
              shown={shown.confirm}
              onToggle={() => toggle("confirm")}
            />
          }
        />
        {fieldErrors.confirm ? (
          <p
            id="admin-password-confirm-error"
            role="alert"
            className="text-sm font-bold text-error"
          >
            {fieldErrors.confirm}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving || undefined}
          className={buttonClasses("primary", { fullWidth: true })}
        >
          {saving ? ADMIN_PASSWORD_SAVE_BUSY_LABEL : ADMIN_PASSWORD_SAVE_LABEL}
        </button>
      </form>
    </div>
  );
}
