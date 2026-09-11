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

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { setupTestDb, teardownTestDb } from "../helpers/db";

const { hashPassword } = await import("@/lib/auth/password");

interface SetCookie {
  name: string;
  value: string;
  attributes: Record<string, unknown>;
}

const cookieJar: SetCookie[] = [];
/** What the browser sent. The admin route needs a current group session. */
const requestCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      requestCookies.has(name)
        ? { name, value: requestCookies.get(name)! }
        : undefined,
    set: (name: string, value: string, attributes: Record<string, unknown>) => {
      cookieJar.push({ name, value, attributes });
    },
  }),
}));

const GROUP_PASSWORD = "the-group-one";
const ADMIN_PASSWORD = "the-admin-one";
const GROUP_EPOCH_ENV = "FIVE_CROWNS_GROUP_SESSION_EPOCH";

let groupSessionToken: string;

beforeAll(async () => {
  process.env.CONFIG_SOURCE = "env";
  process.env.SESSION_SECRET = "login-route-test-secret";
  process.env.FIVE_CROWNS_GROUP_PASSWORD_HASH =
    await hashPassword(GROUP_PASSWORD);
  process.env.FIVE_CROWNS_ADMIN_PASSWORD_HASH =
    await hashPassword(ADMIN_PASSWORD);
  delete process.env[GROUP_EPOCH_ENV];
  const { signSession } = await import("@/lib/auth/token");
  groupSessionToken = await signSession(
    { s: "group", v: 0 },
    process.env.SESSION_SECRET,
  );
  await setupTestDb();
});

