import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

// Real fixture bytes, not the anonymised numeric grids `tests/fixtures/`
// uses — the review screen's photo strip needs an actual loadable image.
// Gitignored (`.gitignore`: "/fixtures/"), same as every other QA pass on
// this project — present in a real checkout, absent from CI.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "sheets");

/**
 * The Stage 5 accessibility/responsive audit (`docs/DECISIONS.md`,
 * "Criterion 73 is verified by a local Playwright audit, not jsdom and not
 * in CI"). Local, on-demand only (`npm run audit:a11y`) — never wired into
 * `.github/workflows/ci.yml`.
 *
 * Scope, exactly per the ADR: at 375×667 and 1280×800 (the two
 * `playwright.config.ts` projects run this file once per width),
 *   1. no horizontal overflow on any M1 screen;
 *   2. every interactive element has a ≥44×44 CSS-px hit area;
 *   3. a computed focus indicator that actually changes on focus;
 * plus PRD criterion 21 — colour is never the only carrier of meaning —
 * checked directly on the one screen that has a colour-coded state
 * (the review grid's monotonicity flag).
 *
 * Needs a production build (`npm run build && npm run start`) on a scratch
 * database, never a developer's own `.env.local` database and never
 * production. Configure with:
 *   AUDIT_BASE_URL       default http://localhost:4300
 *   AUDIT_GROUP_PASSWORD the scratch environment's group password
 *   AUDIT_ADMIN_PASSWORD the scratch environment's admin password
 */

const GROUP_PASSWORD = process.env.AUDIT_GROUP_PASSWORD ?? "";
const ADMIN_PASSWORD = process.env.AUDIT_ADMIN_PASSWORD ?? "";

if (!GROUP_PASSWORD || !ADMIN_PASSWORD) {
  throw new Error(
    "Set AUDIT_GROUP_PASSWORD and AUDIT_ADMIN_PASSWORD before running npm run audit:a11y " +
      "— point them at a scratch environment's two passwords, never production's.",
  );
}

// This spec is not read-only — it uploads real files, creates real drafts,
// and (with `trace: "retain-on-failure"`) can write plaintext passwords into
// a trace file — so it refuses to run anywhere but a local scratch server.
const AUDIT_HOST = new URL(process.env.AUDIT_BASE_URL ?? "http://localhost:4300").hostname;
if (!["localhost", "127.0.0.1"].includes(AUDIT_HOST) && process.env.AUDIT_ALLOW_REMOTE !== "1") {
  throw new Error(
    `AUDIT_BASE_URL resolves to '${AUDIT_HOST}', not a local scratch server — refusing to run ` +
      "against a remote host (including fivecrowns.ribenajuice.xyz). Set AUDIT_ALLOW_REMOTE=1 to override.",
  );
}

const MIN_HIT_AREA = 44;
// Real touch/pointer targets a person can actually reach. Excludes
// `aria-hidden="true"` and `tabindex="-1"` nodes on purpose: `PhotoCapture`'s
// `<input type="file">` pair is exactly this — invisible, untabbable, and
// triggered by the real, visibly-sized "Take a photo"/"Choose a photo"
// `<button>` beside it, which *is* checked. Counting the proxy input as a
// second, tiny "target" is a false positive, not a real touch-target bug.
const INTERACTIVE_SELECTOR =
  'button:not([aria-hidden="true"]):not([tabindex="-1"]), ' +
  'a[href]:not([aria-hidden="true"]):not([tabindex="-1"]), ' +
  'input:not([type="hidden"]):not([aria-hidden="true"]):not([tabindex="-1"]), ' +
  'select:not([aria-hidden="true"]):not([tabindex="-1"]), ' +
  '[role="button"]:not([aria-hidden="true"]):not([tabindex="-1"])';

/** Criterion 73: `document.scrollWidth` must never exceed the viewport. */
async function assertNoHorizontalOverflow(page: Page, screen: string) {
  const overflow = await page.evaluate(() => {
    const docEl = document.documentElement;
    return {
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
    };
  });
  expect
    .soft(
      overflow.scrollWidth,
      `${screen}: document.scrollWidth (${overflow.scrollWidth}) exceeds clientWidth ` +
        `(${overflow.clientWidth}) — horizontal overflow at this viewport.`,
    )
    .toBeLessThanOrEqual(overflow.clientWidth + 1); // 1px rounding tolerance
}

/** Criterion 73: every visible interactive element clears 44×44 CSS px. */
async function assertTouchTargets(page: Page, screen: string) {
  const handles = await page.locator(INTERACTIVE_SELECTOR).all();
  for (const handle of handles) {
    if (!(await handle.isVisible())) continue;
    const box = await handle.boundingBox();
    if (!box) continue;
    const label = await describeElement(handle);
    expect
      .soft(
        box.width >= MIN_HIT_AREA - 0.5 && box.height >= MIN_HIT_AREA - 0.5,
        `${screen}: "${label}" is ${box.width.toFixed(1)}×${box.height.toFixed(1)}px — ` +
          `below the ${MIN_HIT_AREA}px minimum.`,
      )
      .toBeTruthy();
  }
}

async function describeElement(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    const text = el.textContent?.trim();
    if (text) return text.slice(0, 40);
    return el.outerHTML.slice(0, 60);
  });
}

