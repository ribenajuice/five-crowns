#!/usr/bin/env node
/**
 * Generate a scrypt hash for one of the two passwords.
 *
 *   node scripts/hash-password.js            # prompts, hides what you type
 *   echo -n 'the password' | node scripts/hash-password.js
 *
 * ⚠️ **No AWS, no app, no network.** That is the point: this is both the
 * first-time setup path and the documented way back in if the admin password is
 * forgotten, so it has to work with nothing but Node
 * (docs/ARCHITECTURE.md § Lockout recovery).
 *
 * Then write the hash straight into Parameter Store:
 *
 *   aws ssm put-parameter --region ap-southeast-2 --overwrite \
 *     --type SecureString --name /five-crowns/prod/group-password-hash \
 *     --value '<hash>'
 *
 * ⚠️ Deliberately dependency-free and deliberately **not** importing
 * `lib/auth/password.ts`: that file is TypeScript and this script must run with
 * a bare `node`. The two are kept in step by `tests/auth/hash-password.test.ts`,
 * which runs this script and verifies its output with the app's own verifier.
 */

import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";
import process from "node:process";

const N = 16_384;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_BYTES = 16;

function hash(plaintext) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(SALT_BYTES);
    scrypt(
      plaintext.normalize("NFKC"),
      salt,
      KEYLEN,
      { N, r: R, p: P, maxmem: 256 * 1024 * 1024 },
      (error, derived) => {
        if (error) return reject(error);
        resolve(
          ["scrypt", N, R, P, salt.toString("base64"), derived.toString("base64")].join("$"),
        );
      },
    );
  });
}

function readFromStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
    process.stdin.on("error", reject);
  });
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });

    // Hide what is typed. There is no reason for a password to sit in a
    // terminal's scrollback.
    const output = rl.output;
    rl.output = {
      write(chunk) {
        if (chunk.includes(question)) output.write(chunk);
      },
    };

    rl.question(question, (answer) => {
      rl.output = output;
      output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const plaintext = process.stdin.isTTY
    ? await prompt("Password: ")
    : await readFromStdin();

  if (!plaintext) {
    process.stderr.write("Nothing typed. Nothing to hash.\n");
    process.exit(1);
  }

  const value = await hash(plaintext);

  // The hash on stdout so it can be piped; everything else on stderr.
  process.stdout.write(`${value}\n`);

  if (process.stdin.isTTY) {
    process.stderr.write(
      "\nWrite it to Parameter Store, choosing the parameter you meant:\n" +
        "  aws ssm put-parameter --region ap-southeast-2 --overwrite --type SecureString \\\n" +
        "    --name /five-crowns/prod/group-password-hash --value '<the hash above>'\n" +
        "    --name /five-crowns/prod/admin-password-hash  (the other one)\n\n" +
        "The plaintext is not stored anywhere. If you forget it, set a new one.\n",
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
