/**
 * HMAC-SHA256 of a string, hex-encoded.
 *
 * Shared by every place in the app that needs a keyed digest but not a signed,
 * structured token (see `lib/auth/token.ts` for that) — the local photo
 * driver's dev URL signatures (`lib/photos/local-url.ts`) and the rate
 * limiter's IP hash (`lib/auth/ip-hash.ts`). Each caller derives its own key
 * and decides its own output length; this just does the digest.
 *
 * Web Crypto so it works in every runtime the app has.
 */

export async function hmacHex(text: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
