import { expect, test } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import {
  addToCart,
  checkOut,
  expectReceipt,
  fillContact,
  withoutScripts,
} from "./support/purchase";

// T54 (SPEC §17.1, M3's "keyless E2E in US and CY"): the purchase of `checkout-cy.spec.ts` from
// `/us`, against `next start` and the seeded Medusa: English copy, a US address (the state and the
// ZIP code are required there, and a ZIP is five digits or ZIP+4: T34's data), the seeded
// shipping, "Pay later", and the receipt with its USD totals and its date in America/New_York. Once
// with scripts, once without them after the add; and the state and ZIP refused by the action when
// the browser does not check them. The steps are `support/purchase.ts`'s.

const en = catalogs.en;
const US = { prefix: "/us", words: en, htmlLang: "en-US", timeZone: "America/New_York" };
const ADDRESS = {
  firstName: "Grace",
  lastName: "Hopper",
  address1: "350 Fifth Avenue",
  city: "New York",
  province: "NY",
  postalCode: "10118",
};

test.describe("a purchase in the US (T54)", () => {
  test("from the product page to the receipt, with scripts", async ({ page }) => {
    await addToCart(page, US.prefix);
    await page.locator('header a[data-slot="cart-button"]').click();
    await page.locator('[data-slot="cart-drawer-view"]').click();
    await expect(page).toHaveURL(/\/us\/cart$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(en.templates.cart.title);
    await expect(page.locator('[data-slot="cart-line-item"]:visible')).toHaveCount(1);
    await expect(page.locator('[data-slot="cart-summary-rows"]:visible')).toContainText("$");
    await page.locator('[data-slot="cart-checkout"]:visible').click();
    const email = `us-${Date.now()}@example.com`;
    await checkOut(page, { words: en, email, address: ADDRESS });
    await expect(page.getByRole("main")).toContainText(`${ADDRESS.city}, ${ADDRESS.province}`);
    await expectReceipt(page, US, email, "$");
  });

  test("the same purchase without scripts", async ({ browser }) => {
    const scripted = await browser.newContext();
    await addToCart(await scripted.newPage(), US.prefix);
    const context = await withoutScripts(browser, scripted);
    const page = await context.newPage();
    await page.goto(`${US.prefix}/cart`);
    await expect(page.locator('[data-slot="cart-line-item"]:visible')).toHaveCount(1);
    await page.locator('[data-slot="cart-checkout"]:visible').click();
    const email = `us-noscript-${Date.now()}@example.com`;
    await checkOut(page, { words: en, email, address: ADDRESS });
    await expectReceipt(page, US, email, "$");
    await context.close();
    await scripted.close();
  });

  test("the action refuses a US address without a state, and a ZIP code that is not one", async ({
    page,
  }) => {
    await addToCart(page, US.prefix);
    await page.goto(`${US.prefix}/checkout/contact`);
    await fillContact(page, en, `us-missing-${Date.now()}@example.com`, {
      ...ADDRESS,
      province: "",
      postalCode: "1011",
    });
    const form = page.locator('[data-slot="address-form"]');
    // The browser would stop both itself; the action must refuse them on its own.
    await form.evaluate((element) => {
      (element as HTMLFormElement).noValidate = true;
    });
    await page.getByRole("button", { name: en.templates.checkout.contact.submit }).click();
    await expect(page).toHaveURL(/\/us\/checkout\/contact\?f=/);
    await expect(form.locator('[name="province"]')).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator('input[name="postalCode"]')).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator('input[name="address1"]')).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // What was typed is kept.
    await expect(form.locator('input[name="postalCode"]')).toHaveValue("1011");
    await expect(form.locator('input[name="city"]')).toHaveValue(ADDRESS.city);
  });
});
