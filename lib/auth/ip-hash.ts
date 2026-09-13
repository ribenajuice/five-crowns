/**
 * HMAC of a caller's address, for the rate limiter's key.
 *
 * ⚠️ The raw address never reaches the database. Keyed with the session secret
 * so the hashes are not reversible with a rainbow table of the IPv4 space,
 * which an unkeyed SHA-256 would be in an afternoon.
 *
 * Web Crypto so it works in every runtime the app has.
 */

import { hmacHex } from "@/lib/crypto/hmac-hex";
import { SESSION_SECRET_ENV } from "@/lib/config/parameters";

export async function hashIp(ip: string): Promise<string> {
  const secret = process.env[SESSION_SECRET_ENV] ?? "";
  const digest = await hmacHex(ip, secret || "five-crowns-unkeyed");
  return digest.slice(0, 32);
}
