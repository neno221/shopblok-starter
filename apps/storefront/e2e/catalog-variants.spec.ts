import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { api, PNG, syncedId, upload } from "./support/payload-rest";
import { adminToken, base } from "./support/server";

// T81 (M5 plan §1a, §5 T81; D99, D100, D102): the catalog blocks' sixteen members on a page
// published through Payload's REST API as the bootstrap admin and read through T59's test page
// (`/[market]/e2e-cms/[slug]`, `E2E_TEST_ROUTES=true`), whose blocks are resolved with the market's
// catalog, as `content-variants.spec.ts` draws T82's. In the US market (`/us`: USD, English) and in
// Cyprus (`/`: EUR, Greek): each member says which it is (`data-variant`), the prices are in the
// market's currency, and axe finds nothing. Then the tabs: by keyboard (the arrow keys show the
// next tab at once, its products fetched from `/next/block-tab` in the market's currency), without
// scripts (the tabs' links over the first tab's products), and the route itself: the published
// page's stored tab only, whatever the query adds, and a 404 for a block only a draft holds. The
// page and the upload are deleted afterwards.

const stamp = Date.now().toString(36);
const english = { title: `Catalog ${stamp}`, slug: `e2e-catalog-${stamp}` };
const greek = { title: `Κατάλογος ${stamp}`, slug: `e2e-katalogos-${stamp}` };

// D34's tags, as the design-system checks use them.
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The sixteen members, each by its block's section slot and its variant. */
const MEMBERS = [
  ["category-showcase", "circles"],
  ["category-showcase", "bento"],
  ["category-showcase", "carousel"],
  ["category-showcase", "list"],
  ["category-showcase", "banner"],
  ["product-collection", "featured-first"],
  ["product-collection", "editorial"],
  ["product-collection", "tabs"],
  ["product-collection", "ranked"],
  ["product-collection", "with-banner"],
  ["product-collection", "compact"],
  ["product-collection", "lookbook"],
  ["featured-product", "overlay"],
  ["featured-product", "gallery"],
  ["bundle", "list"],
  ["collection-spotlight", "stacked"],
] as const;

type Ids = {
  picture: number;
  basics: number;
  summer: number;
  accessories: number;
  products: Record<"tee" | "hoodie" | "cap" | "mug", number>;
};

/** The tabs block's three tabs: two collections and a category of the demo catalog. */
const TABS = [
  { label: "Basics", listing: "/collections/everyday-basics" },
  { label: "Summer", listing: "/collections/summer-edit" },
  { label: "Accessories", listing: "/categories/accessories" },
] as const;

/** The demo catalog's summer collection (`apps/backend/src/scripts/lib/demo-catalog.ts`). */
const SUMMER = {
  en: ["Canvas Cap", "Dotted Notebook", "Linen Shorts"],
  el: ["Καπέλο από καμβά", "Λινό σορτς", "Σημειωματάριο με τελείες"],
};

const TABS_HEADING = "Shop the edit";

function layout(ids: Ids) {
  const categories = (variant: string) => ({
    blockType: "categoryShowcase",
    variant,
    heading: `Shop by category · ${variant}`,
    categorySource: { mode: "topLevel", limit: 6 },
  });
  const collection = (variant: string, extra: Record<string, unknown> = {}) => ({
    blockType: "productCollection",
    variant,
    heading: `New in · ${variant}`,
    display: "grid",
    productSource: { mode: "newest", limit: 5 },
    ...extra,
  });
  const featured = (variant: string) => ({
    blockType: "featuredProduct",
    variant,
    heading: `Product of the month · ${variant}`,
    product: ids.products.hoodie,
    text: "Heavyweight jersey and a lined hood.",
  });
  return [
    ...["circles", "bento", "carousel", "list", "banner"].map(categories),
    collection("featured-first"),
    collection("editorial"),
    collection("tabs", {
      heading: TABS_HEADING,
      tabs: [
        { label: TABS[0].label, productSource: { mode: "collection", collection: ids.basics } },
        { label: TABS[1].label, productSource: { mode: "collection", collection: ids.summer } },
        { label: TABS[2].label, productSource: { mode: "category", category: ids.accessories } },
      ],
    }),
    collection("ranked"),
    collection("with-banner", { media: ids.picture }),
    collection("compact"),
    collection("lookbook", { media: ids.picture }),
    featured("overlay"),
    featured("gallery"),
    {
      blockType: "bundle",
      variant: "list",
      heading: "Better together · list",
      products: [ids.products.tee, ids.products.cap, ids.products.mug],
    },
    {
      blockType: "collectionSpotlight",
      variant: "stacked",
      collection: ids.summer,
      limit: 2,
      sort: "newest",
    },
  ];
}

const markets = [
  { name: "the US, in English", prefix: "/us", ...english, lang: "en", currency: "$", other: "€" },
  { name: "Cyprus, in Greek", prefix: "", ...greek, lang: "el", currency: "€", other: "$" },
] as const;

