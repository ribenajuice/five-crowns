/**
 * `/admin` checks the group session in full — epoch included — before it shows
 * the admin prompt.
 *
 * ⚠️ Security review finding: middleware verifies only the group cookie's
 * signature, so a device logged out by a group-password rotation (epoch bump)
 * still reached the admin prompt and could try admin passwords.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GROUP_COOKIE } from "@/lib/auth/cookies";
import { signSession } from "@/lib/auth/token";

const hoisted = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super("NEXT_REDIRECT");
    }
  }
  return { RedirectError, jar: new Map<string, string>() };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      hoisted.jar.has(name) ? { name, value: hoisted.jar.get(name)! } : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new hoisted.RedirectError(url);
  },
}));

// Client components are not under test; stand-ins keep React out of it.
vi.mock("@/components/PasswordGate", () => ({ PasswordGate: () => null }));
vi.mock("@/components/AppBar", () => ({ AppBar: () => null }));

const SECRET = "admin-page-test-secret";
const EPOCH_ENV = "FIVE_CROWNS_GROUP_SESSION_EPOCH";

let currentToken: string;
let staleToken: string;

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = SECRET;
  process.env[EPOCH_ENV] = "3";
  currentToken = await signSession({ s: "group", v: 3 }, SECRET);
  staleToken = await signSession({ s: "group", v: 2 }, SECRET);
});

beforeEach(async () => {
  hoisted.jar.clear();
  const { invalidateAllParameters } = await import("@/lib/config");
  invalidateAllParameters();
});

const render = async () => (await import("@/app/admin/page")).default();

describe("/admin — the full group check comes first", () => {
  it("⚠️ sends a device with a revoked (old-epoch) group cookie to /login", async () => {
    hoisted.jar.set(GROUP_COOKIE, staleToken);
    await expect(render()).rejects.toMatchObject({ url: "/login" });
  });

  it("sends a device with no group cookie to /login", async () => {
    await expect(render()).rejects.toMatchObject({ url: "/login" });
  });

  it("shows a current group session the admin prompt — and only the prompt", async () => {
    hoisted.jar.set(GROUP_COOKIE, currentToken);
    const element = (await render()) as { props: Record<string, unknown> };
    expect(element.props.action).toBe("/api/admin/login");
  });
});
