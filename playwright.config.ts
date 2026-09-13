import { defineConfig, devices } from "@playwright/test";

/**
 * The Stage 5 accessibility/responsive audit harness (`docs/DECISIONS.md`,
 * "Criterion 73 is verified by a local Playwright audit, not jsdom and not in
 * CI"). Local and on-demand only — **not** wired into `.github/workflows/ci.yml`.
 *
 * Run with `npm run audit:a11y` against a production build (`npm run build &&
 * npm run start`) pointed at a scratch database — never against a developer's
 * `.env.local` database and never against production. Point it at a running
 * server with `AUDIT_BASE_URL` (defaults to `http://localhost:4300`, this
 * project's usual scratch port) plus `AUDIT_GROUP_PASSWORD` and
 * `AUDIT_ADMIN_PASSWORD` for the scratch environment's two passwords.
 */
export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.AUDIT_BASE_URL ?? "http://localhost:4300",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "375x667",
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "1280x800",
      use: { viewport: { width: 1280, height: 800 }, hasTouch: false },
    },
  ],
});
