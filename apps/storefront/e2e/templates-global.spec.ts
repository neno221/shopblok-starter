import { expect, test, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import { draftOf, publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { adminHeaders } from "./support/payload-rest";
import { add, addToCart, checkOut, HANDLE, variantPath } from "./support/purchase";
import { adminToken, base, freshWithinTwo } from "./support/server";

// T79 (D101): the `templates` global, against `next start` and the seeded Medusa. An admin
// publishes it with every family's first variant, and every commerce page draws as before: each
// template's root says it is the `default` member (`data-variant`), a click on the header's cart
// opens the drawer and an add opens the quick cart. A draft of the global changes nothing for a
// shopper. Published, the cart's two pickers do change the shop: the cart page on a click, nothing
// after an add. `afterAll` publishes the global as it was, in every language.

const en = catalogs.en;
const ADDRESS = {
  firstName: "Ada",
  lastName: "Lovelace",
  address1: "350 Fifth Avenue",
  city: "New York",
  province: "NY",
  postalCode: "10118",
};

/**
 * Every picker on its family's first member, the quick view off: M4's shop (the seed's values).
 * T84's card picker too: its first card is M3's.
 */
const FIRST_VARIANTS: GlobalData = {
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: "default" },
  receipt: { variant: "default" },
};

/** The cart's pickers that change what a shopper sees: the cart page on a click, no quick cart. */
const CART_PAGE: GlobalData = {
  ...FIRST_VARIANTS,
  cart: { variant: "default", miniCart: "page", quickCart: "off" },
};

const PRODUCT = `/us/products/${HANDLE}`;

/** The template root on the page, and the member it says it is. */
const expectRoot = async (page: Page, template: string) =>
  expect(page.locator(`[data-slot="${template}-template"]:visible`)).toHaveAttribute(
    "data-variant",
    "default",
  );

/** Whether the product page's HTML gives the header's cart these pickers (its island's props). */
const pickersOn = async (miniCart: string, quickCart: string) => {
  const html = await (await fetch(`${base()}${PRODUCT}`)).text();
  const prop = (name: string, value: string) =>
    new RegExp(`\\\\?"${name}\\\\?":\\\\?"${value}\\\\?"`).test(html);
  return prop("miniCart", miniCart) && prop("quickCart", quickCart);
};

test.describe("the templates global (T79)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let published: GlobalData | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "templates");
  });

  test.afterAll(async () => {
    // Not a test: the global as it was, published in every language (which also replaces the
    // test's draft), then settled, so the next spec reads it from its first request.
    if (published === undefined) return;
    await publishGlobal(token, "templates", published, "all");
    const cart = (published["cart"] ?? {}) as { miniCart?: string; quickCart?: string };
    await freshWithinTwo(() => pickersOn(cart.miniCart ?? "drawer", cart.quickCart ?? "dropdown"));
  });

  test("published with every first variant, every commerce page draws as before", async ({
    page,
  }) => {
    await publishGlobal(token, "templates", FIRST_VARIANTS);
    expect(
      await freshWithinTwo(() => pickersOn("drawer", "dropdown")),
      "the published picks within two requests",
    ).toBeGreaterThan(0);

    await page.goto(PRODUCT);
    await expectRoot(page, "product-detail");
    // An add opens the quick cart (`add` waits for it), a click on the header's cart the drawer.
    await add(page, "/us");
    await page.keyboard.press("Escape");
    await page.locator('header a[data-slot="cart-button"]').click();
    await expect(page.locator('[data-slot="cart-drawer"]')).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/us/store");
    await expectRoot(page, "product-listing");
    // The search page follows the listing's picker (D101), through its own template.
    await page.goto("/us/search?q=hoodie");
    await expectRoot(page, "search-results");
    await page.goto("/us/cart");
    await expectRoot(page, "cart");
    await page.locator('[data-slot="cart-checkout"]:visible').click();
    await expectRoot(page, "checkout");
    await checkOut(page, {
      words: en,
      email: `templates-${Date.now()}@example.com`,
      address: ADDRESS,
    });
    await expectRoot(page, "order-confirmation");
  });

  test("a draft of the global changes nothing for a shopper", async ({ page }) => {
    const saved = await fetch(`${base()}/api/globals/templates?draft=true&locale=en&depth=0`, {
      method: "POST",
      headers: { ...adminHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ ...CART_PAGE, _status: "draft" }),
    });
    expect(saved.status, await saved.clone().text()).toBe(200);
    expect(((await draftOf(token, "templates"))["cart"] as GlobalData)["miniCart"]).toBe("page");

    // Two requests, as a publish would need: still the published picks.
    expect(await pickersOn("drawer", "dropdown")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await pickersOn("drawer", "dropdown")).toBe(true);
    await addToCart(page, "/us");
    await page.locator('header a[data-slot="cart-button"]').click();
    await expect(page.locator('[data-slot="cart-drawer"]')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${PRODUCT}`));
  });

  test("published, the cart's pickers change the shop: the cart page on a click, no quick cart", async ({
    page,
  }) => {
    await publishGlobal(token, "templates", CART_PAGE);
    expect(
      await freshWithinTwo(() => pickersOn("page", "off")),
      "the published picks within two requests",
    ).toBeGreaterThan(0);
    // The first variant's page, so the add button is ready (as `add` does).
    await page.goto(await variantPath(page, "/us"));
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
    await box.locator('[data-slot="buy-box-add"]').click();
    await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1");
    await expect(page.locator('[data-slot="quick-cart"]')).toBeHidden();
    await page.locator('header a[data-slot="cart-button"]').click();
    await expect(page).toHaveURL(/\/us\/cart$/);
    await expect(page.locator('[data-slot="cart-drawer"]')).toBeHidden();
  });
});