/**
 * Criterion 73: a computed focus indicator that actually changes. Walks
 * *real* keyboard `Tab` presses rather than calling `.focus()` on each
 * element — this app's focus ring is written on `:focus-visible`
 * (`app/globals.css`), and Chromium's `:focus-visible` heuristic does not
 * reliably match a script-triggered `.focus()` the way it matches an actual
 * keyboard tab, so `.focus()` under-reports here. Tabbing is also a closer
 * proxy for the thing criterion 73 actually cares about: a keyboard user
 * moving through the page. Capped per screen so this stays fast.
 */
async function assertFocusVisible(page: Page, screen: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  // Dedup by a marker stamped onto the actual DOM node the first time we
  // visit it, not by a truncated class-string prefix: several screens
  // (CellEditor's nine digit buttons, ColumnPager's inactive chips) share an
  // identical `className` well past 80 characters, so a string-prefix key
  // collides across genuinely distinct elements and the walk would wrongly
  // conclude it had looped back to the start after only the second one —
  // silently skipping every control after it while still reporting green.
  // The marker attribute is removed again once the walk finishes so it never
  // leaks into a later assertion (e.g. a touch-target or overflow check that
  // runs against the same DOM).
  const MARKER = "data-audit-tab-seen";
  const maxSteps = 40;
  let stepsTaken = 0;
  try {
    for (let i = 0; i < maxSteps; i++) {
      await page.keyboard.press("Tab");
      stepsTaken++;
      const info = await page.evaluate((marker) => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const alreadySeen = el.hasAttribute(marker);
        if (!alreadySeen) el.setAttribute(marker, "1");
        const s = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const aria = el.getAttribute("aria-label");
        const text = el.textContent?.trim();
        const label = aria || text || el.outerHTML.slice(0, 60);
        return {
          looped: alreadySeen,
          label: label.slice(0, 60),
          outline: `${s.outlineStyle} ${s.outlineWidth}`,
          boxShadow: s.boxShadow,
          visible: rect.width > 0 && rect.height > 0,
        };
      }, MARKER);
      if (!info) break;
      if (info.looped) break; // focus order genuinely looped back to the start
      if (!info.visible) continue;

      const hasOutline = !info.outline.startsWith("none");
      const hasBoxShadow = info.boxShadow !== "none";
      expect
        .soft(
          hasOutline || hasBoxShadow,
          `${screen}: tabbing to "${info.label}" produced no visible focus indicator ` +
            `(outline: ${info.outline}, box-shadow: ${info.boxShadow}).`,
        )
        .toBeTruthy();
    }
  } finally {
    if (stepsTaken > 0) {
      await page.evaluate((marker) => {
        document.querySelectorAll(`[${marker}]`).forEach((el) => el.removeAttribute(marker));
      }, MARKER);
    }
  }
}

async function auditScreen(page: Page, screen: string) {
  await assertNoHorizontalOverflow(page, screen);
  await assertTouchTargets(page, screen);
  await assertFocusVisible(page, screen);
}

