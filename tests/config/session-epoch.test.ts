/**
 * `bumpSessionEpoch` — the up-to-60-second staleness window closed by reading
 * the live parameter value before incrementing, rather than the cached one
 * `sessionEpoch` would otherwise serve.
 *
 * `env` mode's `readParameter` falls back to `process.env` directly, so a
 * plain env-var mutation (bypassing `putParameter`, which always invalidates
 * this process's own cache) stands in for "the real store moved behind this
 * cache's back" — the exact shape of the race: a different container already
 * bumped the epoch, and this one's 60-second-old cached read has not caught
 * up yet.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";

const ENV_VAR = "FIVE_CROWNS_GROUP_SESSION_EPOCH";

beforeAll(() => {
  process.env.CONFIG_SOURCE = "env";
});

afterEach(async () => {
  delete process.env[ENV_VAR];
  const { invalidateAllParameters, resetLocalParameterOverrides } = await import(
    "@/lib/config"
  );
  invalidateAllParameters();
  resetLocalParameterOverrides();
});

describe("bumpSessionEpoch", () => {
  it("reads the live value rather than a stale cached one", async () => {
    const { sessionEpoch, bumpSessionEpoch } = await import("@/lib/config");

    process.env[ENV_VAR] = "3";
    // Primes the 60-second cache with 3 — as `sessionEpoch` alone would be
    // read by anything else in this container (a login, a status check).
    expect(await sessionEpoch("group")).toBe(3);

    // The store moves behind this cache's back — standing in for a second
    // container (or a second in-flight rotation) whose write already landed.
    process.env[ENV_VAR] = "9";

    // Proves the cache really is stale: an ordinary cached read still says 3.
    expect(await sessionEpoch("group")).toBe(3);

    // ⚠️ The fix under test: bumping reads live (9), not the stale cache (3),
    // so it advances to 10 — past the concurrent write — not 4, which would
    // have silently undone it.
    expect(await bumpSessionEpoch("group")).toBe(10);
  });

  it("still increments correctly from a cold cache", async () => {
    const { bumpSessionEpoch } = await import("@/lib/config");

    expect(await bumpSessionEpoch("admin")).toBe(1);
    expect(await bumpSessionEpoch("admin")).toBe(2);
    expect(await bumpSessionEpoch("admin")).toBe(3);
  });
});
