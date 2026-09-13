/**
 * `Button` — docs/DESIGN-SYSTEM.md § Component inventory.
 *
 * 48px tall; `primary` (brand fill), `ghost` (outline), `accent`
 * (camera/re-read). Full width on phone. A link that looks like a button is
 * `ButtonLink`; it is still a real `<a>`, so it navigates without JavaScript.
 */

import Link from "next/link";

export type ButtonVariant = "primary" | "ghost" | "accent";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand",
  ghost: "border border-brand bg-transparent text-brand",
  accent: "bg-accent text-on-brand",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  { fullWidth = false }: { fullWidth?: boolean } = {},
): string {
  return [
    "inline-flex h-12 items-center justify-center rounded-[var(--radius)] px-4 text-base font-bold no-underline",
    "disabled:opacity-60",
    fullWidth ? "w-full" : "w-full sm:w-auto",
    VARIANT_CLASSES[variant],
  ].join(" ");
}

/**
 * The one-off destructive variant, not a fourth `Button` kind
 * (docs/DESIGN-SYSTEM.md § "Deleting a game", reusing `CellEditor`'s existing
 * "Delete this line" treatment): `ghost` shape, `--error` ink, always paired
 * with a leading icon (`TrashIcon`) by the caller. Exported so every
 * destructive button in the app shares one definition. Always full width —
 * both current call sites (`GameActions`, `DeleteGameCard`) want that, and
 * this project's own convention is not to carry a parameter with no caller.
 */
export function destructiveButtonClasses(): string {
  return [
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-error px-4 text-base font-bold text-error no-underline",
    "disabled:opacity-60",
  ].join(" ");
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  fullWidth,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, { fullWidth })}>
      {children}
    </Link>
  );
}
