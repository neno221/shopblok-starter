import type { Page } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import { catalogs } from "./support/catalogs";
import { rest } from "./support/payload-rest";
import { base } from "./support/server";
import { visitorHeaders } from "./support/visitor";
// M6 D114 (T93): fails a test on any request to PostHog, or to the site's own `/ingest`.
import { expect, test } from "./support/third-party";

// M6 D123, D124 (T97), keyless (e2e-smoke): the visitor's cookie choice kept in `_shopblok_consent`
// and reopened from "Cookie settings" in the footer and on the policy page, with the switches as
// chosen; a withdrawal kept the same way; without scripts the control is a link to the policy page.
// M7 D145 (T109): each choice is also recorded on the server, one record per choice, change and
// withdrawal under one random id that the cookie carries (the second describe below).
// No PostHog key in this build: whatever the visitor answers, nothing goes to `/ingest` or PostHog
// (the fixture above fails the test on such a request).

const en = catalogs.en;
const consent = en.organisms.cookieConsent;
const banner = (page: Page) => page.locator('[data-slot="cookie-consent"]');
const dialog = (page: Page) => page.locator('[data-slot="cookie-consent-dialog"]');
const settingsLink = (page: Page) => page.locator('[data-slot="footer-cookie-settings"]:visible');

/** The cookie's value, or undefined. */
async function cookieOf(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "_shopblok_consent")?.value;
}

/** The dialog's two switches that can change (analytics, marketing), as `aria-checked`. */
async function switches(page: Page): Promise<(string | null)[]> {
  const all = dialog(page).getByRole("switch");
  await expect(all).toHaveCount(3);
  return [
    await all.nth(1).getAttribute("aria-checked"),
    await all.nth(2).getAttribute("aria-checked"),
  ];
}

const today = () => new Date().toISOString().slice(0, 10);

/** The cookie's choice and day, without the record's id (T109) the server adds after a choice. */
const choiceIn = (value: string | undefined) => value?.replace(/\.[A-Za-z0-9_-]{16,64}$/, "");

