import type { Request } from "@playwright/test";
import { expect, test } from "../support/csp";
import { catalogs } from "../support/catalogs";
import { doctorOnline, skipWithoutKeys } from "../support/integration-keys";
import { visitorHeaders } from "../support/visitor";

// M7 D143 (T108): Cloudflare's Turnstile, live, with the keys CI holds: Cloudflare's published test
// pair that always passes (`1x00000000000000000000AA`, `1x0000000000000000000000000000000AA`;
// public, not secrets), against a build made with them, so `challenges.cloudflare.com` is in the
// policy (the CSP fixture fails a test on any block). Nothing of Cloudflare's loads before a form
// is focused; then the widget puts its token in the form and the action checks it with Siteverify
// first. Without scripts the page says the form can be sent once an hour, and a second post in the
// hour is refused. `doctor --online` finds the secret accepted. The always-failing pair refusing a
// form is a mutation run (SETUP "Rate limits and Turnstile (T108)").

skipWithoutKeys(test, "turnstile");
test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);
const en = catalogs.en;
const CLOUDFLARE = "https://challenges.cloudflare.com/";
/** The widget's box once it holds the form's presses (its code loads after hydration). */
const READY = "[data-slot=turnstile-box][data-ready]";

test("loads nothing of Cloudflare's until the form is focused, then sends with its token", async ({
  page,
}) => {
  const asked: string[] = [];
  page.on("request", (request: Request) => {
    if (request.url().startsWith(CLOUDFLARE)) asked.push(request.url());
  });
  await page.goto("/us");
  await page.waitForLoadState("networkidle");
  expect(asked, "Cloudflare's script is outside the first load").toEqual([]);
  const footer = page.locator("footer [data-slot=newsletter-form]");
  await expect(footer.locator(READY)).toBeAttached();
  expect(asked, "nor once the widget's own code is in").toEqual([]);
  const field = footer.locator("input[type=email]");
  await field.focus();
  const token = footer.locator("input[name=cf-turnstile-response]");
  await expect(token).toHaveValue(/.+/, { timeout: 30_000 });
  expect(asked.some((url) => url.includes("/turnstile/v0/api.js"))).toBe(true);
  await field.fill(`turnstile-js-${stamp}@example.com`);
  await footer.locator("button[type=submit]").click();
  await expect(footer.locator("[data-slot=newsletter-form-status]")).toContainText(
    en.molecules.newsletterForm.done,
  );
});

test("sends when the button is pressed before the token is there: the press waits for it", async ({
  page,
}) => {
  await page.goto("/us");
  const footer = page.locator("footer [data-slot=newsletter-form]");
  await expect(footer.locator(READY)).toBeAttached();
  // `fill` focuses the field and the button is pressed at once, before Cloudflare has answered.
  await footer.locator("input[type=email]").fill(`turnstile-early-${stamp}@example.com`);
  await footer.locator("button[type=submit]").click();
  await expect(footer.locator("[data-slot=newsletter-form-status]")).toContainText(
    en.molecules.newsletterForm.done,
    { timeout: 30_000 },
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("draws the widget in the registration form, above its button", async ({ page }) => {
  await page.goto("/us/register");
  const form = page.locator('[data-slot="auth-register-form"]');
  await expect(form.locator(READY)).toBeAttached();
  await form.locator("input[name=email]").focus();
  await expect(form.locator("input[name=cf-turnstile-response]")).toHaveValue(/.+/, {
    timeout: 30_000,
  });
});

test("without scripts, says the form can be sent once an hour, and refuses a second post", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    extraHTTPHeaders: visitorHeaders(),
  });
  const page = await context.newPage();
  const footer = page.locator("footer [data-slot=newsletter-form]");
  for (let n = 1; n <= 2; n += 1) {
    await page.goto("/us");
    await expect(footer).toContainText(en.molecules.newsletterForm.noScript);
    await footer.locator("input[type=email]").fill(`turnstile-nojs-${n}-${stamp}@example.com`);
    await footer.locator("button[type=submit]").click();
    await page.waitForLoadState("load");
  }
  await expect(page.locator("footer [data-slot=newsletter-form-refusal]")).toContainText(
    en.molecules.newsletterForm.tooMany.slice(0, en.molecules.newsletterForm.tooMany.indexOf("{")),
  );
  await context.close();
});

test("doctor --online: Cloudflare takes the secret", async () => {
  const checks = (await doctorOnline()).checks.filter((check) => check.id === "turnstile-secret");
  expect(checks.map((check) => [check.level, check.message])).toEqual([
    ["ok", "Cloudflare's Siteverify takes the secret key."],
  ]);
});
