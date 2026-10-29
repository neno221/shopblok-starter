import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { appEnv } from "./support/app-env";
import { adminToken, base, freshWithinTwo } from "./support/server";

// T64: a page with every commerce block, published through Payload's REST API as the bootstrap
// admin and read through T59's test page (`/[market]/e2e-cms/[slug]`, `E2E_TEST_ROUTES=true`),
// whose blocks are resolved with the market's catalog. The blocks point at the demo catalog's
// synced documents (T60). In the US market (`/us`: USD, English) and in Cyprus (`/`: EUR, Greek):
// every section, the prices in the market's currency and the names in its language, a handpicked
// list in the editor's order, a source with nothing that falls back to the newest or says so, an
// offer past its end left out, and no axe violation. Then the visitor's recently viewed products
// after a product page, and a product the sync marks as deleted in Medusa gone from the page. The
// page is deleted afterwards and the product's mark taken off again.

const stamp = Date.now().toString(36);
const english = { title: `Commerce ${stamp}`, slug: `e2e-commerce-${stamp}` };
const greek = { title: `Εμπόριο ${stamp}`, slug: `e2e-emporio-${stamp}` };

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const DAY = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** The demo catalog's titles (`apps/backend/src/scripts/lib/demo-catalog.ts`), per language. */
const TITLES = {
  "demo-ceramic-mug": { en: "Ceramic Mug", el: "Κεραμική κούπα" },
  "demo-heritage-hoodie": { en: "Heritage Hoodie", el: "Φούτερ με κουκούλα Heritage" },
  "demo-canvas-cap": { en: "Canvas Cap", el: "Καπέλο από καμβά" },
  "demo-classic-tee": { en: "Classic Tee", el: "Κλασικό μπλουζάκι" },
} as const;
type Handle = keyof typeof TITLES;
const HANDPICKED: Handle[] = ["demo-ceramic-mug", "demo-heritage-hoodie", "demo-canvas-cap"];

const headers = (authorization: string) => ({
  authorization,
  origin: new URL(base()).origin,
  "content-type": "application/json",
});