test.describe("the cookie choice, kept and reopened (T97)", () => {
  test("is kept in its cookie: a reload asks nothing, and the footer's control opens it as chosen", async ({
    page,
  }) => {
    await page.goto("/us");
    await expect(banner(page)).toBeVisible();
    // Analytics only, from the banner's dialog.
    await page.locator('[data-slot="cookie-consent-choose"]').click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("switch", { name: consent.analytics }).click();
    await page.locator('[data-slot="cookie-consent-dialog-save"]').click();
    await expect(banner(page)).toHaveCount(0);
    expect(choiceIn(await cookieOf(page))).toBe(`v1.1.0.${today()}`);

    await page.reload();
    // The footer's control opens the dialog once the island has hydrated: the banner never came.
    await settingsLink(page).click();
    await expect(dialog(page)).toBeVisible();
    expect(await switches(page)).toEqual(["true", "false"]);
    await expect(banner(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/us$/);
  });

  test("reopens from the keyboard, withdraws, and gives focus back to the control", async ({
    page,
  }) => {
    await page.goto("/us");
    await page.locator('[data-slot="cookie-consent-accept"]').click();
    await expect(banner(page)).toHaveCount(0);
    expect(choiceIn(await cookieOf(page))).toBe(`v1.1.1.${today()}`);

    await settingsLink(page).focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    expect(await switches(page)).toEqual(["true", "true"]);
    const reject = page.locator('[data-slot="cookie-consent-dialog-reject"]');
    await reject.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toHaveCount(0);
    await expect(settingsLink(page)).toBeFocused();
    expect(choiceIn(await cookieOf(page))).toBe(`v1.0.0.${today()}`);

    // Withdrawn and kept: the next page opens the dialog with both off, and asks nothing.
    await page.goto("/us/store");
    await settingsLink(page).click();
    expect(await switches(page)).toEqual(["false", "false"]);
    await expect(banner(page)).toHaveCount(0);
  });

  test("opens on the policy page, from its own link and from a page opened at #cookie-settings", async ({
    page,
  }) => {
    await page.goto("/us");
    await page.locator('[data-slot="cookie-consent-reject"]').click();
    await page.goto("/us/privacy#cookie-settings");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    // The policy's own sentence links it (the privacy page's seed).
    await page.getByRole("main").locator('a[href$="/privacy#cookie-settings"]').click();
    await expect(dialog(page)).toBeVisible();
    expect(await switches(page)).toEqual(["false", "false"]);
  });

  test("without scripts, the control is a link to the policy page", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/us");
    const link = settingsLink(page);
    await expect(link).toHaveText(en.organisms.footer.cookieSettings);
    await expect(link).toHaveAttribute("href", "/us/privacy#cookie-settings");
    await link.click();
    await expect(page).toHaveURL(/\/us\/privacy#cookie-settings$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.close();
  });

  test("a new version of the consent asks again", async ({ page, context }) => {
    // A cookie of another version is no choice (`CONSENT_VERSION`).
    await context.addCookies([
      { name: "_shopblok_consent", value: `v0.1.1.${today()}`, url: "http://localhost:8000" },
    ]);
    await page.goto("/us");
    await expect(banner(page)).toBeVisible();
  });
});

// M7 D145 (T109): the consent record. Each choice, change and withdrawal is one record in Payload's
// `consent-records`, under one random id the cookie carries; with and without scripts; the table
// holds no address, browser or customer; nobody writes one through the API; and the retention job
// deletes a record older than 13 months.
test.describe("the consent record (T109)", () => {
  let token = "";

  test.beforeAll(async () => {
    const { email, password } = adminCredentials();
    const login = await fetch(`${base()}/api/users/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Origin: new URL(base()).origin,
        ...visitorHeaders(),
      },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status, "bootstrap's admin logs in").toBe(200);
    token = ((await login.json()) as { token: string }).token;
  });

  type Record = {
    consentId: string;
    kind: string;
    analytics: boolean;
    marketing: boolean;
    policyVersion: number;
    market: string;
    language: string;
  };

  /** The records of one consent id, oldest first, as the admin reads them. */
  const recordsOf = async (consentId: string): Promise<Record[]> => {
    const answer = await rest<{ docs: Record[] }>(
      token,
      "GET",
      `/api/consent-records?where[consentId][equals]=${encodeURIComponent(consentId)}&sort=createdAt&limit=50&depth=0`,
    );
    expect(answer.status).toBe(200);
    return answer.json().docs;
  };

  /** The id the cookie carries, once the server has added it. */
  const idOf = async (page: Page): Promise<string> => {
    let id = "";
    await expect
      .poll(async () => {
        id = /\.([A-Za-z0-9_-]{16,64})$/.exec((await cookieOf(page)) ?? "")?.[1] ?? "";
        return id;
      })
      .not.toBe("");
    return id;
  };

  const kinds = async (consentId: string, count: number) => {
    await expect.poll(async () => (await recordsOf(consentId)).length).toBe(count);
    return (await recordsOf(consentId)).map((r) => [r.kind, r.analytics, r.marketing]);
  };

  test("one record per choice, change and withdrawal, all under the cookie's one id", async ({
    page,
  }) => {
    await page.goto("/us");
    await page.locator('[data-slot="cookie-consent-reject"]').click();
    const id = await idOf(page);
    expect(await kinds(id, 1)).toEqual([["given", false, false]]);
    const [first] = await recordsOf(id);
    // The page's market key and its language (`/us` is the `en-us` market).
    expect(first).toMatchObject({ policyVersion: 1, market: "en-us", language: "en" });

    // A change: analytics on, from the footer's control.
    await settingsLink(page).click();
    await dialog(page).getByRole("switch", { name: consent.analytics }).click();
    await page.locator('[data-slot="cookie-consent-dialog-save"]').click();
    expect(await kinds(id, 2)).toEqual([
      ["given", false, false],
      ["changed", true, false],
    ]);

    // A withdrawal, on another page: the id is the same.
    await page.goto("/us/store");
    await settingsLink(page).click();
    await page.locator('[data-slot="cookie-consent-dialog-reject"]').click();
    expect(await kinds(id, 3)).toEqual([
      ["given", false, false],
      ["changed", true, false],
      ["withdrawn", false, false],
    ]);
    expect(await idOf(page)).toBe(id);
  });

  test("without scripts, the policy page's form saves the choice and records it", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      extraHTTPHeaders: visitorHeaders(),
    });
    const page = await context.newPage();
    await page.goto("/us/privacy#cookie-settings");
    const form = page.locator('[data-slot="cookie-settings-form"]');
    await expect(form).toBeVisible();
    await form.getByRole("checkbox", { name: consent.analytics }).check();
    await form.getByRole("button", { name: consent.save }).click();
    await expect(page).toHaveURL(/\/us\/privacy#cookie-settings-saved$/);
    await expect(page.locator("#cookie-settings-saved")).toBeVisible();
    expect(choiceIn(await cookieOf(page))).toBe(`v1.1.0.${today()}`);
    const id = await idOf(page);
    expect(await kinds(id, 1)).toEqual([["given", true, false]]);

    // Saved again with both off: a withdrawal under the same id.
    await page.goto("/us/privacy#cookie-settings");
    await form.getByRole("button", { name: consent.save }).click();
    expect(await kinds(id, 2)).toEqual([
      ["given", true, false],
      ["withdrawn", false, false],
    ]);
    await context.close();
  });

  test("holds no address, browser or customer, and nobody writes one through the API", async () => {
    const columns = (await (await fetch(`${base()}/next/e2e/consent-records`)).json()) as {
      columns: string[];
    };
    expect(columns.columns).toEqual(
      expect.arrayContaining(["consent_id", "kind", "analytics", "marketing", "created_at"]),
    );
    for (const column of columns.columns)
      expect(column, "a column that could identify the visitor").not.toMatch(
        /ip|address|agent|browser|customer|email|user/i,
      );

    const record = {
      consentId: "a".repeat(32),
      kind: "given",
      analytics: true,
      marketing: true,
      policyVersion: 1,
      market: "en-us",
      language: "en",
    };
    const anonymous = await fetch(`${base()}/api/consent-records`, {
      method: "POST",
      headers: { "content-type": "application/json", Origin: new URL(base()).origin },
      body: JSON.stringify(record),
    });
    expect(anonymous.status).toBe(403);
    expect((await fetch(`${base()}/api/consent-records`)).status).toBe(403);
    // Not even the admin: records come only from the consent action.
    expect((await rest(token, "POST", "/api/consent-records", record)).status).toBe(403);
  });

  test("the retention job deletes a record older than 13 months and keeps a newer one", async () => {
    const suffix = `${Date.now()}`.padStart(16, "0");
    const old = `e2e-old-${suffix}`;
    const recent = `e2e-new-${suffix}`;
    const age = async (id: string, months: number) =>
      expect(
        (
          await fetch(`${base()}/next/e2e/consent-records?aged=${months}&id=${id}`, {
            method: "POST",
          })
        ).status,
      ).toBe(200);
    await age(old, 14);
    await age(recent, 12);
    expect(await recordsOf(old)).toHaveLength(1);

    const run = await fetch(`${base()}/next/e2e/consent-records?run=retention`, { method: "POST" });
    expect(run.status).toBe(200);
    expect(((await run.json()) as { completed: boolean }).completed).toBe(true);
    expect(await recordsOf(old)).toEqual([]);
    expect(await recordsOf(recent)).toHaveLength(1);
  });
});