async function loginAsGroup(page: Page) {
  await page.goto("/login");
  await page.locator("#password").fill(GROUP_PASSWORD);
  await page.getByRole("button", { name: "Let me in" }).click();
  await page.waitForURL("**/games");
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Let me in" }).click();
  // `AdminKeyPanel` only opens the "Anthropic API key" form when no key is
  // configured yet (`setFormOpen(!body.configured)`); against a scratch
  // environment that already has a key saved (e.g. re-running this audit
  // against the same scratch DB), a collapsed "Key ending ..." status card
  // renders instead and asserting the form text unconditionally would hang
  // this `mode: "serial"` file's last test on a misleading "not visible"
  // error. Accept whichever of the two states is actually showing.
  const keyForm = page.getByText("Anthropic API key");
  const statusCard = page.getByText(/^Key ending /);
  await expect(keyForm.or(statusCard)).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("audit: /login (unauthenticated)", async ({ page }) => {
  await page.goto("/login");
  await auditScreen(page, "/login");
});

test("audit: full loop, then every M1 screen", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);
  await auditScreen(page, "/games (populated)");

  // A game view, if any game exists in the scratch database.
  const gamesListHtml = await page.content();
  const gameLinkMatch = gamesListHtml.match(/\/games\/([0-9a-f-]{36})/);
  if (gameLinkMatch) {
    await page.goto(`/games/${gameLinkMatch[1]}`);
    await auditScreen(page, "/games/{id}");
  } else {
    test.info().annotations.push({
      type: "note",
      description: "No saved game in the scratch database — /games/{id} not audited.",
    });
  }

  await page.goto("/games/new");
  await auditScreen(page, "/games/new");

  // A review screen: create a throwaway draft via the API (same cookies the
  // browser context holds), point the page at it directly. Real fixture
  // bytes are uploaded for both variants — the photo strip only renders the
  // grid once its `<img>` reports real `naturalWidth`/`naturalHeight`
  // (`ReviewScreen.tsx`), so a photoId with nothing in storage never gets
  // past "Loading the photo…" and none of criterion 73's checks below it
  // would run at all.
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const uploadRes = await request.post(`${baseURL}/api/uploads`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
  });
  if (!uploadRes.ok()) {
    throw new Error(
      `POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()} — ` +
        "check the scratch DB isn't already at the 40/day sheet-upload cap and the " +
        "group-password cookie is valid.",
    );
  }
  const { photoId, original, model } = await uploadRes.json();

  const fixtureBytes = await readFile(
    path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"),
  );
  for (const variant of [original, model]) {
    // `variant.url` is relative against the local dev driver
    // (`lib/photos/local.ts`, `/api/dev-photos/...`) but absolute against the
    // real S3 driver (`lib/photos/s3.ts`'s `presignPost` returns a full
    // `https://<bucket>.s3...` URL) — prefixing `baseURL` onto an already-
    // absolute URL produces a malformed one, the upload silently fails, and
    // every later screen audit runs against a photo stuck on "Loading the
    // photo…", checking almost nothing while still reporting green.
    const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
    await request.post(uploadUrl, {
      multipart: {
        ...variant.fields,
        file: {
          name: "photo.jpg",
          mimeType: "image/jpeg",
          buffer: fixtureBytes,
        },
      },
    });
  }

  const draftState = {
    version: 1,
    photoId,
    playedOn: "2026-01-01",
    locationId: null,
    newLocationName: null,
    columns: ["a1", "a2", "a3", "a4"].map((id, order) => ({
      id,
      order,
      playerId: null,
      newPlayerName: `Audit ${id}`,
      sheetName: null,
      activeReadingId: null,
      readings: [],
      manualEdits:
        order === 0
          ? // Dani's row: monotonic, unflagged seed data (28, 32, 60, ... 137
            // never decreases) — this does *not* produce a paired-flag break
            // on its own, so nothing here is checkable on first paint.
            // Criterion 21's flag only appears once hand 6 (index 5) is
            // edited from 100 down to 70 below — that edit is the only real
            // criterion-21 coverage in this file; do not delete it under the
            // mistaken belief the seed already covers it.
            Object.fromEntries(
              [28, 32, 60, 71, 74, 100, 118, 123, 123, 123, 137].map((v, i) => [
                String(i),
                v,
              ]),
            )
          : {},
      crop: null,
    })),
  };
  const draftRes = await request.post(`${baseURL}/api/drafts`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { photoId, state: draftState },
  });
  if (!draftRes.ok()) {
    throw new Error(
      `POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`,
    );
  }
  const { draftId } = await draftRes.json();

  await page.goto(`/review/${draftId}`);
  await auditScreen(page, "/review/{draftId} (clean grid)");

  // ---- Criterion 21: colour is never the only signal ----
  // Edit "Audit a1"'s hand 6 (index 5) from 100 to 70 — the PRD's own worked
  // example (criterion 21): both 70 and the 74 above it must flag with a
  // border, a tint, an icon *and* a sentence naming the numbers, not colour
  // alone.
  const cellButtons = page.locator("ol li button");
  // Row order is hand 1..11 (3s..Kings); hand 6 is the 6th cell (index 5).
  const hand6Button = cellButtons.nth(5);
  await hand6Button.click();

  // Audit the cell editor itself, open, before touching it further —
  // `CellEditor`'s "Fix the shape" link (and its nine digit buttons, all
  // sharing one >80-char class string) is only reachable in this state, and
  // the criterion-21 flow below closes the sheet again before it gets an
  // audit pass. Skipping this was exactly how a real 44px touch-target
  // violation on "Fix the shape" shipped while this harness reported green.
  await auditScreen(page, "/review/{draftId} (cell editor open)");

  // Clear the field via backspace buttons, then type 7 0.
  const valueField = page.locator("#cell-editor-value");
  const backspace = page.getByRole("button", { name: /back|delete|⌫/i }).first();
  for (let i = 0; i < 3; i++) {
    await backspace.click().catch(() => {});
  }
  // Assert the field is actually empty before typing new digits — the loop
  // above swallows every click failure, so without this a dropped click
  // (e.g. during a bottom-sheet open/close animation) leaves a leftover
  // digit that corrupts the typed value, and the resulting assertion
  // failure further down would point at the wrong place.
  await expect(valueField, "cell editor: value should be empty after clearing before typing 7 0").toHaveValue("");
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});

  await auditScreen(page, "/review/{draftId} (flagged grid)");

  // Scoped to the paired-flag banner's own wording, not just any
  // `role="alert"` — `ReviewScreen.tsx` also renders a generic autosave-error
  // `Banner` with the same role, positioned earlier in DOM order, and
  // `.first()` alone could pick that one instead under CI/scratch-environment
  // latency, producing a misleading failure against unrelated content.
  const alertBanners = page.getByRole("alert").filter({ hasText: "is lower than" });
  const alertCount = await alertBanners.count();
  expect
    .soft(alertCount, "criterion 21: editing hand 6 to 70 should raise a role=alert paired-flag banner")
    .toBeGreaterThan(0);

  if (alertCount > 0) {
    const alertText = (await alertBanners.first().textContent()) ?? "";
    expect
      .soft(
        /\d+ is lower than the \d+ above it/.test(alertText),
        `criterion 21: paired-flag text should name both numbers, got: "${alertText}"`,
      )
      .toBeTruthy();
    const hasSvgIcon = await alertBanners.first().locator("svg").count();
    expect
      .soft(hasSvgIcon > 0, "criterion 21: paired-flag banner should carry a non-colour icon, not just a tint")
      .toBeTruthy();
    // The flagged cell button itself must carry a border-colour class change,
    // not rely on colour of the fill alone — confirm it also differs in
    // more than background hue (a class name change is enough evidence the
    // treatment is systematic, not colour-only, given PairedFlag's icon+text
    // above already carries the accessible signal).
    const flaggedClass = await hand6Button.getAttribute("class");
    expect
      .soft(flaggedClass?.includes("border-error"), "criterion 21: flagged cell should carry a distinct border class")
      .toBeTruthy();
  }

  await page.goto("/admin");
  await auditScreen(page, "/admin (locked)");
  await loginAsAdmin(page);
  await auditScreen(page, "/admin (unlocked panel)");
});

