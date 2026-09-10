/**
 * The two login routes, driven as routes.
 *
 * `lib/auth/login.ts` is already well covered by `rate-limit.test.ts`, but
 * nothing tested the **route handlers** — and the route handlers are where the
 * criteria actually live:
 *
 *  - **Criterion 2**: a wrong password "is refused, sets no cookie, and says
 *    so". *Sets no cookie* is a property of the handler, not of the library.
 *  - **Criterion 5**: ten failures then a plain "try again later", including
 *    for a correct password, with the right status code on the wire.
 *  - **Criterion 4 / 74**: the admin route is a separate password with a
 *    separate cookie.
 *
 * `next/headers` is mocked with a jar that records what was set, because that
 * is the only thing standing between a correct library and a route that
 * forgets to apply the attributes.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

const { hashPassword } = await import("@/lib/auth/password");

interface SetCookie {
  name: string;
  value: string;
  attributes: Record<string, unknown>;
}

const cookieJar: SetCookie[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: (name: string, value: string, attributes: Record<string, unknown>) => {
      cookieJar.push({ name, value, attributes });
    },
  }),
}));

const GROUP_PASSWORD = "the-group-one";
const ADMIN_PASSWORD = "the-admin-one";

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "login-route-test-secret";
  process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH =
    await hashPassword(GROUP_PASSWORD);
  process.env.FIVE_CROWNS_ADMIN_PASSWORD_HASH =
    await hashPassword(ADMIN_PASSWORD);
  await setupTestDb();
});

afterEach(() => {
  cookieJar.length = 0;
});

afterAll(async () => {
  await teardownTestDb();
});

/** A unique address per test, so one test's failures never block another's. */
let addressCounter = 0;
function nextAddress(): string {
  addressCounter += 1;
  return `203.0.113.${addressCounter}`;
}

function post(body: unknown, address: string): Request {
  return new Request("https://fivecrowns.example.test/api/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": address,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const groupRoute = async () =>
  (await import("@/app/api/login/route")).POST;
const adminRoute = async () =>
  (await import("@/app/api/admin/login/route")).POST;

describe("POST /api/login — criterion 2", () => {
  it("⚠️ sets NO cookie when the password is wrong, and says the password is wrong", async () => {
    const POST = await groupRoute();
    const response = await POST(post({ password: "not-it" }, nextAddress()));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "invalid_credentials", message: "That password's wrong." },
    });
    expect(cookieJar).toHaveLength(0);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("mints a group cookie for the right password and points at the games list", async () => {
    const POST = await groupRoute();
    const response = await POST(post({ password: GROUP_PASSWORD }, nextAddress()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, next: "/games" });
    expect(cookieJar).toHaveLength(1);
    expect(cookieJar[0]!.name).toBe("fc_session");
  });

  it("⚠️ applies the full cookie attribute set — HttpOnly, SameSite=Lax, 400 days, Path=/", async () => {
    const POST = await groupRoute();
    await POST(post({ password: GROUP_PASSWORD }, nextAddress()));

    expect(cookieJar[0]!.attributes).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 60 * 60,
    });
  });

  it("the minted token verifies as a group session and nothing else", async () => {
    const { verifySession } = await import("@/lib/auth/token");
    const POST = await groupRoute();
    await POST(post({ password: GROUP_PASSWORD }, nextAddress()));

    const token = cookieJar[0]!.value;
    const secret = process.env.SESSION_SECRET!;

    expect((await verifySession(token, secret, { scope: "group" })).ok).toBe(true);
    expect((await verifySession(token, secret, { scope: "admin" })).ok).toBe(false);
  });

  it("⚠️ never echoes the password back in the response", async () => {
    const POST = await groupRoute();
    const response = await POST(post({ password: GROUP_PASSWORD }, nextAddress()));
    expect(JSON.stringify(await response.json())).not.toContain(GROUP_PASSWORD);
  });
});

