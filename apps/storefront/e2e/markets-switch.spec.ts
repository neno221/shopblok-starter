import { expect, test, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import { addToCart } from "./support/purchase";

// T54 (SPEC §14's e2e row, §8.5, D65): a cart moves with the visitor. Made on `/ch` (German), it
// keeps its line and its CHF on `/ch/fr` (the language switch, through the switcher's link to the
// same page); switched to `/de` it keeps the line and takes Germany's region, so the cart and the
// checkout are in EUR. And the two redirects of §8.5 that a visitor meets first: `/cy/` reaches
// `/` (markets.spec.ts checks each hop), and `/` with a recorded market goes to it.

const { de, fr } = catalogs;

/** The switcher's link to `href` from the header, at a width where the switcher is a popover. */
async function switchTo(page: Page, href: string): Promise<void> {
  await page.locator('header [data-slot="market-switcher-trigger"]').first().click();
  await page.locator(`[data-slot="market-switcher-link"][href="${href}"]`).click();
}

const cartLines = (page: Page) => page.locator('[data-slot="cart-line-item"]:visible');
const cartTotals = (page: Page) => page.locator('[data-slot="cart-summary-rows"]:visible');

test.describe("the market switch keeps the cart (T54)", () => {
  test("a cart made on /ch keeps its line on /ch/fr, and takes EUR on /de", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await addToCart(page, "/ch");
    await page.goto("/ch/cart");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(de.templates.cart.title);
    await expect(cartLines(page)).toHaveCount(1);
    await expect(cartTotals(page)).toContainText("CHF");
    const title = await cartLines(page)
      .first()
      .locator('[data-slot="cart-line-item-title"]')
      .innerText();

    await test.step("the language switch: the same cart, in French, in CHF", async () => {
      await switchTo(page, "/ch/fr");
      await page.waitForURL("**/ch/fr/cart");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(fr.templates.cart.title);
      await expect(cartLines(page)).toHaveCount(1);
      await expect(cartTotals(page)).toContainText("CHF");
      await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1");
    });

    await test.step("the country switch: the same line, in Germany's region and EUR", async () => {
      await switchTo(page, "/de");
      await page.waitForURL("**/de/cart");
      await expect(cartLines(page)).toHaveCount(1);
      await expect(cartLines(page).first()).toContainText(title);
      await expect(cartTotals(page)).toContainText("€");
      await expect(cartTotals(page)).not.toContainText("CHF");
      await page.locator('[data-slot="cart-checkout"]:visible').click();
      await expect(page).toHaveURL(/\/de\/checkout\/contact$/);
      await expect(page.locator('[data-slot="order-summary-rows"]:visible')).toContainText("€");
    });
  });

  test("/cy/ reaches /, and / goes to the market the visitor chose", async ({
    baseURL,
    context,
    request,
  }) => {
    const followed = await request.get("/cy/");
    expect(followed.status()).toBe(200);
    expect(new URL(followed.url()).pathname).toBe("/");

    await context.addCookies([{ name: "_shopblok_market", value: "en-us", url: baseURL ?? "" }]);
    const root = await context.request.get("/", { maxRedirects: 0 });
    expect(root.status()).toBe(307);
    expect(new URL(root.headers()["location"] ?? "", root.url()).pathname).toBe("/us");
  });
});
