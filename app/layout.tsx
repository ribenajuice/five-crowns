import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

import "./globals.css";

/**
 * The one webfont (docs/DESIGN-SYSTEM.md § Type). `next/font/google` downloads
 * it at build time and serves it from our own origin, so no request ever goes
 * to Google from a visitor's browser. Weight 700, Latin subset only.
 */
const fraunces = Fraunces({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "Five Crowns Ledger",
  description: "The record of every game night.",
  // ⚠️ Nothing of the record is readable without the password, and search
  // engines are the first thing the gate exists to keep out.
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}