/**
 * Milestone 2 Stage 2 — edit and delete a game, plus the 404 screen (PRD
 * criteria 115–131). Same harness, same scope (overflow, touch targets, focus
 * visibility) extended to the new screens: the game view's "Edit this game"
 * and "Delete game" buttons, the dedicated delete confirmation screen, and
 * the app's own 404. The error screen (`app/error.tsx`) is deliberately not
 * audited here — forcing an unhandled error is done by QA with a temporary,
 * reverted code change (docs note this explicitly), not as a standing test.
 */
test("audit: game view actions, delete confirmation, 404", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);

  // Build one throwaway saved game via the API, the same way the M1 test
  // above builds its throwaway draft — real fixture bytes, both photo
  // variants, a valid monotonic grid, then an actual save so a real game view
  // and a real delete confirmation (which needs the game's date and roster)
  // both have something to render.
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const uploadRes = await request.post(`${baseURL}/api/uploads`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
  });
  if (!uploadRes.ok()) {
    throw new Error(`POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()}`);
  }
  const { photoId, original, model } = await uploadRes.json();

  const fixtureBytes = await readFile(path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"));
  for (const variant of [original, model]) {
    const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
    await request.post(uploadUrl, {
      multipart: {
        ...variant.fields,
        file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: fixtureBytes },
      },
    });
  }

  const draftState = {
    version: 1,
    photoId,
    playedOn: "2026-01-02",
    locationId: null,
    newLocationName: "Audit House",
    columns: ["s1", "s2"].map((id, order) => ({
      id,
      order,
      playerId: null,
      newPlayerName: `Stage2 Audit ${id}`,
      sheetName: null,
      activeReadingId: null,
      readings: [],
      manualEdits: Object.fromEntries(
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33].map((v, i) => [String(i), v]),
      ),
      crop: null,
    })),
  };
  const draftRes = await request.post(`${baseURL}/api/drafts`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { photoId, state: draftState },
  });
  if (!draftRes.ok()) {
    throw new Error(`POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`);
  }
  const { draftId } = await draftRes.json();

  const saveRes = await request.post(`${baseURL}/api/games`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { draftId, state: draftState },
  });
  if (!saveRes.ok()) {
    throw new Error(`POST /api/games failed: ${saveRes.status()} ${await saveRes.text()}`);
  }
  const { gameId } = await saveRes.json();

  // ---- The game view's new "Manage this game" section ----
  await page.goto(`/games/${gameId}`);
  await auditScreen(page, "/games/{id} (with Edit/Delete actions)");
  await expect(page.getByRole("button", { name: "Edit this game" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Delete game/ })).toBeVisible();

  // ---- The delete confirmation screen ----
  await page.getByRole("link", { name: /Delete game/ }).click();
  await page.waitForURL(`**/games/${gameId}/delete`);
  await auditScreen(page, "/games/{id}/delete (confirmation)");
  await expect(page.getByRole("heading", { name: /Delete the .* game with/ })).toBeVisible();
  await expect(
    page.getByText(
      "This can't be undone. The game and its scores are gone for good, and its photos come out of the record with it.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete permanently" })).toBeVisible();
  // Cancel first, since Cancel is the safe option placed first (design system).
  await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();

  // Commit the delete for real, then audit the resulting 404.
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL("**/games");

  // ---- The 404 screen, reached via the just-deleted game's own URL ----
  await page.goto(`/games/${gameId}`);
  await auditScreen(page, "/games/{id} (404, deleted game)");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("Nothing here.")).toBeVisible();
  await expect(
    page.getByText("The link's wrong, or it's been deleted — either way, it's not in the record."),
  ).toBeVisible();
  // Two ways back by design (the AppBar's small back arrow, aria-labelled
  // "Back to games", and the full-width primary button with the same text) —
  // `.first()` here just confirms at least one is visible, not which.
  await expect(page.getByRole("link", { name: "Back to games" }).first()).toBeVisible();
});

