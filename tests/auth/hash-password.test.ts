import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseHash, verifyPassword } from "@/lib/auth/password";

const SCRIPT = fileURLToPath(
  new URL("../../scripts/hash-password.js", import.meta.url),
);

function runScript(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => (stderr += chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`exit ${code}: ${stderr}`));
    });

    child.stdin.write(password);
    child.stdin.end();
  });
}

describe("scripts/hash-password.js", () => {
  it("produces a hash the app can verify", async () => {
    // ⚠️ This is the anti-drift test. The script is deliberately standalone —
    // no TypeScript, no imports, so it works during a lockout with nothing but
    // node — which means nothing else stops the two implementations diverging.
    const hash = await runScript("a-password-for-the-group");

    expect(parseHash(hash)).toMatchObject({ N: 16384, r: 8, p: 1 });
    await expect(
      verifyPassword("a-password-for-the-group", hash),
    ).resolves.toBe(true);
    await expect(verifyPassword("something-else", hash)).resolves.toBe(false);
  }, 30_000);

  it("never prints the plaintext", async () => {
    const hash = await runScript("plaintext-should-not-appear");
    expect(hash).not.toContain("plaintext-should-not-appear");
  }, 30_000);

  it("refuses an empty password", async () => {
    await expect(runScript("")).rejects.toThrow(/exit 1/);
  }, 30_000);
});
