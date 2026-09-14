/**
 * Small inline SVGs shared by a few components. No icon font, per
 * docs/DESIGN-SYSTEM.md hard rules.
 */

export function WarningTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`mt-0.5 shrink-0 ${className ?? ""}`}
    >
      <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M3 6l4.5 4L12 4l4.5 6L21 6l-2 12H5L3 6Z" />
    </svg>
  );
}

/**
 * The reveal/hide toggle for a masked field — shared by the API-key panel and
 * every password-change form (docs/DESIGN-SYSTEM.md: "a show/hide toggle in
 * its existing `trailing` slot — no new control").
 */
export function EyeIcon({ crossed, className }: { crossed: boolean; className?: string }) {
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
      className={className}
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

/** Delete-game / delete-permanently buttons (docs/DESIGN-SYSTEM.md § "Deleting
 *  a game": "ghost shape with --error ink and a trash icon"). */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/** `RenameControl` (place row) — docs/DESIGN-SYSTEM.md § "Places index, and
 *  renaming a location": a 44×44 pencil `IconButton`. */
export function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Merge (player/place) — docs/DESIGN-SYSTEM.md § "Merging two players":
 * reused for `PlaceRowActions`' merge row and every "Merge permanently"
 * destructive button, the same converging-arrows-then-down glyph the mockup
 * uses in both places.
 */
export function MergeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 4l7 7M20 4l-7 7M12 11v9" />
    </svg>
  );
}

/** `IndexNav` — criterion 174, one glyph per tile. */
export function PlayersIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 13.2c2.7.3 5 2.5 5 5.3" />
    </svg>
  );
}

export function RostersIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="3" y="4" width="13" height="9" rx="2" />
      <rect x="7" y="11" width="13" height="9" rx="2" />
    </svg>
  );
}

export function PlacesIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

/**
 * `RecordCard`'s tap affordance (docs/DESIGN-SYSTEM.md § "the records board"):
 * "a small chevron is the only visual affordance" — the card's own
 * `aria-label` is what actually tells a screen reader it's tappable, so this
 * glyph is purely decorative (`aria-hidden`).
 */
export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The worst-hand marker (`HandTrendBars`, `VillainsTable` — M3 Stage 3,
 * criteria 226, 239, 247): a filled star, always paired with bold,
 * `--accent-ink`-coloured text — three signals together, never colour alone.
 */
export function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.1-6.3-4.4-6.3 4.4 2.3-7.1-6-4.4h7.6z" />
    </svg>
  );
}

export function CameraIcon({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
