import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Response } from "@playwright/test";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { HANDLE } from "./support/purchase";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T83 (D101, D102, SETUP.md "Product page and quick view variants (T83)"): the quick view and the
// product page's layouts, against `next start` and the seeded Medusa. An admin publishes the
// templates global with the listing's `quick-add` card and a quick view; on `/us/store` the card's
// button then opens the dialog from the keyboard, the dialog adds a variant to the cart and Escape
// gives focus back to the button. The dialog's code is not in the listing's first load: no script
// the page loads before the press holds the island's marker, and one loaded after it does. With
// the quick view off the card is M3's ("Choose options", to the product's page); without scripts
// the quick view's button is the way to the product's page. `/next/quick-view` answers the
// market's product and a 404 for anything else. Every product page layout draws the product in `/`
// and `/us` with no axe violation. `afterAll` publishes the global as it was, in every language.

const LISTING = "/us/store";
const PRODUCT = `/us/products/${HANDLE}`;
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LAYOUTS = ["default", "thumbnails-below", "grid", "stacked", "wide", "centered"] as const;
/** The quick view island's marker (`scripts/first-load.ts`, `keptOut`). */
const MARKER = "shopblok:quick-view-island";

/** Every picker on its family's first member: M4's shop (the seed's values), with these changes. */
const templatesWith = (changes: GlobalData): GlobalData => ({
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard" },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: "default" },
  receipt: { variant: "default" },
  ...changes,
});

/** Whether `path`'s HTML holds `text` (one request). */
const holds = async (path: string, text: string) =>
  (await (await fetch(`${base()}${path}`)).text()).includes(text);

/** The card of the purchase's product on the listing, the server's (the island is not active). */
const cardOf = (page: Page) =>
  page.locator(
    `[data-slot="product-listing-region"] [data-slot="product-card"]:has(a[href$="/products/${HANDLE}"])`,
  );

