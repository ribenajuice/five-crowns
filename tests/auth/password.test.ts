import { describe, expect, it } from "vitest";

import {
  hashPassword,
  parseHash,
  PasswordHashError,
  verifyPassword,
} from "@/lib/auth/password";

describe("hashPassword", () => {
  it("round-trips the right password", async () => {
    const stored = await hashPassword("the-shared-one");
    await expect(verifyPassword("the-shared-one", stored)).resolves.toBe(true);
  });

  it("refuses the wrong password", async () => {
    const stored = await hashPassword("the-shared-one");
    await expect(verifyPassword("the-shared-two", stored)).resolves.toBe(false);
    await expect(verifyPassword("", stored)).resolves.toBe(false);
  });

  it("never stores the plaintext", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    expect(stored).not.toContain("correct-horse-battery-staple");
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    await expect(verifyPassword("same", a)).resolves.toBe(true);
    await expect(verifyPassword("same", b)).resolves.toBe(true);
  });

  it("records its cost parameters, so they can be raised later", async () => {
    const stored = await hashPassword("x");
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(parseHash(stored)).toMatchObject({ N: 16384, r: 8, p: 1 });
  });

  it("normalises unicode, so the same typed password always matches", async () => {
    // U+00E9 vs e + U+0301 — identical on screen, different bytes.
    const stored = await hashPassword("café");
    await expect(verifyPassword("café", stored)).resolves.toBe(true);
  });

  it("refuses to hash an empty password", async () => {
    await expect(hashPassword("")).rejects.toThrow(PasswordHashError);
  });
});

describe("verifyPassword — malformed stored hashes lock people out, never in", () => {
  const malformed = [
    "",
    "not-a-hash",
    "scrypt$16384$8$1$onlyfourparts",
    "bcrypt$16384$8$1$c2FsdA==$aGFzaA==",
    "scrypt$0$8$1$c2FsdA==$aGFzaA==",
    "scrypt$16384$8$1$$aGFzaA==",
    "scrypt$16384$8$1$c2FsdA==$",
  ];

  for (const stored of malformed) {
    it(`returns false for ${JSON.stringify(stored)}`, async () => {
      expect(parseHash(stored)).toBeNull();
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    });
  }
});