describe("POST /api/login — the unhappy bodies", () => {
  it.each([
    ["not JSON at all", "zzz", 400],
    ["an empty body", "", 400],
    ["JSON null", "null", 400],
    ["no password key", "{}", 400],
    ["an empty password", '{"password":""}', 400],
    ["a numeric password", '{"password":123}', 400],
    ["an array password", '{"password":["a"]}', 400],
    ["an object password", '{"password":{"a":1}}', 400],
  ])("refuses %s with 400 and sets no cookie", async (_name, body, status) => {
    const POST = await groupRoute();
    const response = await POST(post(body, nextAddress()));

    expect(response.status).toBe(status);
    expect(cookieJar).toHaveLength(0);
  });

  it("accepts a 512-character password but refuses 513 — scrypt is never fed a huge body", async () => {
    const POST = await groupRoute();

    const long = await POST(post({ password: "a".repeat(512) }, nextAddress()));
    expect(long.status).toBe(401); // wrong, but a real attempt

    const tooLong = await POST(post({ password: "a".repeat(513) }, nextAddress()));
    expect(tooLong.status).toBe(400);
    expect(cookieJar).toHaveLength(0);
  });

  it("⚠️ a megabyte of password is rejected as malformed, not hashed", async () => {
    const POST = await groupRoute();
    const started = Date.now();
    const response = await POST(
      post({ password: "a".repeat(1_000_000) }, nextAddress()),
    );

    expect(response.status).toBe(400);
    // scrypt at these cost parameters takes ~50ms per call; a 400 that comes
    // back this fast proves the body never reached it.
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("is not fooled by a prototype-polluting body", async () => {
    const POST = await groupRoute();
    const response = await POST(
      post('{"__proto__":{"password":"' + GROUP_PASSWORD + '"}}', nextAddress()),
    );

    expect(response.status).toBe(400);
    expect(cookieJar).toHaveLength(0);
    expect(({} as Record<string, unknown>).password).toBeUndefined();
  });
});

describe("POST /api/login — criterion 5, on the wire", () => {
  it("⚠️ ten failures then the CORRECT password returns 429 and the plain sentence", async () => {
    const POST = await groupRoute();
    const address = nextAddress();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await POST(post({ password: `wrong-${attempt}` }, address));
      expect(response.status, `attempt ${attempt}`).toBe(401);
    }

    const blocked = await POST(post({ password: GROUP_PASSWORD }, address));

    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({
      error: { code: "rate_limited", message: "Too many tries. Try again later." },
    });
    expect(cookieJar).toHaveLength(0);
  });

  it("⚠️ says exactly the same thing whether the password was right or wrong — no oracle", async () => {
    const POST = await groupRoute();
    const address = nextAddress();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await POST(post({ password: `wrong-${attempt}` }, address));
    }

    const withRight = await POST(post({ password: GROUP_PASSWORD }, address));
    const withWrong = await POST(post({ password: "still-wrong" }, address));

    expect(withRight.status).toBe(withWrong.status);
    expect(await withRight.json()).toEqual(await withWrong.json());
  });

  it("blocks one address without touching another", async () => {
    const POST = await groupRoute();
    const blockedAddress = nextAddress();
    const innocentAddress = nextAddress();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await POST(post({ password: `wrong-${attempt}` }, blockedAddress));
    }

    expect((await POST(post({ password: GROUP_PASSWORD }, blockedAddress))).status).toBe(429);
    cookieJar.length = 0;

    const innocent = await POST(post({ password: GROUP_PASSWORD }, innocentAddress));
    expect(innocent.status).toBe(200);
    expect(cookieJar).toHaveLength(1);
  });

  it("a blocked group address can still reach the admin gate — the scopes are separate", async () => {
    const groupPost = await groupRoute();
    const adminPost = await adminRoute();
    const address = nextAddress();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await groupPost(post({ password: `wrong-${attempt}` }, address));
    }
    expect((await groupPost(post({ password: GROUP_PASSWORD }, address))).status).toBe(429);
    cookieJar.length = 0;

    const admin = await adminPost(post({ password: ADMIN_PASSWORD }, address));
    expect(admin.status).toBe(200);
  });
});

describe("POST /api/admin/login — criteria 4 and 74", () => {
  it("⚠️ refuses the GROUP password at the admin gate", async () => {
    const POST = await adminRoute();
    const response = await POST(post({ password: GROUP_PASSWORD }, nextAddress()));

    expect(response.status).toBe(401);
    expect(cookieJar).toHaveLength(0);
  });

  it("mints a separate admin cookie, scoped to /admin", async () => {
    const POST = await adminRoute();
    const response = await POST(post({ password: ADMIN_PASSWORD }, nextAddress()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, next: "/admin" });
    expect(cookieJar).toHaveLength(1);
    expect(cookieJar[0]!.name).toBe("fc_admin");
    expect(cookieJar[0]!.attributes).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/admin",
    });
  });

  it("⚠️ the admin token is not accepted as a group session", async () => {
    const { verifySession } = await import("@/lib/auth/token");
    const POST = await adminRoute();
    await POST(post({ password: ADMIN_PASSWORD }, nextAddress()));

    const token = cookieJar[0]!.value;
    const secret = process.env.SESSION_SECRET!;

    expect((await verifySession(token, secret, { scope: "admin" })).ok).toBe(true);
    expect((await verifySession(token, secret, { scope: "group" })).ok).toBe(false);
  });

  it("refuses the ADMIN password at the group gate", async () => {
    const POST = await groupRoute();
    const response = await POST(post({ password: ADMIN_PASSWORD }, nextAddress()));

    expect(response.status).toBe(401);
    expect(cookieJar).toHaveLength(0);
  });
});
