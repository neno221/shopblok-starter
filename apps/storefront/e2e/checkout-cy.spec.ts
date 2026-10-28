import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import {
  add,
  addToCart,
  checkOut,
  expectReceipt,
  fillContact,
  orderIdOf,
  withoutScripts,
} from "./support/purchase";

// T52 (D65, SPEC §8.4): a purchase in Cyprus against `next start` and the seeded Medusa. From the
// product page on `/`: the add and the header's count, the cart page, the three checkout steps with
// a Cypriot address (no postal code: Cyprus does not require one, T34), the seeded shipping, "Pay
// later", and the receipt with the order's number, its EUR totals and its date in Europe/Nicosia.
// The same purchase without JavaScript once the cart has a line (the add needs JavaScript, T49);
// an action's answer for a field the browser did not check; and the receipt for nobody else: a
// visitor without the browser's receipt, and one with a forged one, get the not-found page. T58: a
// first name typed before the page hydrates is kept (W5's finding). Next keeps the
// pages a visitor came from in the document, hidden (`<Activity>`), so the locators take the
// visible ones: roles, or `:visible`. The steps are `support/purchase.ts`'s (T54).

const el = catalogs.el;
const CY = { prefix: "", words: el, htmlLang: "el-CY", timeZone: "Europe/Nicosia" };
const ADDRESS = {
  firstName: "Μαρία",
  lastName: "Γεωργίου",
  address1: "Λεωφόρος Μακαρίου 10",
  city: "Λευκωσία",
};

/** The contact page's step to the receipt with this spec's address. */
const buy = (page: Page, email: string) => checkOut(page, { words: el, email, address: ADDRESS });

