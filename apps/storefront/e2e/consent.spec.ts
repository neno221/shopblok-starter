import type { Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
// M6 D114 (T93): fails a test on any request to PostHog, or to the site's own `/ingest`.
import { expect, test } from "./support/third-party";

// M6 D123, D124 (T97), keyless (e2e-smoke): the visitor's cookie choice kept in `_shopblok_consent`
// and reopened from "Cookie settings" in the footer and on the policy page, with the switches as
// chosen; a withdrawal kept the same way; without scripts the control is a link to the policy page.
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
    expect(await cookieOf(page)).toBe(`v1.1.0.${today()}`);

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
    expect(await cookieOf(page)).toBe(`v1.1.1.${today()}`);

    await settingsLink(page).focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    expect(await switches(page)).toEqual(["true", "true"]);
    const reject = page.locator('[data-slot="cookie-consent-dialog-reject"]');
    await reject.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toHaveCount(0);
    await expect(settingsLink(page)).toBeFocused();
    expect(await cookieOf(page)).toBe(`v1.0.0.${today()}`);

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
