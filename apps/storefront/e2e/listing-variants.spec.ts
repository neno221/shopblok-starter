import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { publishGlobal, snapshotGlobal, type GlobalData } from "./support/globals";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T84 (D59, D101, SETUP.md "Listing variants (T84)"): the listing's seven filter layouts against
// `next start` and the seeded Medusa. An admin publishes each layout on the templates global's
// Listing tab; on `/us/store` the visitor then filters by a colour and a top price from the
// keyboard: with scripts the listing's URL takes the query and the island draws the results in the
// same layout; without scripts the form lands on `/search`, which follows the listing's layout and
// shows the same products. Every layout's results are the same products as the default layout's.
// The Listing tab's card picker puts its card in the listing's grid, the island's and the search
// page's. `afterAll` publishes the global as it was, in every language.
//
// Without scripts a Base UI swatch is a button that cannot be ticked (SETUP.md, M2's filter
// group): the visitor's form still sends the hidden box beside it, which the test ticks directly. The chips layout's boxes are native, so there the keyboard ticks them.

const LAYOUTS = ["default", "top-bar", "drawer", "accordion", "chips", "rail", "inline"] as const;
type Layout = (typeof LAYOUTS)[number];

const LISTING = "/us/store";
const COLOUR = "Navy";
const TOP_PRICE = "40";

/** Every picker on its family's first member: M4's shop (the seed's values), but this listing. */
const templatesWith = (listing: GlobalData): GlobalData => ({
  productPage: { variant: "default" },
  listing: { variant: "default", card: "standard", ...listing },
  quickView: { variant: "off" },
  cart: { variant: "default", miniCart: "drawer", quickCart: "dropdown" },
  checkout: { variant: "default" },
  receipt: { variant: "default" },
});

type Group = {
  id: string;
  kind: string;
  label: string;
  options?: { value: string; label: string }[];
};

/** The demo's colour facet and its Navy value, as the listing's own answer names them. */
async function colourFacet(): Promise<{ name: string; value: string }> {
  const response = await fetch(`${base()}/next/listing?market=en-us&scope=store&sort=newest`);
  const body = (await response.json()) as { filters: { groups: Group[] } };
  const group = body.filters.groups.find((g) => g.kind === "swatch");
  const option = group?.options?.find((o) => o.label === COLOUR);
  if (group === undefined || option === undefined) throw new Error(`no ${COLOUR} swatch`);
  return { name: group.id, value: option.value };
}

const SEARCH = "/us/search?q=tee";

/**
 * Whether `/us/store`'s HTML and the search page's both hold `text`. Both are asked each time:
 * each page is fresh within its own two requests.
 */
const bothHold = async (text: string) => {
  const pages = await Promise.all(
    [LISTING, SEARCH].map(async (path) => (await fetch(`${base()}${path}`)).text()),
  );
  return pages.every((html) => html.includes(text));
};

/** Whether the listing and the search page draw `layout` (their results' root says which). */
const draws = (layout: Layout) => bothHold(`data-layout="${layout}"`);

/** The products a set of results shows, by their links, in order. */
const productsIn = (results: Locator) =>
  results
    .locator('[data-slot="product-card-title"] a')
    .evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    );

