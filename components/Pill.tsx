/**
 * `Pill` — docs/DESIGN-SYSTEM.md § Component inventory. A status chip; never
 * the only signal on its own (paired with a border/tint/icon where it matters).
 */

export type PillTone = "neutral" | "new" | "warn" | "err" | "ok";

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: "bg-sunk text-text-muted",
  new: "bg-warn-soft text-warn",
  warn: "bg-warn-soft text-warn",
  err: "bg-error-soft text-error",
  ok: "bg-success-soft text-success",
};

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold uppercase tracking-label ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