test.describe("a purchase in Cyprus (T52)", () => {
  test("from the product page to the receipt, with scripts", async ({ page }) => {
    await addToCart(page);
    // The header's cart opens the drawer, and "View cart" the cart page.
    await page.locator('header a[data-slot="cart-button"]').click();
    await page.locator('[data-slot="cart-drawer-view"]').click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(el.templates.cart.title);
    await expect(page.locator('[data-slot="cart-line-item"]:visible')).toHaveCount(1);
    await page.locator('[data-slot="cart-checkout"]:visible').click();
    const email = `cy-${Date.now()}@example.com`;
    const receipt = await buy(page, email);
    await expectReceipt(page, CY, email, "€");
    // The receipt again, as the browser that placed the order.
    await page.goto(receipt);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      el.templates.orderConfirmation.title,
    );
  });

  test("the same purchase without scripts", async ({ browser }) => {
    const scripted = await browser.newContext();
    await addToCart(await scripted.newPage());
    const context = await withoutScripts(browser, scripted);
    const page = await context.newPage();
    await page.goto("/cart");
    // Playwright turns scripts off without `(scripting: none)` matching, so the cart line's no-script
    // quantity form stays hidden here (`noscript:`); the checkout's forms are always drawn.
    await expect(page.locator('[data-slot="cart-line-item"]:visible')).toHaveCount(1);
    await page.locator('[data-slot="cart-checkout"]:visible').click();
    const email = `cy-noscript-${Date.now()}@example.com`;
    await buy(page, email);
    await expectReceipt(page, CY, email, "€");
    await context.close();
    await scripted.close();
  });

  test("a field the browser did not check comes back from the action with its error", async ({
    page,
  }) => {
    await addToCart(page);
    await page.goto("/checkout/contact");
    await fillContact(page, el, `cy-missing-${Date.now()}@example.com`, ADDRESS);
    await page.locator('[data-slot="address-form"] input[name="address1"]').fill("");
    // The browser would stop an empty required field; the action must refuse it on its own.
    await page.locator('[data-slot="address-form"]').evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });
    await page.getByRole("button", { name: el.templates.checkout.contact.submit }).click();
    await expect(page).toHaveURL(/\/checkout\/contact\?f=/);
    const field = page.locator('[data-slot="address-form"] input[name="address1"]');
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[data-slot="address-form-status"]')).not.toBeEmpty();
    // What was typed is kept.
    await expect(page.locator('[data-slot="address-form"] input[name="city"]')).toHaveValue(
      ADDRESS.city,
    );
  });

  test("what is typed before the page hydrates is kept (T58)", async ({ page }) => {
    await addToCart(page);
    // The page's scripts wait until the first name is typed: the field is the server's HTML only.
    // A route turns the browser's cache off, so every chunk comes through here.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/_next\/static\/.+\.js(\?|$)/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/checkout/contact", { waitUntil: "commit" });
    const form = page.locator('[data-slot="address-form"]:visible');
    const firstName = form.locator('input[name="firstName"]');
    // Typed key by key, as a shopper does: React keeps the page's text when it hydrates, but not
    // in the fields' state, and the next render wrote that state (empty) back (W5).
    await firstName.pressSequentially(ADDRESS.firstName);
    // Hydrated: React has put its own keys on the field's element.
    const hydrated = () =>
      firstName.evaluate((input) =>
        Object.keys(input).some((key) => key.startsWith("__reactFiber")),
      );
    expect(await hydrated()).toBe(false);
    release();
    await expect.poll(hydrated).toBe(true);
    await expect(firstName).toHaveValue(ADDRESS.firstName);
    // Another field's keystroke renders the fields again: the first name stays.
    await form.locator('input[name="lastName"]').pressSequentially(ADDRESS.lastName);
    await expect(firstName).toHaveValue(ADDRESS.firstName);
    // And the step takes it.
    const email = `cy-early-${Date.now()}@example.com`;
    await fillContact(page, el, email, { address1: ADDRESS.address1, city: ADDRESS.city });
    await page.getByRole("button", { name: el.templates.checkout.contact.submit }).click();
    await expect(page).toHaveURL(/\/checkout\/delivery$/);
  });

  test("the receipt is the placing browser's only: anyone else, or a forged cookie, gets the 404 page", async ({
    browser,
    page,
  }) => {
    await addToCart(page);
    await page.goto("/checkout/contact");
    const email = `cy-owner-${Date.now()}@example.com`;
    const receipt = await buy(page, email);
    const orderId = orderIdOf(receipt);
    // Next answers a page's `notFound()` with a 200 whose document the browser draws from the
    // payload (the not-found page, with `noindex`), so the stranger is checked twice: what a browser
    // shows, and that the HTML carries neither the order's e-mail nor its address.
    const isNotFound = async (context: BrowserContext) => {
      const html = await (await context.request.get(receipt)).text();
      expect(html).toContain('<meta name="robots" content="noindex"/>');
      expect(html).not.toContain(email);
      expect(html).not.toContain(ADDRESS.address1);
      const view = await context.newPage();
      await view.goto(receipt);
      await expect(view.locator('[data-slot="not-found-template"]:visible')).toHaveCount(1);
      await expect(view.locator("body")).not.toContainText(email);
      await view.close();
    };
    const stranger = await browser.newContext();
    await isNotFound(stranger);
    await stranger.addCookies([
      { name: "_shopblok_receipt", value: `${orderId}.forged`, url: page.url() },
    ]);
    await isNotFound(stranger);
    await stranger.close();
    const own = await (await page.request.get(receipt)).text();
    expect(own).not.toContain('data-slot="not-found-template"');
    expect(own).toContain(email);
  });
  test("the header's quick cart after an add, and the drawer changes the cart in place", async ({
    page,
  }) => {
    await add(page);
    // The quick cart opens on the line just added.
    const quick = page.locator('[data-slot="quick-cart"]');
    await expect(page.locator('header [data-slot="quick-cart-badge"]')).toHaveText("1");
    await expect(quick.locator('[data-slot="quick-cart-title"]')).not.toBeEmpty();
    await page.keyboard.press("Escape");
    await expect(quick).toBeHidden();
    // Focus goes back to where it was: the add button.
    await expect(
      page.locator('[data-slot="buy-box-island"] [data-slot="buy-box-add"]'),
    ).toBeFocused();
    const link = page.locator('header a[data-slot="cart-button"]');
    // A click on the cart opens the drawer instead of the cart page.
    await link.click();
    const drawer = page.locator('[data-slot="cart-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(page).not.toHaveURL(/\/cart$/);
    await expect(drawer.locator('[data-slot="cart-line-item"]')).toHaveCount(1);
    // Removing the line answers an empty drawer, and the header's count follows.
    await drawer.locator('[data-slot="cart-line-item-remove"]').click();
    await expect(drawer.locator('[data-slot="cart-line-item"]')).toHaveCount(0);
    await expect(drawer.locator('[data-slot="empty-state"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    // The drawer's button now stands where the link was, with focus back on it and no count.
    const trigger = page.locator('header [data-slot="cart-drawer-trigger"]');
    await expect(trigger).toBeFocused();
    await expect(trigger.locator('[data-slot="cart-drawer-badge"]')).toHaveCount(0);
  });
});