/**
 * Milestone 3 Stage 1 — the records board and its drill-throughs (PRD
 * criterion 194): overflow, touch targets and focus visibility on `/` and on
 * every record's `/records/{key}`, plus a direct check that colour is never
 * the only signal for the early-days line or a no-holder row (criterion 194's
 * own addition — "a withheld record" no longer exists, but the early-days
 * line and a no-holder row are the two states this stage actually has).
 *
 * Runs after the two tests above, so by this point the scratch database
 * holds at least the M1 test's saved-then-untouched draft/review-only game
 * (no save) plus Stage 2's real saved-and-deleted game — deleted, so it does
 * NOT keep the board non-empty on its own. This test seeds one more real
 * saved game of its own via the same API path, so the board is guaranteed
 * non-empty and every record has at least one holder to drill into,
 * regardless of what earlier tests left behind.
 */
test("audit: the records board (/) and its drill-throughs", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const uploadRes = await request.post(`${baseURL}/api/uploads`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
  });
  if (!uploadRes.ok()) {
    throw new Error(`POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()}`);
  }
  const { photoId, original, model } = await uploadRes.json();

  const fixtureBytes = await readFile(path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"));
  for (const variant of [original, model]) {
    const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
    await request.post(uploadUrl, {
      multipart: {
        ...variant.fields,
        file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: fixtureBytes },
      },
    });
  }

  const draftState = {
    version: 1,
    photoId,
    playedOn: "2026-01-03",
    locationId: null,
    newLocationName: "Board Audit House",
    columns: ["b1", "b2"].map((id, order) => ({
      id,
      order,
      playerId: null,
      newPlayerName: `Board Audit ${id}`,
      sheetName: null,
      activeReadingId: null,
      readings: [],
      manualEdits: Object.fromEntries(
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33].map((v, i) => [String(i), v]),
      ),
      crop: null,
    })),
  };
  const draftRes = await request.post(`${baseURL}/api/drafts`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { photoId, state: draftState },
  });
  if (!draftRes.ok()) {
    throw new Error(`POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`);
  }
  const { draftId } = await draftRes.json();

  const saveRes = await request.post(`${baseURL}/api/games`, {
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    data: { draftId, state: draftState },
  });
  if (!saveRes.ok()) {
    throw new Error(`POST /api/games failed: ${saveRes.status()} ${await saveRes.text()}`);
  }

  // ---- The board itself ----
  await page.goto("/");
  await auditScreen(page, "/ (records board)");

  // criterion 194: colour is never the only signal. The `ArchiveLine` and any
  // `RecordCard` share one plain-text/border treatment — neither state uses a
  // `warn`/`error` background alone to carry meaning, so a computed
  // background-color check here is a direct proxy for "not colour-only": if
  // it differs at all from the plain surface colour, something else (text,
  // border) must also be present per the design system's own "never a warn
  // or error tint" rule, checked structurally by confirming the line's text
  // is present as real, readable DOM text (not e.g. a bare coloured icon).
  const archiveLine = page.getByText(/games in the record/);
  await expect(archiveLine).toBeVisible();
  const archiveLineColor = await archiveLine.evaluate((el) => getComputedStyle(el).color);
  expect
    .soft(archiveLineColor, "criterion 194: the archive line must render as real text, not merely a colour swatch")
    .not.toBe("rgba(0, 0, 0, 0)");

  // Every record card is a real, named link with its claim in the
  // `aria-label` — walk them all and audit each drill-through in turn.
  const recordLinks = page.locator('a[href^="/records/"]');
  const hrefs = await recordLinks.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  const uniqueHrefs = [...new Set(hrefs.filter((h): h is string => Boolean(h)))];
  expect
    .soft(uniqueHrefs.length, "criterion 186: at least one record should be tappable through to a drill-through")
    .toBeGreaterThan(0);

  for (const href of uniqueHrefs) {
    await page.goto(href);
    await auditScreen(page, href);
  }
});

/**
 * Milestone 3 Stage 2 — the player page's new rivalry sections (PRD criterion
 * 222: "npm run audit:a11y covers the player page's new sections ... at 375px
 * and 1280px"). Before this test, nothing in this file ever navigated to
 * `/players/{id}` at all — the player page's head-to-head section, nemesis
 * card, by-roster section and streak-in-context cards, plus both of their own
 * drill-throughs, had **zero** audit coverage despite criterion 222's own
 * text. This closes that gap.
 *
 * Saves two real games between the same two-player roster via the API (same
 * pattern as the tests above) so both players have a populated head-to-head
 * row, a nemesis (or the no-nemesis state), a by-roster row and a real
 * (non-zero) longest streak to drill into.
 */
