/**
 * HMAC of a caller's address, for the rate limiter's key.
 *
 * ⚠️ The raw address never reaches the database. Keyed with the session secret
 * so the hashes are not reversible with a rainbow table of the IPv4 space,
 * which an unkeyed SHA-256 would be in an afternoon.
 *
 * Web Crypto so it works in every runtime the app has.
 */

import { SESSION_SECRET_ENV } from "@/lib/config/parameters";

export async function hashIp(ip: string): Promise<string> {
  const secret = process.env[SESSION_SECRET_ENV] ?? "";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || "five-crowns-unkeyed"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ip),
  );

  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
