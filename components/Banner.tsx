/**
 * `Banner` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * Bold first line says what happened, second line says what to do. Each tone
 * pairs its soft tint only with its own semantic colour, and carries an icon
 * so colour is never the only signal.
 */

export type BannerTone = "error" | "warn" | "ok";

const TONE_CLASSES: Record<BannerTone, string> = {
  error: "border-error bg-error-soft text-error",
  warn: "border-warn bg-warn-soft text-warn",
  ok: "border-success bg-success-soft text-success",
};

function BannerIcon({ tone }: { tone: BannerTone }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className: "mt-0.5 shrink-0",
  };

  if (tone === "ok") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" />
        <path d="m7.5 12.5 3 3 6-6.5" />
      </svg>
    );
  }

  if (tone === "warn") {
    // A clock: "not now", rather than "you did something wrong".
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v6" />
      <path d="M12 16.75v.01" />
    </svg>
  );
}

interface BannerProps {
  tone: BannerTone;
  /** What happened. Rendered bold. */
  title: string;
  /** What to do about it. */
  children: React.ReactNode;
  id?: string;
}

export function Banner({ tone, title, children, id }: BannerProps) {
  return (
    <div
      id={id}
      role="alert"
      className={`flex gap-2 rounded-[var(--radius)] border px-3 py-3 ${TONE_CLASSES[tone]}`}
    >
      <BannerIcon tone={tone} />
      <div>
        <p className="font-bold">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}