test("audit: the player page's rivalry sections (M3 Stage 2)", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  async function saveGame(playedOn: string, columns: string[], overrides: Record<number, number[]>) {
    const uploadRes = await request.post(`${baseURL}/api/uploads`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
    });
    if (!uploadRes.ok()) {
      throw new Error(`POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()}`);
    }
    const { photoId, original, model } = await uploadRes.json();

    const fixtureBytes = await readFile(path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"));
    for (const variant of [original, model]) {
      const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
      await request.post(uploadUrl, {
        multipart: {
          ...variant.fields,
          file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: fixtureBytes },
        },
      });
    }

    const draftState = {
      version: 1,
      photoId,
      playedOn,
      locationId: null,
      newLocationName: null,
      columns: columns.map((id, order) => ({
        id,
        order,
        playerId: null,
        newPlayerName: `Rivalry Audit ${id}`,
        sheetName: null,
        activeReadingId: null,
        readings: [],
        manualEdits: Object.fromEntries((overrides[order] ?? []).map((v, i) => [String(i), v])),
        crop: null,
      })),
    };
    const draftRes = await request.post(`${baseURL}/api/drafts`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { photoId, state: draftState },
    });
    if (!draftRes.ok()) {
      throw new Error(`POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`);
    }
    const { draftId } = await draftRes.json();

    const saveRes = await request.post(`${baseURL}/api/games`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { draftId, state: draftState },
    });
    if (!saveRes.ok()) {
      throw new Error(`POST /api/games failed: ${saveRes.status()} ${await saveRes.text()}`);
    }
  }

  // Two games, same two-player roster, same winner each time — Rivalry Audit
  // r1 gets a real (non-zero) 2-game winning streak to drill into, and both
  // players get a populated head-to-head row and nemesis state.
  const rising = (start: number) => [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33].map((v) => v + start);
  await saveGame("2026-01-04", ["r1", "r2"], { 0: rising(0), 1: rising(20) });
  await saveGame("2026-01-05", ["r1", "r2"], { 0: rising(0), 1: rising(20) });

  await page.goto("/players");
  const playerLink = page.getByRole("link", { name: "Rivalry Audit r1" });
  await expect(playerLink).toBeVisible();
  const playerHref = await playerLink.getAttribute("href");
  if (!playerHref) throw new Error("Rivalry Audit r1's own player page link was not found on /players");

  await page.goto(playerHref);
  await auditScreen(page, "/players/{id} (head-to-head, nemesis, by-roster, streak)");

  // The head-to-head section and the nemesis card, both real per the design
  // system's fixed copy — confirm the sections this test exists to cover are
  // actually on the page, not merely that the page loads.
  await expect(page.getByRole("heading", { name: "Head-to-head" })).toBeVisible();
  await expect(page.getByText("Rivalry Audit r2", { exact: true })).toBeVisible();
  await expect(page.getByText("Nemesis", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "By roster" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Streak, in context" })).toBeVisible();

  // ---- The head-to-head drill-through (criterion 204) ----
  // Anchored at the start: `HeadToHeadRow`'s own aria-label is
  // "{opponent} — {n} games together, ...", but a roster named "r1 & r2" also
  // contains the substring "Rivalry Audit r2" and would otherwise match too.
  const opponentRow = page.getByRole("link", { name: /^Rivalry Audit r2 —/ });
  await opponentRow.click();
  await page.waitForURL(/[?&]opponent=/);
  await auditScreen(page, "/players/{id}?opponent= (head-to-head drill-through)");

  // ---- The personal streak drill-through (criterion 211) ----
  await page.goto(playerHref);
  const streakCard = page.getByRole("link", { name: /Longest winning streak/ });
  if (await streakCard.count()) {
    await streakCard.click();
    await page.waitForURL(/[?&]streak=winning/);
    await auditScreen(page, "/players/{id}?streak=winning (personal streak drill-through)");
  } else {
    test.info().annotations.push({
      type: "note",
      description: "Rivalry Audit r1's longest streak was 0 (inert card, no drill-through) — unexpected given two straight wins were saved above.",
    });
  }
});

/**
 * Milestone 3 Stage 3 — distributions and villains (PRD criterion 247:
 * "npm run audit:a11y covers /stats and every new section", plus criterion
 * 235's twelve-card board and criterion 194's colour-is-never-the-only-signal
 * extended to the worst-hand marker). QA gap found in Stage 3 review: before
 * this test, `/stats` had **zero** audit coverage of any kind — no navigation
 * to it anywhere in this file — despite criterion 247's own text, and neither
 * the player page's three new Stage 3 sections (average, eleven-hand
 * profile, best/worst game) nor the roster page's two new ones (table
 * average, per-member roster-scoped average) had ever been visited either.
 *
 * Saves two real games via the API (same pattern as the tests above), in a
 * three-player roster with varied final scores and hand-by-hand scores, so
 * every Stage 3 section has real, non-empty data: an average, an eleven-hand
 * profile with a real worst hand, a best/worst game each, a roster table
 * average, and at least one single-hand score to appear on `/stats`'
 * disasters list.
 */
