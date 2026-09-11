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
