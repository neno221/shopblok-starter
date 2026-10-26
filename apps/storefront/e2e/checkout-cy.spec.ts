import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T52 (D65, SPEC §8.4): a purchase in Cyprus against `next start` and the seeded Medusa. From the
// product page on `/`: the add and the header's count, the cart page, the three checkout steps with
// a Cypriot address (no postal code: Cyprus does not require one, T34), the seeded shipping, "Pay
// later", and the receipt with the order's number, its EUR totals and its date in Europe/Nicosia.
// The same purchase without JavaScript once the cart has a line (the add needs JavaScript, T49);
// an action's answer for a field the browser did not check; and the receipt for nobody else: a
// visitor without the browser's receipt, and one with a forged one, get the not-found page. Next keeps the
// pages a visitor came from in the document, hidden (`<Activity>`), so the locators take the
// visible ones: roles, or `:visible`.

const HANDLE = "demo-heritage-hoodie";
const el = catalogs.el;
const ADDRESS = {
  firstName: "Μαρία",
  lastName: "Γεωργίου",
  address1: "Λεωφόρος Μακαρίου 10",
  city: "Λευκωσία",
};

/** The product's first variant's URL, from the page's JSON-LD (as catalog.spec.ts does). */
async function variantPath(page: Page): Promise<string> {
  const html = await (await page.request.get(`/products/${HANDLE}`)).text();
  const text = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1] ?? "";
  const graph = (
    JSON.parse(text) as { "@graph": { "@type": string; offers?: { url: string }[] }[] }
  )["@graph"];
  const url = graph.find((node) => node["@type"] === "Product")?.offers?.[0]?.url;
  if (url === undefined) throw new Error("the product has no offer");
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}

/** Adds the product's first variant from its page: the quick cart opens on it. */
async function add(page: Page): Promise<void> {
  await page.goto(await variantPath(page));
  const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
  await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  await box.locator('[data-slot="buy-box-add"]').click();
  await expect(page.locator('[data-slot="quick-cart"]')).toBeVisible();
}

/** Adds, closes the quick cart and waits for the header's count. */
async function addToCart(page: Page): Promise<void> {
  await add(page);
  await page.keyboard.press("Escape");
  await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1");
}

/** A context with JavaScript off that carries `from`'s cookies (the cart). */
async function withoutScripts(browser: Browser, from: BrowserContext): Promise<BrowserContext> {
  return browser.newContext({
    javaScriptEnabled: false,
    storageState: await from.storageState(),
  });
}

async function fillContact(page: Page, email: string): Promise<void> {
  await page.getByLabel(el.templates.checkout.contact.email, { exact: true }).fill(email);
  const form = page.locator('[data-slot="address-form"]:visible');
  await form
    .getByLabel(el.molecules.addressForm.labels.firstName, { exact: true })
    .fill(ADDRESS.firstName);
  await form
    .getByLabel(el.molecules.addressForm.labels.lastName, { exact: true })
    .fill(ADDRESS.lastName);
  await form.locator('input[name="address1"]').fill(ADDRESS.address1);
  await form.locator('input[name="city"]').fill(ADDRESS.city);
}

/** The three steps from the contact page to the receipt; answers the receipt's URL. */
async function checkOut(page: Page, email: string): Promise<string> {
  await expect(page).toHaveURL(/\/checkout\/contact$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    el.organisms.checkoutSteps.title,
  );
  await fillContact(page, email);
  await page.getByRole("button", { name: el.templates.checkout.contact.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/delivery$/);
  const shipping = page.locator('[data-slot="checkout-shipping"]:visible input[type="radio"]');
  await expect(shipping).toHaveCount(1);
  await shipping.first().check({ force: true });
  await expect(page.getByText(el.organisms.paymentStep.systemName)).toBeVisible();
  await page.getByRole("button", { name: el.organisms.paymentStep.submit }).click();

  await expect(page).toHaveURL(/\/checkout\/review$/);
  const review = page.locator('[data-slot="checkout-review"]:visible');
  await expect(review).toContainText(email);
  await expect(review).toContainText(ADDRESS.address1);
  await expect(review).toContainText(el.organisms.paymentStep.systemName);
  await page.getByRole("button", { name: el.templates.checkout.review.place }).click();

  await expect(page).toHaveURL(/\/order\/order_[^/]+\/confirmed$/);
  return new URL(page.url()).pathname;
}

async function expectReceipt(page: Page, email: string): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    el.templates.orderConfirmation.title,
  );
  const number = page.locator('[data-slot="order-confirmation-number"]:visible');
  await expect(number).toHaveText(/^Παραγγελία #\d+$/);
  await expect(page.getByRole("main")).toContainText(email);
  await expect(page.locator('[data-slot="order-summary-rows"]:visible')).toContainText("€");
  // The date the order was placed, in Cyprus's time zone (D65): the timeline's `<time>` has the
  // instant, and the page writes it as Europe/Nicosia's clock reads it.
  const at = await page
    .locator('[data-slot="order-timeline"]:visible time')
    .first()
    .getAttribute("datetime");
  expect(at).not.toBeNull();
  const nicosia = new Intl.DateTimeFormat("el-CY", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Nicosia",
  }).format(new Date(at as string));
  await expect(page.locator('[data-slot="order-confirmation-placed"]:visible')).toContainText(
    nicosia,
  );
  // The cart is gone: the header has no count, and the cart page is empty.
  await page.goto("/cart");
  await expect(page.locator('[data-slot="cart-lines"]:visible')).toHaveCount(0);
}

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
    const receipt = await checkOut(page, email);
    await expectReceipt(page, email);
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
    await checkOut(page, email);
    await expectReceipt(page, email);
    await context.close();
    await scripted.close();
  });

  test("a field the browser did not check comes back from the action with its error", async ({
    page,
  }) => {
    await addToCart(page);
    await page.goto("/checkout/contact");
    await fillContact(page, `cy-missing-${Date.now()}@example.com`);
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

  test("the receipt is the placing browser's only: anyone else, or a forged cookie, gets the 404 page", async ({
    browser,
    page,
  }) => {
    await addToCart(page);
    await page.goto("/checkout/contact");
    const email = `cy-owner-${Date.now()}@example.com`;
    const receipt = await checkOut(page, email);
    const orderId = /\/order\/([^/]+)\/confirmed/.exec(receipt)?.[1] ?? "";
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