test("audit: /stats and the player/roster pages' Stage 3 sections", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  async function saveGame(playedOn: string, columns: string[], overrides: Record<number, number[]>) {
    const uploadRes = await request.post(`${baseURL}/api/uploads`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
    });
    if (!uploadRes.ok()) {
      throw new Error(`POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()}`);
    }
    const { photoId, original, model } = await uploadRes.json();

    const fixtureBytes = await readFile(path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"));
    for (const variant of [original, model]) {
      const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
      await request.post(uploadUrl, {
        multipart: {
          ...variant.fields,
          file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: fixtureBytes },
        },
      });
    }

    const draftState = {
      version: 1,
      photoId,
      playedOn,
      locationId: null,
      newLocationName: null,
      columns: columns.map((id, order) => ({
        id,
        order,
        playerId: null,
        newPlayerName: `Stats Audit ${id}`,
        sheetName: null,
        activeReadingId: null,
        readings: [],
        manualEdits: Object.fromEntries((overrides[order] ?? []).map((v, i) => [String(i), v])),
        crop: null,
      })),
    };
    const draftRes = await request.post(`${baseURL}/api/drafts`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { photoId, state: draftState },
    });
    if (!draftRes.ok()) {
      throw new Error(`POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`);
    }
    const { draftId } = await draftRes.json();

    const saveRes = await request.post(`${baseURL}/api/games`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { draftId, state: draftState },
    });
    if (!saveRes.ok()) {
      throw new Error(`POST /api/games failed: ${saveRes.status()} ${await saveRes.text()}`);
    }
  }

  // Two games, same three-player roster, varied running totals so every
  // player has a distinct final score and a real (non-flat) hand profile —
  // "Stats Audit s1" wins both, giving them a real best/worst game each and
  // a genuine worst-hand mark rather than an eleven-way tie.
  await saveGame("2026-02-01", ["s1", "s2", "s3"], {
    0: [3, 8, 12, 17, 23, 30, 38, 47, 57, 68, 80],
    1: [9, 18, 27, 36, 45, 54, 63, 72, 81, 90, 99],
    2: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105],
  });
  await saveGame("2026-02-08", ["s1", "s2", "s3"], {
    0: [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54],
    1: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110],
    2: [6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106],
  });

  // ---- `/stats`, the catalogue index (criteria 236–242, 247) ----
  await page.goto("/stats");
  await auditScreen(page, "/stats");
  await expect(page.getByRole("heading", { name: "The eleven-hand trend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hand-by-hand villains" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biggest single-hand disasters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Averages" })).toBeVisible();
  await expect(page.getByText("These are derived from the running totals")).toBeVisible();

  // ---- The records board at twelve cards (criteria 194, 235) ----
  await page.goto("/");
  await auditScreen(page, "/ (records board, twelve cards)");
  for (const title of [
    "Most wins",
    "Most wins in a row",
    "Lowest average score",
    "Most rounds won",
    "The stalwart",
    "The drought",
    "The nearly man",
    "Best game ever",
    "Worst game ever",
    "The catastrophe",
    "Cleanest sheet",
    "Biggest hammering",
  ]) {
    await expect(
      page.getByText(title, { exact: true }),
      `criterion 235: expected the "${title}" card on the twelve-card board`,
    ).toBeVisible();
  }

  // ---- The player page's three new Stage 3 sections (criteria 243, 247) ----
  await page.goto("/players");
  const playerLink = page.getByRole("link", { name: "Stats Audit s1" });
  await expect(playerLink).toBeVisible();
  const playerHref = await playerLink.getAttribute("href");
  if (!playerHref) throw new Error("Stats Audit s1's own player page link was not found on /players");

  await page.goto(playerHref);
  await auditScreen(page, "/players/{id} (Stage 3 distributions sections)");
  await expect(page.getByRole("heading", { name: "Average final score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Eleven-hand profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best and worst game" })).toBeVisible();
  await expect(page.getByText("Best game", { exact: true })).toBeVisible();
  await expect(page.getByText("Worst game", { exact: true })).toBeVisible();

  // ---- The roster page's two new Stage 3 additions (criteria 244, 247) ----
  await page.goto("/rosters");
  const rosterLink = page.locator('a[href^="/rosters/"]').first();
  await expect(rosterLink).toBeVisible();
  const rosterHref = await rosterLink.getAttribute("href");
  if (!rosterHref) throw new Error("No roster link found on /rosters");

  await page.goto(rosterHref);
  await auditScreen(page, "/rosters/{id} (Stage 3 table average, per-member average)");
  await expect(page.getByText("Table average", { exact: true })).toBeVisible();
});

/**
 * Milestone 3 Stage 4 — place, time, and the filters (PRD criterion 272:
 * "npm run audit:a11y covers the venue page, the places index, the filtered
 * games list, both time tables, the player page's by-venue section and the
 * board's thirteenth row"). Saves games at a named venue so the venue page,
 * the places index and the games-list filter all have real, non-empty data
 * to audit against, plus a second, unlocated game with a distinct roster so
 * a combined venue+roster filter has a real "zero matches" case to check.
 */
test("audit: place, time and the filters (M3 Stage 4)", async ({ page, baseURL, request }) => {
  await loginAsGroup(page);

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  async function saveGame(
    playedOn: string,
    columns: string[],
    overrides: Record<number, number[]>,
    newLocationName: string | null,
  ) {
    const uploadRes = await request.post(`${baseURL}/api/uploads`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { kind: "sheet", rotation: 0, width: 1200, height: 1600 },
    });
    if (!uploadRes.ok()) {
      throw new Error(`POST /api/uploads failed: ${uploadRes.status()} ${await uploadRes.text()}`);
    }
    const { photoId, original, model } = await uploadRes.json();

    const fixtureBytes = await readFile(path.join(FIXTURES_DIR, "sheet-01-four-players.jpg"));
    for (const variant of [original, model]) {
      const uploadUrl = /^https?:\/\//.test(variant.url) ? variant.url : `${baseURL}${variant.url}`;
      await request.post(uploadUrl, {
        multipart: {
          ...variant.fields,
          file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: fixtureBytes },
        },
      });
    }

    const draftState = {
      version: 1,
      photoId,
      playedOn,
      locationId: null,
      newLocationName,
      columns: columns.map((id, order) => ({
        id,
        order,
        playerId: null,
        newPlayerName: `Place Audit ${id}`,
        sheetName: null,
        activeReadingId: null,
        readings: [],
        manualEdits: Object.fromEntries((overrides[order] ?? []).map((v, i) => [String(i), v])),
        crop: null,
      })),
    };
    const draftRes = await request.post(`${baseURL}/api/drafts`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { photoId, state: draftState },
    });
    if (!draftRes.ok()) {
      throw new Error(`POST /api/drafts failed: ${draftRes.status()} ${await draftRes.text()}`);
    }
    const { draftId } = await draftRes.json();

    const saveRes = await request.post(`${baseURL}/api/games`, {
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      data: { draftId, state: draftState },
    });
    if (!saveRes.ok()) {
      throw new Error(`POST /api/games failed: ${saveRes.status()} ${await saveRes.text()}`);
    }
  }

  // Two games at a named venue, same two-player roster — a real table
  // average, a "Players here" table and a real games list to audit.
  await saveGame(
    "2026-03-01",
    ["v1", "v2"],
    { 0: [3, 8, 12, 17, 23, 30, 38, 47, 57, 68, 80], 1: [9, 18, 27, 36, 45, 54, 63, 72, 81, 90, 99] },
    "Place Audit House",
  );
  await saveGame(
    "2026-03-08",
    ["v1", "v2"],
    { 0: [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54], 1: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110] },
    "Place Audit House",
  );
  // A third game, no venue, a distinct roster — real ids for a combined
  // venue+roster filter that's guaranteed to match zero games.
  await saveGame(
    "2026-03-15",
    ["v3", "v4"],
    { 0: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], 1: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66] },
    null,
  );

  // ---- Places index (criteria 259, 272) ----
  await page.goto("/places");
  await auditScreen(page, "/places");
  const placeLink = page.getByRole("link", { name: /Place Audit House/ });
  await expect(placeLink).toBeVisible();
  const placeHref = await placeLink.getAttribute("href");
  if (!placeHref) throw new Error("Place Audit House's own venue page link was not found on /places");

  // ---- The venue page (criteria 260–261, 272) ----
  await page.goto(placeHref);
  await auditScreen(page, "/places/{id}");
  await expect(page.getByRole("heading", { name: "Players here" })).toBeVisible();
  await expect(page.getByText("Table average", { exact: true })).toBeVisible();

  // ---- The games list, filtered by venue — matches (criteria 262, 272) ----
  const locationId = placeHref.split("/").filter(Boolean).pop();
  await page.goto(`/games?location=${locationId}`);
  await auditScreen(page, "/games?location= (filtered, matches)");
  await expect(page.getByRole("button", { name: "Clear filter" })).toBeVisible();
  await expect(page.getByText(/At Place Audit House/)).toBeVisible();

  // ---- The games list, a valid filter matching zero games (criterion 263) ----
  const rosterHrefBeforeFilter = await page.locator('a[href^="/rosters/"]').first().getAttribute("href");
  await page.goto("/rosters");
  const otherRosterLink = page.getByRole("link", { name: /Place Audit v3/ });
  const otherRosterHref = await otherRosterLink.getAttribute("href");
  if (otherRosterHref && rosterHrefBeforeFilter !== otherRosterHref) {
    const otherRosterId = otherRosterHref.split("/").filter(Boolean).pop();
    await page.goto(`/games?location=${locationId}&roster=${otherRosterId}`);
    await auditScreen(page, "/games?location=&roster= (zero matches)");
    await expect(page.getByText("No games match this filter.")).toBeVisible();
  }

  // ---- The player page's by-venue section (criteria 256–258, 272) ----
  await page.goto("/players");
  const venuePlayerLink = page.getByRole("link", { name: "Place Audit v1" });
  await expect(venuePlayerLink).toBeVisible();
  const venuePlayerHref = await venuePlayerLink.getAttribute("href");
  if (!venuePlayerHref) throw new Error("Place Audit v1's own player page link was not found on /players");
  await page.goto(venuePlayerHref);
  await auditScreen(page, "/players/{id} (Stage 4 by-venue section)");
  await expect(page.getByRole("heading", { name: "By venue" })).toBeVisible();
  await expect(page.getByText("Place Audit House", { exact: true })).toBeVisible();

  // ---- /stats' two time tables (criteria 265–267, 272) ----
  await page.goto("/stats");
  await auditScreen(page, "/stats (Stage 4 time tables)");
  await expect(page.getByRole("heading", { name: "Day of the week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time of year" })).toBeVisible();

  // ---- The board at thirteen cards (criteria 270, 272) ----
  await page.goto("/");
  await auditScreen(page, "/ (records board, thirteen cards)");
  await expect(page.getByText("Home advantage", { exact: true })).toBeVisible();
  const homeAdvantageLink = page.locator('a[href="/records/homeAdvantage"]');
  if (await homeAdvantageLink.count()) {
    const href = await homeAdvantageLink.first().getAttribute("href");
    if (href) {
      await page.goto(href);
      await auditScreen(page, "/records/homeAdvantage (drill-through)");
    }
  }
});