/** A stored value with every `id` taken out, at any depth (the copy of a block and its rows). */
const withoutIds = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(withoutIds)
    : typeof value === "object" && value !== null
      ? Object.fromEntries(
          Object.entries(value).flatMap(([key, each]) =>
            key === "id" ? [] : [[key, withoutIds(each)]],
          ),
        )
      : value;

const tabsSection = (page: Page) =>
  page.locator('main#main [data-slot="product-collection-section"][data-variant="tabs"]');
const titles = (where: Locator) =>
  where.locator('[data-slot="product-card-title"]').allInnerTexts();

test.describe("the catalog blocks' members (T81)", () => {
  test.describe.configure({ mode: "serial" });
  let token = "";
  let pageId: number | undefined;
  let picture: number | undefined;

  test.beforeAll(async () => {
    token = await adminToken();
    picture = (await upload(token, `catalog-${stamp}.png`, "image/png", PNG, "A linen shirt")).id;
    const ids: Ids = {
      picture,
      basics: await syncedId("collections", "everyday-basics"),
      summer: await syncedId("collections", "summer-edit"),
      accessories: await syncedId("categories", "accessories"),
      products: {
        tee: await syncedId("products", "demo-classic-tee"),
        hoodie: await syncedId("products", "demo-heritage-hoodie"),
        cap: await syncedId("products", "demo-canvas-cap"),
        mug: await syncedId("products", "demo-ceramic-mug"),
      },
    };
    const created = await api<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
      ...english,
      layout: layout(ids),
      _status: "published",
    });
    pageId = created.doc.id;
    // Greek: the same rows with the English text, as the editor's "copy from English".
    const saved = await api<{ layout: unknown }>(
      token,
      "GET",
      `/api/pages/${pageId}?locale=en&depth=0`,
    );
    await api(token, "PATCH", `/api/pages/${pageId}?locale=el`, {
      ...greek,
      layout: saved.layout,
      _status: "published",
    });
  });

  test.afterAll(async () => {
    if (pageId !== undefined)
      await api(token, "DELETE", `/api/pages/${pageId}`).catch(() => undefined);
    if (picture !== undefined)
      await api(token, "DELETE", `/api/media/${picture}`).catch(() => undefined);
  });

  for (const market of markets)
    test(`draws every member in ${market.name}, in its currency, with no axe violation`, async ({
      page,
    }) => {
      await page.goto(`${market.prefix}/e2e-cms/${market.slug}`);
      await expect(page.getByTestId("cms-title")).toHaveText(market.title);
      const main = page.locator("main#main");
      for (const [slot, variant] of MEMBERS)
        await expect(
          main.locator(`[data-slot="${slot}-section"][data-variant="${variant}"]`),
          `${slot} · ${variant}`,
        ).toHaveCount(1);
      const prices = await main.locator('[data-slot="price-block"]').allInnerTexts();
      expect(prices.length).toBeGreaterThan(10);
      for (const price of prices) {
        expect(price).toContain(market.currency);
        expect(price).not.toContain(market.other);
      }
      // The ranked list says each product's place in its link's name.
      const ranked = main.locator(
        '[data-slot="product-collection-section"][data-variant="ranked"]',
      );
      const first = ranked.locator("ol > li").first().getByRole("link");
      await expect(first).toHaveAccessibleName(
        market.lang === "en" ? /^Number 1: / : /^Αριθμός 1: /,
      );
      // The bundle's list adds its products up.
      await expect(main.locator('[data-slot="bundle-total"]')).toContainText(market.currency);
      const axe = await new AxeBuilder({ page }).include("main#main").withTags(axeTags).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });

  for (const market of markets)
    test(`tabs by keyboard in ${market.name}: the next tab at once, fetched in the market's currency`, async ({
      page,
    }) => {
      await page.goto(`${market.prefix}/e2e-cms/${market.slug}`, { waitUntil: "networkidle" });
      const section = tabsSection(page);
      const list = section.getByRole("tablist", { name: TABS_HEADING });
      await expect(list).toBeVisible();
      await expect(list.getByRole("tab")).toHaveText(TABS.map((tab) => tab.label));
      await expect(list.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
      // The tabs' links are for a browser without scripts only.
      await expect(section.locator('[data-slot="product-collection-tab-links"]')).toBeHidden();
      const answer = page.waitForResponse((response) =>
        response.url().includes("/next/block-tab?"),
      );
      await list.getByRole("tab").first().focus();
      await page.keyboard.press("ArrowRight");
      const second = list.getByRole("tab", { name: TABS[1].label });
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute("aria-selected", "true");
      const response = await answer;
      expect(response.status()).toBe(200);
      // The island asks for the tab by its place, and nothing else.
      const query = new URL(response.url()).searchParams;
      expect([...query.keys()]).toEqual(["market", "doc", "block", "tab"]);
      expect([query.get("doc"), query.get("tab")]).toEqual([String(pageId), "1"]);
      const panel = section.getByRole("tabpanel");
      await expect
        .poll(async () => (await titles(panel)).sort((a, b) => a.localeCompare(b, market.lang)))
        .toEqual(SUMMER[market.lang]);
      for (const price of await panel.locator('[data-slot="price-block"]').allInnerTexts()) {
        expect(price).toContain(market.currency);
        expect(price).not.toContain(market.other);
      }
      // Back to the first: its products, with nothing fetched again.
      await page.keyboard.press("ArrowLeft");
      await expect(list.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
      await expect.poll(async () => (await titles(panel)).length).toBeGreaterThan(2);
    });

  test("tabs without scripts: the tabs' links over the first tab's products", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: base(), javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/us/e2e-cms/${english.slug}`);
    const section = tabsSection(page);
    await expect(section.getByRole("tablist")).toHaveCount(0);
    const links = section.locator('[data-slot="product-collection-tab-link"]');
    await expect(links).toHaveText(TABS.map((tab) => tab.label));
    for (const [index, tab] of TABS.entries()) {
      await expect(links.nth(index)).toHaveAttribute("href", `/us${tab.listing}`);
      if (index === 0) await expect(links.nth(index)).toHaveAttribute("aria-current", "true");
      else await expect(links.nth(index)).not.toHaveAttribute("aria-current", /.*/);
    }
    await expect(section.getByRole("list", { name: TABS_HEADING })).toBeVisible();
    // The first tab's products are in the HTML; the summer tab's shorts are not.
    expect(await titles(section)).toContain("Heritage Hoodie");
    expect(await titles(section)).not.toContain("Linen Shorts");
    // A tab's link opens its listing.
    await links.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/us${TABS[1].listing}$`));
    await expect(page.locator("main#main h1")).toBeVisible();
    await context.close();
  });

  test("the tab's route: the published stored tab only, whatever the query adds", async ({
    page,
    request,
  }) => {
    await page.goto(`/us/e2e-cms/${english.slug}`, { waitUntil: "networkidle" });
    const answer = page.waitForResponse((response) => response.url().includes("/next/block-tab?"));
    await tabsSection(page).getByRole("tab", { name: TABS[1].label }).click();
    const endpoint = new URL((await answer).url());
    const read = async (query: URLSearchParams) => {
      const response = await request.get(`/next/block-tab?${query.toString()}`);
      return {
        status: response.status(),
        headers: response.headers(),
        body: await response.text(),
      };
    };
    const plain = await read(endpoint.searchParams);
    expect(plain.status).toBe(200);
    expect(plain.headers["cache-control"]).toContain("max-age=60");
    const products = (JSON.parse(plain.body) as { products: { title: string }[] }).products;
    expect(products.map((product) => product.title).sort()).toEqual(SUMMER.en);
    // A forged region, source, limit or sort changes nothing.
    const forged = new URLSearchParams(endpoint.searchParams);
    const extras: [string, string][] = [
      ["region", "reg_forged"],
      ["currency", "eur"],
      ["limit", "24"],
      ["source", "newest"],
      ["mode", "newest"],
      ["sort", "price-desc"],
    ];
    for (const [key, value] of extras) forged.set(key, value);
    expect((await read(forged)).body).toBe(plain.body);
    // Another tab's place, a place past the last, another market's page id: what is stored only.
    const past = new URLSearchParams(endpoint.searchParams);
    past.set("tab", "3");
    expect((await read(past)).status).toBe(404);

    // A block that only a draft holds: the route reads the published page, so it is not there.
    const saved = await api<{ layout: { id: string; blockType: string }[] }>(
      token,
      "GET",
      `/api/pages/${pageId}?locale=en&depth=0`,
    );
    const tabbed = saved.layout.find((block) => block.id === endpoint.searchParams.get("block"));
    expect(tabbed, "the tabs block by its id").toBeDefined();
    await api(token, "PATCH", `/api/pages/${pageId}?locale=en&draft=true`, {
      // A copy of the tabs block with no ids, its tabs' rows' included: Payload gives it new ones.
      layout: [...saved.layout, { ...(withoutIds(tabbed) as object), heading: `Draft ${stamp}` }],
      _status: "draft",
    });
    const draft = await api<{ layout: { id: string }[] }>(
      token,
      "GET",
      `/api/pages/${pageId}?locale=en&depth=0&draft=true`,
    );
    const added = draft.layout.at(-1)?.id;
    expect(added).toBeDefined();
    expect(saved.layout.some((block) => block.id === added)).toBe(false);
    const drafted = new URLSearchParams(endpoint.searchParams);
    drafted.set("block", added ?? "");
    const refused = await read(drafted);
    expect(refused.status).toBe(404);
    expect(refused.headers["cache-control"]).toBe("no-store");
  });
});
