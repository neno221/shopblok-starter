import { expect, test, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";
import { add, addToCart, HANDLE, variantPath, withoutScripts } from "./support/purchase";
import { adminToken, base, freshWithinTwo } from "./support/server";

// T85 (D101, SETUP.md "Cart variants (T85)"): the cart page's four layouts and the mini cart's
// two members against `next start` and the seeded Medusa. An admin publishes each choice on the
// templates global's Cart tab. On `/us/cart` each layout changes a line's quantity and applies a
// promotion code with scripts (the stepper, the field's disclosure) and without (the number field
// and "Update", the native disclosure), every change a plain form. A click on the header's cart
// opens the mini cart the global names (the drawer, the drawer with picks) or goes to the cart
// page; an add on a product page opens the quick cart on the line just added, or nothing when it
// is off. A pick added from the drawer joins its lines and leaves the picks, and the picks are in
// the market's currency. `beforeAll` makes a promotion code in Medusa and `afterAll` deletes it and
// publishes the global as it was, in every language.

const en = catalogs.en;
const LAYOUTS = ["default", "table", "sticky-summary", "focused"] as const;
type Layout = (typeof LAYOUTS)[number];
const PRODUCT = `/us/products/${HANDLE}`;

/** Every picker on its family's first member (M4's shop), but these cart pickers. */
const templatesWith = (cart: GlobalData): GlobalData => ({
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown", ...cart },
  checkout: { variant: "default" },
  receipt: { variant: "default" },
});

/** Whether the cart page's static shell draws `layout` (its root says which member it is). */
const cartDraws = async (layout: Layout) =>
  new RegExp(`data-slot="cart-template" data-variant="${layout}"`).test(
    await (await fetch(`${base()}/us/cart`)).text(),
  );

/** Whether the product page's header gives its cart island these pickers (its props). */
const pickersOn = async (miniCart: string, quickCart: string) => {
  const html = await (await fetch(`${base()}${PRODUCT}`)).text();
  const prop = (name: string, value: string) =>
    new RegExp(`\\\\?"${name}\\\\?":\\\\?"${value}\\\\?"`).test(html);
  return prop("miniCart", miniCart) && prop("quickCart", quickCart);
};

const publish = async (token: string, cart: GlobalData, fresh: () => Promise<boolean>) => {
  await publishGlobal(token, "templates", templatesWith(cart));
  expect(await freshWithinTwo(fresh), "the published picks within two requests").toBeGreaterThan(0);
};

const count = (page: Page) => page.locator('h1 [data-slot="cart-count"]');
const items = (n: number) => (n === 1 ? "1 item" : `${n} items`);

/** Applies `code` in the cart page's promotion field (its disclosure opened first). */
async function applyCode(page: Page, code: string) {
  const summary = page.locator('[data-slot="cart-summary"]:visible');
  await summary.getByText(en.molecules.promoCodeField.toggle).click();
  await summary.getByLabel(en.molecules.promoCodeField.label).fill(code);
  await summary.getByRole("button", { name: en.molecules.promoCodeField.apply }).click();
  await expect(summary.locator('[data-slot="promo-code-chip"]')).toContainText(code);
}

/** The header's cart, clicked until the drawer it opens says it is `variant` (a stale read). */
async function openMiniCart(page: Page, variant: string) {
  const drawer = page.locator('[data-slot="cart-drawer"]');
  await expect(async () => {
    if (await drawer.isVisible()) await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await page
      .locator('header [data-slot="cart-island"] button, header a[data-slot="cart-button"]')
      .first()
      .click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("data-variant", variant);
  }).toPass({ timeout: 20_000 });
  return drawer;
}

test.describe("the cart's variants (T85)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let published: GlobalData | undefined;
  const code = `T85${Date.now()}`;
  let promotionId = "";

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "templates");
    const medusa = medusaUrl();
    const admin = await medusaAdminToken(medusa);
    const { promotion } = await medusaAdminApi<{ promotion: { id: string } }>(
      medusa,
      admin,
      "POST",
      "/admin/promotions",
      {
        code,
        type: "standard",
        status: "active",
        is_automatic: false,
        application_method: {
          type: "percentage",
          target_type: "order",
          allocation: "across",
          value: 10,
        },
      },
    );
    promotionId = promotion.id;
  });

  test.afterAll(async () => {
    // Not a test: the promotion deleted, and the global as it was, published in every language.
    if (promotionId !== "") {
      const medusa = medusaUrl();
      await medusaAdminApi(
        medusa,
        await medusaAdminToken(medusa),
        "DELETE",
        `/admin/promotions/${promotionId}`,
      );
    }
    if (published === undefined) return;
    await publishGlobal(token, "templates", published, "all");
    const cart = (published["cart"] ?? {}) as { miniCart?: string; quickCart?: string };
    await freshWithinTwo(() => pickersOn(cart.miniCart ?? "drawer", cart.quickCart ?? "dropdown"));
  });

  for (const layout of LAYOUTS) {
    test(`${layout}: a quantity and a promotion code, with scripts and without`, async ({
      page,
      browser,
    }) => {
      await publish(token, { variant: layout }, () => cartDraws(layout));
      await addToCart(page, "/us");
      await page.goto("/us/cart");
      const root = page.locator('[data-slot="cart-template"]:visible');
      await expect(root).toHaveAttribute("data-variant", layout);
      await expect(count(page)).toHaveText(items(1));

      // With scripts: the stepper sends its form by itself, and the field's disclosure opens.
      await page.getByRole("button", { name: /^Increase quantity/ }).click();
      await expect(count(page)).toHaveText(items(2));
      await applyCode(page, code);

      // Without scripts: the number field and "Update", the code taken off and applied again.
      const context = await withoutScripts(browser, page.context());
      const plain = await context.newPage();
      await plain.goto("/us/cart");
      await expect(plain.locator('[data-slot="cart-template"]')).toHaveAttribute(
        "data-variant",
        layout,
      );
      await expect(count(plain)).toHaveText(items(2));
      await plain.getByRole("spinbutton", { name: /^Quantity/ }).fill("3");
      await plain.getByRole("button", { name: /^Update quantity/ }).click();
      await expect(count(plain)).toHaveText(items(3));
      await plain.getByRole("button", { name: `Remove promotion code ${code}` }).click();
      await expect(plain.locator('[data-slot="promo-code-chip"]')).toHaveCount(0);
      await applyCode(plain, code);
      await context.close();
    });
  }

  test("a click on the header's cart opens the mini cart the global names, or the cart page", async ({
    page,
  }) => {
    await addToCart(page, "/us");
    for (const miniCart of ["drawer", "drawer-picks"] as const) {
      await publish(token, { miniCart }, () => pickersOn(miniCart, "dropdown"));
      await page.goto(PRODUCT);
      const drawer = await openMiniCart(page, miniCart);
      await expect(drawer.locator('[data-slot="cart-picks"]')).toHaveCount(
        miniCart === "drawer-picks" ? 1 : 0,
      );
      await page.keyboard.press("Escape");
    }
    await publish(token, { miniCart: "page" }, () => pickersOn("page", "dropdown"));
    await page.goto(PRODUCT);
    await page.locator('header a[data-slot="cart-button"]').click();
    await expect(page).toHaveURL(/\/us\/cart$/);
  });

  test("an add opens the quick cart on the line just added, and nothing with it off", async ({
    page,
  }) => {
    await publish(token, { quickCart: "dropdown" }, () => pickersOn("drawer", "dropdown"));
    await add(page, "/us");
    const quick = page.locator('[data-slot="quick-cart"]');
    await expect(quick).toContainText("Heritage Hoodie");
    await page.keyboard.press("Escape");

    await publish(token, { quickCart: "off" }, () => pickersOn("drawer", "off"));
    await page.goto(await variantPath(page, "/us"));
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
    await box.locator('[data-slot="buy-box-add"]').click();
    await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("2");
    await expect(quick).toBeHidden();
  });

  test("a pick added from the drawer joins its lines; the picks are the market's", async ({
    page,
  }) => {
    await publish(token, { miniCart: "drawer-picks" }, () => pickersOn("drawer-picks", "dropdown"));
    await addToCart(page, "/us");
    const drawer = await openMiniCart(page, "drawer-picks");
    const lines = drawer.locator('[data-slot="cart-line-item"]');
    const picks = drawer.locator('[data-slot="cart-pick"]');
    await expect(lines).toHaveCount(1);
    await expect(picks.first()).toBeVisible();
    const before = await picks.count();
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThanOrEqual(4);
    // What the cart holds is no pick, and every pick is priced in the market's currency.
    const held = await lines.locator('[data-slot="cart-line-item-title"]').innerText();
    await expect(picks.filter({ hasText: held })).toHaveCount(0);
    for (const price of await picks.locator('[data-slot="price-block"]').allInnerTexts())
      expect(price, "a /us pick's price").toMatch(/\$/);

    const first = picks.first();
    const title = await first.locator('[data-slot="cart-pick-title"]').innerText();
    // One request for one add: React hands the drawer's submit to the island twice, and the
    // island sends it once (the cart's count below would say 3 otherwise).
    const sent: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"] !== undefined)
        sent.push(request.postData() ?? "");
    });
    await first.getByRole("button", { name: `Add ${title} to your cart` }).click();
    await expect(lines).toHaveCount(2);
    await expect(
      drawer.locator('[data-slot="cart-line-item-title"]', { hasText: title }),
    ).toBeVisible();
    await expect(picks.filter({ hasText: title })).toHaveCount(0);
    // The drawer's button, in the header's link's place since it opened, counts the pick too.
    await expect(page.locator('header [data-slot="cart-drawer-badge"]')).toHaveText("2");
    expect(sent.filter((body) => body.includes('"cart-pick-add"'))).toHaveLength(1);
  });
});