beforeEach(() => {
  requestCookies.clear();
  requestCookies.set("fc_session", groupSessionToken);
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

function post(
  body: unknown,
  address: string,
  extraHeaders: Record<string, string> = {},
  url = "https://fivecrowns.example.test/api/login",
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": address,
      ...extraHeaders,
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

describe("POST /api/admin/login — the full group check comes first", () => {
  it("⚠️ refuses a device whose group cookie was revoked by a rotation, even with the right admin password", async () => {
    const { invalidateAllParameters } = await import("@/lib/config");
    process.env[GROUP_EPOCH_ENV] = "1"; // the rotation bumped the epoch
    invalidateAllParameters();

    try {
      const POST = await adminRoute();
      const response = await POST(post({ password: ADMIN_PASSWORD }, nextAddress()));

      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorised");
      expect(cookieJar).toHaveLength(0);
    } finally {
      delete process.env[GROUP_EPOCH_ENV];
      invalidateAllParameters();
    }
  });

  it("refuses a caller with no group cookie at all", async () => {
    requestCookies.clear();
    const POST = await adminRoute();
    const response = await POST(post({ password: ADMIN_PASSWORD }, nextAddress()));

    expect(response.status).toBe(401);
    expect(cookieJar).toHaveLength(0);
  });

  it("a revoked device's guesses are not even counted — it cannot burn the admin limit", async () => {
    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    requestCookies.clear();
    const POST = await adminRoute();
    const address = nextAddress();

    for (let i = 0; i < 12; i += 1) {
      await POST(post({ password: `wrong-${i}` }, address));
    }
    expect((await checkRateLimit(address, "admin")).failures).toBe(0);
  });
});

describe("both login routes — no cross-site posts", () => {
  const routes = [
    ["POST /api/login", groupRoute, GROUP_PASSWORD],
    ["POST /api/admin/login", adminRoute, ADMIN_PASSWORD],
  ] as const;

  for (const [name, route, password] of routes) {
    it.each([
      ["text/plain", "text/plain"],
      ["a urlencoded form", "application/x-www-form-urlencoded"],
      ["multipart", "multipart/form-data; boundary=x"],
      ["no content type", ""],
    ])(`${name} refuses %s with 415`, async (_label, contentType) => {
      const POST = await route();
      const request = new Request("https://fivecrowns.example.test/api/login", {
        method: "POST",
        headers: contentType ? { "content-type": contentType } : {},
        body: JSON.stringify({ password }),
      });
      if (!contentType) request.headers.delete("content-type");

      const response = await POST(request);
      expect(response.status).toBe(415);
      expect(cookieJar).toHaveLength(0);
    });

    it(`⚠️ ${name}: fifteen hostile text/plain posts do not use up the household's attempts`, async () => {
      const POST = await route();
      const address = nextAddress();

      for (let i = 0; i < 15; i += 1) {
        const response = await POST(
          post(`{"password":"wrong-${i}"}`, address, { "content-type": "text/plain" }),
        );
        expect(response.status).toBe(415);
      }
      expect((await POST(post({ password }, address))).status).toBe(200);
    });

    it(`${name} accepts application/json with a charset`, async () => {
      const POST = await route();
      const response = await POST(
        post({ password }, nextAddress(), {
          "content-type": "application/json; charset=utf-8",
        }),
      );
      expect(response.status).toBe(200);
    });

    it.each([
      ["another site", "https://evil.example"],
      ["a look-alike subdomain", "https://fivecrowns.example.test.evil.example"],
      ["the opaque null origin", "null"],
    ])(`${name} refuses an Origin from %s with 403`, async (_label, origin) => {
      const POST = await route();
      const response = await POST(
        post({ password }, nextAddress(), { origin }),
      );
      expect(response.status).toBe(403);
      expect(cookieJar).toHaveLength(0);
    });

    it(`${name} accepts its own origin, as the real login page sends it`, async () => {
      const POST = await route();
      const response = await POST(
        post({ password }, nextAddress(), {
          origin: "https://fivecrowns.example.test",
          host: "fivecrowns.example.test",
        }),
      );
      expect(response.status).toBe(200);
    });

    it(`${name} accepts its own origin behind CloudFront, where Host is the Lambda's`, async () => {
      const POST = await route();
      const response = await POST(
        post(
          { password },
          nextAddress(),
          {
            origin: "https://fivecrowns.example.test",
            host: "abc123.lambda-url.ap-southeast-2.on.aws",
            "x-forwarded-host": "fivecrowns.example.test",
          },
          "https://abc123.lambda-url.ap-southeast-2.on.aws/api/login",
        ),
      );
      expect(response.status).toBe(200);
    });

    it(`${name} refuses a hostile Origin behind CloudFront too`, async () => {
      const POST = await route();
      const response = await POST(
        post(
          { password },
          nextAddress(),
          {
            origin: "https://evil.example",
            host: "abc123.lambda-url.ap-southeast-2.on.aws",
            "x-forwarded-host": "fivecrowns.example.test",
          },
          "https://abc123.lambda-url.ap-southeast-2.on.aws/api/login",
        ),
      );
      expect(response.status).toBe(403);
    });
  }
});

describe("POST /api/login — the limiter cannot be dodged", () => {
  it("⚠️ rotating the left-most X-Forwarded-For entry still hits the same bucket", async () => {
    const POST = await groupRoute();
    const real = nextAddress();

    for (let i = 1; i <= 15; i += 1) {
      const response = await POST(
        post({ password: `wrong-${i}` }, `10.0.0.${i}, ${real}`),
      );
      expect(response.status, `attempt ${i}`).toBe(i <= 10 ? 401 : 429);
    }
  });

  it("⚠️ prepending a fake entry does not let the right password out of a block", async () => {
    const POST = await groupRoute();
    const real = nextAddress();

    for (let i = 1; i <= 10; i += 1) {
      await POST(post({ password: `wrong-${i}` }, real));
    }
    const escaped = await POST(post({ password: GROUP_PASSWORD }, `198.18.0.1, ${real}`));
    expect(escaped.status).toBe(429);
    expect(cookieJar).toHaveLength(0);
  });

  it("⚠️ rotating X-Forwarded-For entirely changes nothing when CloudFront names the viewer", async () => {
    const POST = await groupRoute();
    const viewer = "2001:db8::77:51234";

    for (let i = 1; i <= 10; i += 1) {
      await POST(
        post({ password: `wrong-${i}` }, `10.1.0.${i}`, {
          "cloudfront-viewer-address": viewer,
        }),
      );
    }
    const blocked = await POST(
      post({ password: GROUP_PASSWORD }, "10.1.0.200", {
        "cloudfront-viewer-address": viewer,
      }),
    );
    expect(blocked.status).toBe(429);
  });

  it("⚠️ 30 concurrent wrong passwords: at most 10 are evaluated, the rest get 429, then the right one gets 429", async () => {
    const POST = await groupRoute();
    const address = nextAddress();

    const responses = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        POST(post({ password: `wrong-${i}` }, address)),
      ),
    );
    const statuses = responses.map((r) => r.status);
    const evaluated = statuses.filter((s) => s === 401).length;
    const refused = statuses.filter((s) => s === 429).length;

    expect(evaluated).toBeLessThanOrEqual(10);
    expect(evaluated + refused).toBe(30);

    const right = await POST(post({ password: GROUP_PASSWORD }, address));
    expect(right.status).toBe(429);
    expect(cookieJar).toHaveLength(0);
  });
});
