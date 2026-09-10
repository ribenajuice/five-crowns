import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