/** Opens what holds a group in `layout`, from the keyboard (a closed container hides its field). */
async function reveal(page: Page, layout: Layout, group: "Color" | "Price", scripts: boolean) {
  const press = async (target: Locator) => {
    await target.focus();
    await page.keyboard.press("Enter");
  };
  switch (layout) {
    case "top-bar":
    case "rail":
      // One popover open at a time (`popover="auto"`); the other's ticks stay in the form.
      await press(
        page.locator('[data-slot="filter-popover-trigger"]:visible').filter({ hasText: group }),
      );
      await expect(page.locator('[data-slot="filter-popover"]:popover-open')).toHaveCount(1);
      return;
    case "accordion": {
      const disclosure = page
        .locator('[data-slot="filter-disclosure"]:visible')
        .filter({ has: page.locator("summary", { hasText: group }) });
      if ((await disclosure.getAttribute("open")) === null)
        await press(disclosure.locator("summary"));
      await expect(disclosure).toHaveAttribute("open", "");
      return;
    }
    case "inline": {
      const panel = page.locator('details[data-slot="filter-inline"]');
      if ((await panel.getAttribute("open")) === null) await press(panel.locator("summary"));
      await expect(panel).toHaveAttribute("open", "");
      return;
    }
    case "drawer": {
      // With scripts the drawer's sheet opens on the button; without, its form is in the page.
      const sheet = page.locator('[data-slot="filter-drawer"]');
      if (scripts && (await sheet.count()) === 0) {
        await press(page.locator('[data-slot="filter-drawer-trigger"]:visible'));
        await expect(sheet).toBeVisible();
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Filters `/us/store` by Navy and a top price from the keyboard in `layout`, and sends the form
 * with its own Apply button.
 */
async function filter(
  page: Page,
  layout: Layout,
  scripts: boolean,
  colour: { name: string; value: string },
) {
  await reveal(page, layout, "Color", scripts);
  if (scripts || layout === "chips") {
    const swatch = page.getByRole("checkbox", { name: new RegExp(`^${COLOUR}\\b`) }).filter({
      visible: true,
    });
    await swatch.focus();
    await page.keyboard.press("Space");
    await expect(swatch).toBeChecked();
  } else {
    const box = page
      .locator(`input[type="checkbox"][name="${colour.name}"][value="${colour.value}"]`)
      .filter({ visible: true });
    // A click on it lands on the swatch's disc, which needs scripts: the box is ticked as such.
    await box.evaluate((input) => ((input as HTMLInputElement).checked = true));
    await expect(box).toBeChecked();
  }
  await reveal(page, layout, "Price", scripts);
  const top = page.locator('input[name="price.max"]:visible');
  await top.focus();
  await page.keyboard.type(TOP_PRICE);
  const apply = top
    .locator("xpath=ancestor::form[1]")
    .locator('button[type="submit"]:visible')
    .first();
  await apply.focus();
  await page.keyboard.press("Enter");
}

test.describe("the listing's filter layouts (T84)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let token = "";
  let published: GlobalData | undefined;
  let colour = { name: "", value: "" };
  /** The default layout's products for the filter, the answer every layout has to give. */
  let expected: string[] = [];

  test.beforeAll(async () => {
    token = await adminToken();
    published = await snapshotGlobal(token, "templates");
    colour = await colourFacet();
    // The first search of a fresh `next start` reads Medusa cold; warm it before the tests time it.
    await (await fetch(`${base()}/us/search?scope=store&${colour.name}=${colour.value}`)).text();
  });

  test.afterAll(async () => {
    if (published === undefined) return;
    await publishGlobal(token, "templates", published, "all");
    const listing = (published["listing"] ?? {}) as { variant?: Layout };
    await freshWithinTwo(() => draws(listing.variant ?? "default"), 1_500);
  });

  const publish = async (listing: GlobalData, shows: () => Promise<boolean>) => {
    await settled(LISTING);
    await publishGlobal(token, "templates", templatesWith(listing));
    expect(
      await freshWithinTwo(shows, 1_500),
      "the published pick within two requests",
    ).toBeGreaterThan(0);
  };

  /** Without scripts: the form lands on `/search` in the same layout, with the filter's products. */
  const withoutScripts = async (browser: Browser, layout: Layout) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(LISTING);
    await expect(page.locator('[data-slot="listing-results"]').first()).toHaveAttribute(
      "data-layout",
      layout,
    );
    await filter(page, layout, false, colour);
    await expect(page).toHaveURL(/\/us\/search\?/);
    const query = new URL(page.url()).searchParams;
    expect(query.get("scope"), layout).toBe("store");
    expect(query.getAll(colour.name), layout).toEqual([colour.value]);
    expect(query.get("price.max"), layout).toBe(TOP_PRICE);
    // The search page is blocking (SETUP.md, "Search without scripts"): its results are where it
    // shows them, so a browser without scripts sees them, not just the field and the heading.
    const results = page.locator(
      '[data-slot="search-results-template"] [data-slot="listing-results"]',
    );
    await expect(results).toBeVisible();
    await expect(results).toHaveAttribute("data-layout", layout);
    const products = await productsIn(results);
    await expect(results.locator('[data-slot="product-card"]').first()).toBeVisible();
    expect(
      await results.locator('[data-slot="product-card-title"] a:visible').count(),
      `${layout}: every result on /search is shown`,
    ).toBe(products.length);
    await context.close();
    return products;
  };

  for (const layout of LAYOUTS)
    test(`${layout}: filters by colour and price with scripts and without, from the keyboard`, async ({
      page,
      browser,
    }) => {
      await publish({ variant: layout }, () => draws(layout));

      const landed = await withoutScripts(browser, layout);
      if (layout === "default") expected = landed;
      // Navy under $40 is some of the shop, not none of it.
      expect(expected.length, "the default layout's answer").toBeGreaterThan(0);
      expect(landed, `${layout} on /search`).toEqual(expected);

      await page.goto(LISTING);
      // The island is drawn in the browser only: once it is there the page has hydrated.
      await expect(page.locator('[data-slot="listing-island"]')).toBeAttached();
      await filter(page, layout, true, colour);
      await expect(page).toHaveURL(new RegExp(`^[^?]*${LISTING}\\?`));
      const query = new URL(page.url()).searchParams;
      expect(query.getAll(colour.name), layout).toEqual([colour.value]);
      expect(query.get("price.max"), layout).toBe(TOP_PRICE);
      const island = page.locator(
        '[data-slot="listing-island"][data-active] [data-slot="listing-results"]',
      );
      // The first answer of a fresh `next start` reads Medusa cold.
      await expect(island).toHaveAttribute("data-layout", layout, { timeout: 20_000 });
      await expect.poll(() => productsIn(island), { timeout: 20_000 }).toEqual(expected);
    });

  test("the card picker puts its card in the listing's grid, the island's and the search page's", async ({
    page,
  }) => {
    const CARD = "minimal";
    await publish({ variant: "default", card: CARD }, () =>
      bothHold(`data-slot="product-card" data-variant="${CARD}"`),
    );
    const cards = (scope: string) => page.locator(`${scope} [data-slot="product-card"]`);
    const allAre = async (scope: string) => {
      await expect(cards(scope).first()).toBeVisible({ timeout: 20_000 });
      const variants = await cards(scope).evaluateAll((all) =>
        all.map((card) => card.getAttribute("data-variant")),
      );
      expect(variants.length, scope).toBeGreaterThan(0);
      expect(new Set(variants), scope).toEqual(new Set([CARD]));
    };
    await page.goto(LISTING);
    await allAre('[data-slot="product-listing-region"]');
    await page.goto(`${LISTING}?${colour.name}=${colour.value}`);
    await allAre('[data-slot="listing-island"][data-active]');
    await page.goto(SEARCH);
    await allAre('[data-slot="search-results-template"]');
  });
});