test.describe("the quick view and the product page's layouts (T83)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let published: GlobalData | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "templates");
  });

  test.afterAll(async () => {
    if (published === undefined) return;
    await publishGlobal(token, "templates", published, "all");
    const card = ((published["listing"] ?? {}) as { card?: string }).card ?? "standard";
    await freshWithinTwo(() => holds(LISTING, `data-variant="${card}"`), 1_500);
  });

  const publish = async (changes: GlobalData, path: string, text: string) => {
    await settled(path);
    await publishGlobal(token, "templates", templatesWith(changes));
    expect(
      await freshWithinTwo(() => holds(path, text), 1_500),
      "the published pick within two requests",
    ).toBeGreaterThan(0);
  };

  for (const member of ["default", "drawer"] as const)
    test(`on (${member}): a card opens it by keyboard, it adds to the cart, its code loads on the press`, async ({
      page,
    }) => {
      await publish(
        { listing: { variant: "default", card: "quick-add" }, quickView: { variant: member } },
        LISTING,
        `data-slot="quick-view-trigger" data-variant="${member}"`,
      );
      const scripts: Response[] = [];
      page.on("response", (response) => {
        if (response.request().resourceType() === "script") scripts.push(response);
      });
      const hasMarker = async (responses: Response[]) => {
        const texts = await Promise.all(responses.map((each) => each.text().catch(() => "")));
        return texts.some((text) => text.includes(MARKER));
      };

      await page.goto(LISTING);
      await page.waitForLoadState("networkidle");
      // The island is drawn in the browser only: once it is there the page has hydrated.
      await expect(page.locator('[data-slot="listing-island"]')).toBeAttached();
      const firstLoad = scripts.length;
      expect(firstLoad, "the listing loaded its scripts").toBeGreaterThan(0);
      expect(await hasMarker(scripts), "the quick view's code is not in the first load").toBe(
        false,
      );

      const trigger = cardOf(page).locator('[data-slot="quick-view-trigger"]');
      await expect(trigger).toHaveAttribute("data-variant", member);
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toHaveAttribute("data-variant", member);
      expect(await hasMarker(scripts.slice(firstLoad)), "its code came with the press").toBe(true);
      // The page did not move: the listing is still the address.
      expect(new URL(page.url()).pathname).toBe(LISTING);

      // A whole choice, from the keyboard: each option's first value that can be bought.
      const box = dialog.locator('[data-slot="buy-box"]');
      for (const group of await box.getByRole("radiogroup").all()) {
        const first = group.getByRole("radio").first();
        await first.focus();
        await page.keyboard.press("Space");
      }
      const add = box.locator('button[type="submit"]').first();
      await expect(add).not.toHaveAttribute("aria-disabled");
      await add.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator('header [data-slot="cart-badge"]')).toHaveText("1", {
        timeout: 20_000,
      });
      await expect(dialog).toBeVisible();
      // "View full details" opens the product's page on the choice.
      await expect(dialog.locator('[data-slot="quick-view-details"]')).toHaveAttribute(
        "href",
        new RegExp(`/products/${HANDLE}\\?variant=`),
      );

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });

  test("off: the quick-add card is M3's, and without scripts the quick view's button opens the page", async ({
    page,
    browser,
  }) => {
    await publish(
      { listing: { variant: "default", card: "quick-add" } },
      LISTING,
      'data-slot="product-card-quick-add"',
    );
    await page.goto(LISTING);
    const card = cardOf(page);
    await expect(card.locator('[data-slot="quick-view-trigger"]')).toHaveCount(0);
    await expect(card.locator('[data-slot="product-card-quick-add"]')).toHaveAttribute(
      "data-intent",
      "choose",
    );
    await card.locator('[data-slot="product-card-quick-add"] button').click();
    await expect(page).toHaveURL(new RegExp(`/us/products/${HANDLE}`));
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await publish(
      { listing: { variant: "default", card: "quick-add" }, quickView: { variant: "compact" } },
      LISTING,
      'data-slot="quick-view-trigger" data-variant="compact"',
    );
    const context = await browser.newContext({ javaScriptEnabled: false });
    const still = await context.newPage();
    await still.goto(LISTING);
    const trigger = cardOf(still).locator('[data-slot="quick-view-trigger"]');
    await trigger.focus();
    await still.keyboard.press("Enter");
    await expect(still).toHaveURL(new RegExp(`/us/products/${HANDLE}`));
    await context.close();
  });

  test("/next/quick-view answers the market's product, and 404 for anything else", async () => {
    const ask = (query: string) => fetch(`${base()}/next/quick-view?${query}`);
    const known = await ask(`market=en-us&handle=${HANDLE}`);
    expect(known.status).toBe(200);
    expect(known.headers.get("cache-control")).toContain("max-age=60");
    const answer = (await known.json()) as {
      box: { product: { handle: string; variants: { price: { currencyCode: string } }[] } };
      locale: string;
    };
    expect(answer.box.product.handle).toBe(HANDLE);
    expect(answer.locale).toBe("en-US");
    expect(answer.box.product.variants[0]?.price.currencyCode.toLowerCase()).toBe("usd");
    // A route that ignored the market (a default region) would answer these.
    expect((await ask(`market=nope&handle=${HANDLE}`)).status).toBe(404);
    expect((await ask(`handle=${HANDLE}`)).status).toBe(404);
    expect((await ask("market=en-us&handle=no-such-product")).status).toBe(404);
    expect((await ask("market=en-us")).status).toBe(404);
  });

  for (const layout of LAYOUTS)
    test(`the product page's ${layout} layout draws the product in / and /us with no axe violation`, async ({
      page,
    }) => {
      await publish(
        { productPage: { variant: layout } },
        PRODUCT,
        `data-slot="product-detail-template" data-variant="${layout}"`,
      );
      for (const path of [`/products/${HANDLE}`, PRODUCT]) {
        const drawn = `data-slot="product-detail-template" data-variant="${layout}"`;
        expect(await freshWithinTwo(() => holds(path, drawn), 1_500), path).toBeGreaterThan(0);
        await page.goto(path);
        const main = page.locator('main#main[data-slot="product-detail-template"]');
        await expect(main).toHaveAttribute("data-variant", layout);
        await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(main.locator('[data-slot="buy-box-island"]')).toBeAttached();
        const axe = await new AxeBuilder({ page }).include("main#main").withTags(axeTags).analyze();
        expect(
          axe.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
          `${layout} at ${path}`,
        ).toEqual([]);
      }
    });
});