async function api(authorization: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`${base()}/api${path}`, {
    method,
    headers: headers(authorization),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as Record<string, unknown>;
}

/** The `medusa-sync` integration, which alone writes a synced document's `deletedInMedusa`. */
const integration = () => `integrations API-Key ${appEnv("backend", "PAYLOAD_API_KEY")}`;

/** A synced document's Payload id by its handle (the collections are public). */
async function docId(collection: string, handle: string): Promise<number> {
  const found = (await api("", "GET", `/${collection}?where[handle][equals]=${handle}&depth=0`))[
    "docs"
  ] as { id: number }[];
  const id = found[0]?.id;
  if (id === undefined) throw new Error(`no ${collection} document has the handle ${handle}`);
  return id;
}

type Ids = { products: Record<Handle, number>; summer: number };

/** Every commerce block, some twice to show a source's modes, in the registry's order. */
function layout(ids: Ids) {
  const products = (handles: Handle[]) => handles.map((handle) => ids.products[handle]);
  return [
    {
      blockType: "hero",
      eyebrow: "New season",
      heading: "Autumn is here",
      subheading: "Warm layers for cooler days.",
      links: [{ link: { type: "custom", url: "/store", label: "Shop now" } }],
      countdownEnd: inDays(3),
      productSource: { mode: "handpicked", products: products(["demo-canvas-cap"]) },
    },
    {
      blockType: "categoryShowcase",
      heading: "Shop by category",
      categorySource: { mode: "topLevel", limit: 3 },
    },
    {
      blockType: "productCollection",
      heading: "Handpicked",
      display: "grid",
      productSource: { mode: "handpicked", products: products(HANDPICKED) },
    },
    {
      // The demo catalog has no sale price list: the newest instead.
      blockType: "productCollection",
      heading: "On sale",
      display: "carousel",
      productSource: { mode: "onSale", limit: 2, emptyBehavior: "newest" },
    },
    {
      blockType: "productCollection",
      heading: "Silk",
      display: "grid",
      productSource: { mode: "tag", tag: "silk", emptyBehavior: "message" },
    },
    {
      blockType: "productCollection",
      heading: `Hidden ${stamp}`,
      display: "grid",
      productSource: { mode: "tag", tag: "silk", emptyBehavior: "hide" },
    },
    {
      blockType: "featuredProduct",
      heading: "Product of the month",
      product: ids.products["demo-heritage-hoodie"],
      text: "Heavyweight jersey and a lined hood.",
    },
    {
      blockType: "bundle",
      heading: "Better together",
      products: products(["demo-classic-tee", "demo-canvas-cap"]),
    },
    {
      blockType: "promoBanner",
      heading: "Ten percent off",
      code: "WELCOME10",
      terms: "One use per order.",
      endsAt: inDays(30),
    },
    // An offer that has ended: not drawn.
    { blockType: "promoBanner", heading: `Ended ${stamp}`, endsAt: inDays(-1) },
    {
      blockType: "comparison",
      heading: "Compare",
      products: products(["demo-classic-tee", "demo-heritage-hoodie"]),
      showOptions: true,
    },
    {
      blockType: "collectionSpotlight",
      collection: ids.summer,
      limit: 2,
      sort: "newest",
    },
    { blockType: "recentlyViewed", heading: "You looked at" },
  ].map((block) => ({ variant: "standard", ...block }));
}

const SECTIONS = [
  "hero-section",
  "category-showcase-section",
  "product-collection-section",
  "featured-product-section",
  "bundle-section",
  "promo-banner-section",
  "comparison-section",
  "collection-spotlight-section",
];

const section = (page: Page, slot: string, heading: string | RegExp) =>
  page.locator(`main#main [data-slot="${slot}"]`).filter({ hasText: heading });
const cardTitles = (where: Locator) =>
  where.locator('[data-slot="product-card-title"]').allInnerTexts();

const markets = [
  { name: "the US, in English", prefix: "/us", ...english, lang: "en", currency: "$", other: "€" },
  { name: "Cyprus, in Greek", prefix: "", ...greek, lang: "el", currency: "€", other: "$" },
] as const;

test.describe("a page's commerce blocks (T64)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let pageId: number | undefined;
  let ids: Ids | undefined;
  let marked: number | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    const handles = Object.keys(TITLES) as Handle[];
    ids = {
      products: Object.fromEntries(
        await Promise.all(handles.map(async (h) => [h, await docId("products", h)] as const)),
      ) as Record<Handle, number>,
      summer: await docId("collections", "summer-edit"),
    };
    const created = await api(`JWT ${token}`, "POST", "/pages?locale=en", {
      ...english,
      layout: layout(ids),
      _status: "published",
    });
    pageId = (created["doc"] as { id: number }).id;
    // Greek: the same rows (their ids) with the English text, as the editor's "copy from English".
    const saved = await api(`JWT ${token}`, "GET", `/pages/${pageId}?locale=en&depth=0`);
    await api(`JWT ${token}`, "PATCH", `/pages/${pageId}?locale=el`, {
      ...greek,
      layout: saved["layout"],
      _status: "published",
    });
  });

  test.afterAll(async () => {
    if (marked !== undefined)
      await api(integration(), "PATCH", `/products/${marked}`, { deletedInMedusa: false }).catch(
        () => undefined,
      );
    if (pageId !== undefined)
      await api(`JWT ${token}`, "DELETE", `/pages/${pageId}`).catch(() => undefined);
  });

  for (const market of markets) {
    test(`draws every commerce block in ${market.name}, priced in its currency`, async ({
      page,
    }) => {
      await page.goto(`${market.prefix}/e2e-cms/${market.slug}`);
      await expect(page.getByTestId("cms-title")).toHaveText(market.title);
      const main = page.locator("main#main");
      for (const slot of SECTIONS)
        await expect(main.locator(`[data-slot="${slot}"]`).first(), slot).toBeAttached();

      // The handpicked list in the editor's order, in the market's language and currency.
      const handpicked = section(page, "product-collection-section", "Handpicked");
      expect(await cardTitles(handpicked)).toEqual(
        HANDPICKED.map((handle) => TITLES[handle][market.lang]),
      );
      await expect(handpicked).toContainText(market.currency);
      await expect(handpicked).not.toContainText(market.other);
      // Every price on the page is the market's (the comparison's, the bundle's, the hero's...).
      await expect(main).not.toContainText(market.other);

      // The hero: its countdown and its product.
      const hero = section(page, "hero-section", "Autumn is here");
      await expect(hero.getByRole("timer")).toBeAttached();
      expect(await cardTitles(hero)).toEqual([TITLES["demo-canvas-cap"][market.lang]]);

      // No product on sale: the newest two instead; a tag with nothing says so, or is left out.
      expect(await cardTitles(section(page, "product-collection-section", "On sale"))).toHaveLength(
        2,
      );
      const silk = section(page, "product-collection-section", "Silk");
      await expect(silk.getByRole("link", { name: /./ }).last()).toHaveAttribute(
        "href",
        `${market.prefix}/store`,
      );
      await expect(main).not.toContainText(`Hidden ${stamp}`);
      await expect(main).not.toContainText(`Ended ${stamp}`);

      // The categories in the market's language, with their pages.
      const tiles = section(page, "category-showcase-section", "Shop by category").locator(
        '[data-slot="category-tile"]',
      );
      await expect(tiles.first()).toHaveAttribute("href", `${market.prefix}/categories/apparel`);
      await expect(tiles.first()).toContainText(market.lang === "el" ? "Ρούχα" : "Apparel");

      // The spotlight's heading is the collection's title in the market's language.
      const spotlight = main.locator('[data-slot="collection-spotlight-section"]');
      await expect(spotlight).toContainText(
        market.lang === "el" ? "Καλοκαιρινή επιλογή" : "Summer Edit",
      );
      await expect(spotlight.locator('[data-slot="collection-spotlight-link"]')).toHaveAttribute(
        "href",
        `${market.prefix}/collections/summer-edit`,
      );

      // The comparison: a column per product, the price row in the market's currency.
      const table = main.locator('[data-slot="comparison-table"]');
      await expect(table.locator("thead th[scope=col]")).toHaveCount(2);
      await expect(table).toContainText(market.currency);

      // Nothing the visitor has not viewed yet.
      await expect(main.locator('[data-slot="recently-viewed-section"]')).toHaveCount(0);

      const axe = await new AxeBuilder({ page }).include("main#main").withTags(axeTags).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }

  test("shows the products the visitor viewed in this market", async ({ page }) => {
    await page.goto("/us/products/demo-ceramic-mug");
    await expect(page.locator("h1")).toContainText("Ceramic Mug");
    // Remembered once the product page has hydrated (T49's store).
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("shopblok:recently-viewed") ?? ""))
      .toContain("demo-ceramic-mug");
    await page.goto(`/us/e2e-cms/${english.slug}`);
    const viewed = section(page, "recently-viewed-section", "You looked at");
    await expect(viewed).toBeVisible();
    expect(await cardTitles(viewed)).toEqual(["Ceramic Mug"]);
    // Cyprus's list is its own.
    await page.goto(`/e2e-cms/${greek.slug}`);
    await expect(page.getByTestId("cms-title")).toHaveText(greek.title);
    await expect(page.locator('[data-slot="recently-viewed-section"]')).toHaveCount(0);
  });

  test("leaves out a product the sync marks as deleted in Medusa", async () => {
    const hoodie = ids?.products["demo-heritage-hoodie"];
    if (hoodie === undefined) throw new Error("no hoodie");
    await api(integration(), "PATCH", `/products/${hoodie}`, { deletedInMedusa: true });
    marked = hoodie;
    const titles = async () => {
      const response = await fetch(`${base()}/us/e2e-cms/${english.slug}`);
      const html = await response.text();
      const start = html.indexOf(">Handpicked<");
      const end = html.indexOf(">On sale<");
      return html.slice(start, end);
    };
    expect(
      await freshWithinTwo(async () => !(await titles()).includes("Heritage Hoodie"), 1500),
      "the hoodie gone from the handpicked list within two requests",
    ).toBeGreaterThan(0);
    const list = await titles();
    expect(list).toContain("Ceramic Mug");
    expect(list).toContain("Canvas Cap");
  });
});
