import { expect, test } from "@playwright/test";
import { publishGlobal } from "./support/globals";
import { api, PNG, syncedId, upload } from "./support/payload-rest";
import { adminToken, base, freshWithinTwo, settled } from "./support/server";

// T49 (D58, D61, SPEC §8.4, §12): the product page against `next start` with the demo catalog. The
// shell's HTML holds the product in the market's language and currency (what `curl` gets: the
// default variant's price, no cart count); `?variant=` chooses on load; an add from the keyboard
// updates the header's count; a missing product is a 404 that crawlers drop; the head has the
// canonical, the hreflang alternates and JSON-LD.

const HANDLE = "demo-heritage-hoodie";
const TITLE = { en: "Heritage Hoodie", el: "Φούτερ με κουκούλα Heritage" };

type Offer = { "@type": string; url: string; priceCurrency: string };
type Graph = {
  "@graph": ({ "@type": string; name?: string; offers?: Offer[] } & Record<string, unknown>)[];
};

function jsonLd(html: string): Graph {
  const text = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1];
  if (text === undefined) throw new Error("no JSON-LD on the page");
  return JSON.parse(text) as Graph;
}

test.describe("the product page (T49)", () => {
  test("the server's HTML has the product in the market's language and currency, and no count", async ({
    request,
  }) => {
    const cy = await (await request.get(`/products/${HANDLE}`)).text();
    expect(cy).toContain('<html lang="el-CY"');
    expect(cy).toContain(TITLE.el);
    expect(cy).toMatch(/€/);
    const us = await (await request.get(`/us/products/${HANDLE}`)).text();
    expect(us).toContain(`>${TITLE.en}</h1>`);
    expect(us).toMatch(/\$\d/);
    expect(us).not.toContain("€");
    for (const html of [cy, us]) {
      expect(html).toContain('data-slot="buy-box"');
      expect(html).not.toContain('data-slot="cart-badge"');
    }
  });

  test("the head has the canonical, the hreflang alternates and the product's JSON-LD", async ({
    request,
  }) => {
    const html = await (await request.get(`/us/products/${HANDLE}?variant=anything`)).text();
    expect(html).toMatch(
      new RegExp(`<link rel="canonical" href="https?://[^"]+/us/products/${HANDLE}"/>`),
    );
    for (const [lang, path] of [
      ["el-CY", `/products/${HANDLE}`],
      ["en-US", `/us/products/${HANDLE}`],
      ["fr-CH", `/ch/fr/products/${HANDLE}`],
      ["x-default", `/products/${HANDLE}`],
    ])
      expect(html).toMatch(
        new RegExp(`<link rel="alternate" hrefLang="${lang}" href="https?://[^"]+${path}"/>`),
      );
    const graph = jsonLd(html)["@graph"];
    const product = graph.find((node) => node["@type"] === "Product");
    expect(product?.name).toBe(TITLE.en);
    expect(product?.offers?.length).toBeGreaterThan(1);
    expect(product?.offers?.every((offer) => offer.priceCurrency === "USD")).toBe(true);
    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });

  test("a missing product is a 404 with noindex", async ({ request }) => {
    const response = await request.get("/us/products/no-such-product");
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<meta name="robots" content="noindex"/>');
  });

  test("?variant= chooses that variant on load", async ({ page, request }) => {
    const html = await (await request.get(`/us/products/${HANDLE}`)).text();
    const offer = jsonLd(html)["@graph"].find((node) => node["@type"] === "Product")?.offers?.[0];
    expect(offer).toBeDefined();
    await page.goto(new URL(offer?.url as string).pathname + new URL(offer?.url as string).search);
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box.locator('[role="radio"][aria-checked="true"]')).toHaveCount(2);
    await expect(box.locator('[data-slot="buy-box-add"]')).not.toHaveAttribute("aria-disabled");
  });

  test("choosing writes the variant into the URL, and an add from the keyboard updates the count", async ({
    page,
  }) => {
    await page.goto(`/us/products/${HANDLE}`);
    // The island has replaced the server's buy box once its wrapper is there.
    const box = page.locator('[data-slot="buy-box-island"] [data-slot="buy-box"]');
    await expect(box).toHaveCount(1);
    await box.getByRole("radio", { name: "Navy" }).focus();
    await page.keyboard.press("Space");
    await expect(page).not.toHaveURL(/variant=/);
    await box.getByRole("radio", { name: "M", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\?variant=variant_/);
    await box.locator('[data-slot="buy-box-add"]').focus();
    await page.keyboard.press("Enter");
    await expect(box.locator('[data-slot="buy-box-status"]')).not.toBeEmpty();
    // The header's quick cart opens on the add (T52), its button with the count.
    await expect(page.locator('[data-slot="quick-cart"]')).toBeVisible();
    await expect(page.locator('header [data-slot="quick-cart-badge"]')).toHaveText("1");
  });
});

// T50 (D59, D63, SPEC §8.1, §8.4, §12): the listing pages and the search. CI builds and starts with
// `STOREFRONT_LISTING_PAGE_SIZE=3`, so apparel's four demo products are two pages and the
// everyday-basics collection's five are two as well.
const PAGE_SIZE = 3;
const island = '[data-slot="listing-island"][data-active]';
const serverResults = '[data-slot="product-listing-region"] > [data-slot="listing-results"]';

const cardHrefs = (html: string) =>
  [...html.matchAll(/data-slot="product-card-title"[^>]*><a [^>]*href="([^"]+)"/g)].map(
    (match) => match[1],
  );

type Group = { id: string; kind: string; options?: { value: string; count: number }[] };

test.describe("the listing pages and the search (T50)", () => {
  test("a category's first page is in the server's HTML, in each market's language", async ({
    request,
  }) => {
    const cy = await (await request.get("/categories/apparel")).text();
    expect(cy).toContain(">Ρούχα</h1>");
    expect(cardHrefs(cy)).toHaveLength(PAGE_SIZE);
    const us = await (await request.get("/us/categories/apparel")).text();
    expect(us).toContain(">Apparel</h1>");
    expect(cardHrefs(us)).toHaveLength(PAGE_SIZE);
    expect(us).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/us\/categories\/apparel"\/>/);
    expect(us).toContain('"@type":"CollectionPage"');
    expect(us).not.toContain('data-slot="cart-badge"');
  });

  test("/page/2 is server-rendered and self-canonical, /page/3 and /page/1 are 404s", async ({
    request,
  }) => {
    const first = cardHrefs(await (await request.get("/us/categories/apparel")).text());
    const response = await request.get("/us/categories/apparel/page/2");
    expect(response.status()).toBe(200);
    const html = await response.text();
    const second = cardHrefs(html);
    expect(second).toHaveLength(1);
    expect(first).not.toContain(second[0]);
    expect(html).toMatch(
      /<link rel="canonical" href="https?:\/\/[^"]+\/us\/categories\/apparel\/page\/2"\/>/,
    );
    expect((await request.get("/us/categories/apparel/page/3")).status()).toBe(404);
    expect((await request.get("/us/categories/apparel/page/1")).status()).toBe(404);
  });

  test("a collection pages the same way", async ({ request }) => {
    expect(
      cardHrefs(await (await request.get("/us/collections/everyday-basics")).text()),
    ).toHaveLength(PAGE_SIZE);
    const second = await request.get("/us/collections/everyday-basics/page/2");
    expect(second.status()).toBe(200);
    expect(cardHrefs(await second.text())).toHaveLength(2);
    expect((await request.get("/us/collections/everyday-basics/page/3")).status()).toBe(404);
    expect((await request.get("/us/collections/no-such-collection")).status()).toBe(404);
  });

  test("a broken escape or an encoded slash in a listing's path is a 404", async ({ request }) => {
    // PR 78 review, items 2 and 3: not a 500, and not another category's page.
    for (const path of [
      "/us/categories/%E0%A4%A",
      "/us/categories/apparel%2Fpage%2F2",
      "/us/collections/%ZZ",
      "/us/collections/everyday-basics%2Fx/page/2",
    ])
      expect((await request.get(path)).status(), path).toBe(404);
  });

  test("a clean URL asks /next/listing nothing", async ({ page }) => {
    const asked: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/next/listing") asked.push(request.url());
    });
    await page.goto("/us/categories/apparel");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(serverResults)).toBeVisible();
    expect(asked).toEqual([]);
  });

  test("?sort= reorders through the island, and the URL keeps it", async ({ page }) => {
    const prices = async () =>
      (await page.locator(`${island} [data-slot="price-block"]`).allTextContents()).map((text) =>
        Number(/[\d.,]+/.exec(text)?.[0]?.replace(/,/g, "")),
      );
    await page.goto("/us/categories/apparel?sort=price-asc");
    // The first answer of a fresh `next start` reads Medusa cold (it took 6 s once in the VM).
    await expect(page.locator(`${island} [data-slot="listing-results"]`)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(serverResults)).toBeHidden();
    const ascending = await prices();
    expect(ascending).toHaveLength(PAGE_SIZE);
    expect(ascending).toEqual(ascending.toSorted((a, b) => a - b));
    await page.locator(`${island} select[name="sort"]`).first().selectOption("price-desc");
    await expect(page).toHaveURL(/\/us\/categories\/apparel\?sort=price-desc$/);
    // Descending, and the dearest first: page 1 of the other order, not the same three reversed.
    await expect
      .poll(
        async () => {
          const shown = await prices();
          return shown.length === PAGE_SIZE && shown[0] !== ascending[0]
            ? shown.join() === shown.toSorted((a, b) => b - a).join()
            : false;
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("three facets add noindex,follow; two do not", async ({ page, request }) => {
    const body = (await (
      await request.get("/next/listing?market=en-us&scope=store&sort=newest")
    ).json()) as { filters: { groups: Group[] } };
    const values = body.filters.groups
      .filter((group) => group.kind === "checkbox" || group.kind === "swatch")
      .flatMap((group) => (group.options ?? []).map((option) => [group.id, option.value]));
    expect(values.length).toBeGreaterThanOrEqual(3);
    const query = (count: number) => new URLSearchParams(values.slice(0, count)).toString();
    await page.goto(`/us/store?${query(2)}`);
    await expect(page.locator('[data-slot="listing-island"]')).toBeAttached();
    await expect(page.locator('meta[name="robots"][content="noindex,follow"]')).toHaveCount(0);
    await page.goto(`/us/store?${query(3)}`);
    await expect(page.locator('meta[name="robots"][content="noindex,follow"]')).toHaveCount(1);
  });

  test("without scripts, the filter form lands on /search with the filter applied", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/us/categories/apparel");
    const sidebar = page.locator('[data-slot="filter-sidebar"]');
    const box = sidebar.locator('input[type="checkbox"][name="collection"]').first();
    // The native input under Base UI's checkbox, which is what a form without scripts sends.
    await box.check({ force: true });
    await sidebar.locator('[data-slot="filter-sidebar-apply"]').click();
    await expect(page).toHaveURL(/\/us\/search\?(.*&)?scope=category%3Aapparel/);
    expect(new URL(page.url()).searchParams.getAll("collection")).toHaveLength(1);
    await expect(page.locator('[data-slot="search-results-title"]')).toHaveText("Apparel");
    await expect(page.locator('[data-slot="active-filter-chips"]').first()).toBeAttached();
    await context.close();
  });

  test("with scripts, the filter form stays on the listing and the island draws its results", async ({
    page,
  }) => {
    await page.goto("/us/categories/apparel");
    // The island is drawn in the browser only: once it is there, the page has hydrated, and a tick
    // before that would be reset by the checkbox's own hydration.
    await expect(page.locator('[data-slot="listing-island"]')).toBeAttached();
    const sidebar = page.locator(`${serverResults} [data-slot="filter-sidebar"]`);
    await sidebar
      .locator('input[type="checkbox"][name="collection"]')
      .first()
      .check({ force: true });
    await sidebar.locator('[data-slot="filter-sidebar-apply"]').click();
    await expect(page).toHaveURL(/\/us\/categories\/apparel\?collection=pcol_\w+$/);
    await expect(page.locator(island)).toBeVisible();
    await expect(
      page.locator(`${island} [data-slot="active-filter-chips"]`).first(),
    ).toBeAttached();
    await expect(page.getByRole("status").filter({ hasText: /products? found/ })).toBeAttached();
  });

  test("/search?q= is server-rendered and noindex", async ({ request }) => {
    const html = await (await request.get("/us/search?q=hoodie")).text();
    expect(html).toContain("Results for “hoodie”");
    expect(cardHrefs(html)).toEqual(["/us/products/demo-heritage-hoodie"]);
    expect(html).toContain('<meta name="robots" content="noindex, follow"/>');
  });

  test("the overlay shows results as the visitor types", async ({ page }) => {
    await page.goto("/us/categories/apparel");
    await page.locator('[data-slot="search-overlay-trigger"]').click();
    const overlay = page.locator('[data-slot="search-overlay"]');
    await overlay.getByRole("combobox").pressSequentially("hoodie");
    await expect(overlay.getByRole("option", { name: /Heritage Hoodie/ })).toBeVisible();
  });
});

// T69 (D83, D78): the shop's own content on Medusa's synced documents, written through Payload's
// REST API as the bootstrap admin and taken off again at the end: a product's rich description
// and an extra picture on its page in both languages; the delivery text of `site-settings` on
// every product page; a category's banner and its Greek introduction on its listing page under
// `/`, English on `/us`; and the category's picture on the home's tile. Each edit is seen within
// two requests (a market page regenerates with its Medusa reads, so the second waits 1.5 s), on a
// page first left settled (`settled`, T65's ISR race).
test.describe("the catalog's content from Payload (T69)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  const stamp = Date.now().toString(36);
  // Not a product the commerce blocks' spec marks as deleted in Medusa; prerendered (the first four
  // handles), so its page is a built one that has to be revalidated.
  const PRODUCT = "demo-classic-tee";
  const OTHER_PRODUCTS = ["demo-everyday-joggers", "demo-tote-bag"];
  const CATEGORY = "accessories";
  const WORDS = {
    heading: { en: `Why it lasts ${stamp}`, el: `Γιατί αντέχει ${stamp}` },
    strong: { en: `Combed cotton ${stamp}`, el: `Χτενισμένο βαμβάκι ${stamp}` },
    intro: {
      en: `Small things that go with you ${stamp}`,
      el: `Μικρά πράγματα για παντού ${stamp}`,
    },
    delivery: `Delivered by bicycle within the day ${stamp}`,
  };

  const text = (value: string, format = 0) => ({
    type: "text",
    version: 1,
    text: value,
    format,
    style: "",
    mode: "normal",
    detail: 0,
  });
  const node = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
    type,
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    ...extra,
    children,
  });
  const lexical = (...children: unknown[]) => ({ root: node("root", children) });
  /** A heading under the section's, and a paragraph with a strong word (`format: 1` is bold). */
  const description = (language: "en" | "el") =>
    lexical(
      node("heading", [text(WORDS.heading[language])], { tag: "h3" }),
      node("paragraph", [text(WORDS.strong[language], 1), text(" and nothing else.")], {
        textFormat: 0,
      }),
    );
  const paragraph = (value: string) => lexical(node("paragraph", [text(value)], { textFormat: 0 }));

  let token = "";
  let productId = 0;
  let categoryId = 0;
  let picture = { id: 0, filename: "" };
  let banner = { id: 0, filename: "" };
  let delivery: unknown;
  const uploads: number[] = [];

  /** The HTML of a page, from Node, as a crawler gets it. */
  const html = async (path: string) => (await fetch(`${base()}${encodeURI(path)}`)).text();
  /** How an upload appears in the page: through `/_next/image`, by its path on the shop. */
  const imageOf = (filename: string) => encodeURIComponent(`/api/media/file/${filename}`);
  const seenWithinTwo = (shows: () => Promise<boolean>) => freshWithinTwo(shows, 1_500);

  test.beforeAll(async () => {
    token = await adminToken();
    for (const name of ["picture", "banner"]) {
      const saved = await upload(token, `e2e-${name}-${stamp}.png`, "image/png", PNG, `A ${name}`);
      uploads.push(saved.id);
      if (name === "picture") picture = saved;
      else banner = saved;
    }
    productId = await syncedId("products", PRODUCT);
    categoryId = await syncedId("categories", CATEGORY);
    const settings = await api<{ deliveryAndReturns?: unknown }>(
      token,
      "GET",
      "/api/globals/site-settings?locale=en&depth=0",
    );
    delivery = settings.deliveryAndReturns ?? null;
  });

  test.afterAll(async () => {
    const quietly = (call: Promise<unknown>) => call.catch(() => undefined);
    for (const locale of ["en", "el"]) {
      await quietly(
        api(token, "PATCH", `/api/products/${productId}?locale=${locale}`, {
          richDescription: null,
          gallery: [],
        }),
      );
      await quietly(
        api(token, "PATCH", `/api/categories/${categoryId}?locale=${locale}`, {
          intro: null,
          image: null,
          banner: null,
        }),
      );
    }
    if (delivery !== undefined)
      await quietly(publishGlobal(token, "site-settings", { deliveryAndReturns: delivery }));
    for (const id of uploads) await quietly(api(token, "DELETE", `/api/media/${id}`));
  });

  test("a product's rich description and extra picture show on its page in / and /us", async () => {
    await settled(`/us/products/${PRODUCT}`);
    await settled(`/products/${PRODUCT}`);
    await api(token, "PATCH", `/api/products/${productId}?locale=en`, {
      richDescription: description("en"),
      gallery: [picture.id],
    });
    await api(token, "PATCH", `/api/products/${productId}?locale=el`, {
      richDescription: description("el"),
    });

    const us = async () => html(`/us/products/${PRODUCT}`);
    expect(
      await seenWithinTwo(async () => (await us()).includes(WORDS.heading.en)),
    ).toBeGreaterThan(0);
    const english = await us();
    expect(english).toMatch(new RegExp(`<h3>${WORDS.heading.en}</h3>`));
    expect(english).toContain(`<strong>${WORDS.strong.en}</strong>`);
    expect(english).toContain('data-slot="product-info-rich"');
    // The market's language, never another's (ADR 0003).
    expect(english).not.toContain(WORDS.heading.el);
    // The picture after Medusa's, in the gallery (the same in every language: it is not localized).
    expect(english).toContain(imageOf(picture.filename));

    const cy = async () => html(`/products/${PRODUCT}`);
    expect(
      await seenWithinTwo(async () => (await cy()).includes(WORDS.heading.el)),
    ).toBeGreaterThan(0);
    const greek = await cy();
    expect(greek).toContain(`<strong>${WORDS.strong.el}</strong>`);
    expect(greek).not.toContain(WORDS.heading.en);
    expect(greek).toContain(imageOf(picture.filename));
  });

  test("the delivery text edited in site-settings shows on every product page", async () => {
    for (const handle of OTHER_PRODUCTS) await settled(`/us/products/${handle}`);
    await publishGlobal(token, "site-settings", { deliveryAndReturns: paragraph(WORDS.delivery) });
    for (const handle of OTHER_PRODUCTS) {
      const shows = async () => (await html(`/us/products/${handle}`)).includes(WORDS.delivery);
      expect(await seenWithinTwo(shows), handle).toBeGreaterThan(0);
    }
  });

  test("a category's banner and Greek introduction on its listing page under /, English on /us", async () => {
    await settled(`/categories/${CATEGORY}`);
    await settled(`/us/categories/${CATEGORY}`);
    await api(token, "PATCH", `/api/categories/${categoryId}?locale=el`, {
      intro: paragraph(WORDS.intro.el),
      banner: banner.id,
    });
    await api(token, "PATCH", `/api/categories/${categoryId}?locale=en`, {
      intro: paragraph(WORDS.intro.en),
    });

    const cy = async () => html(`/categories/${CATEGORY}`);
    expect(await seenWithinTwo(async () => (await cy()).includes(WORDS.intro.el))).toBeGreaterThan(
      0,
    );
    const greek = await cy();
    expect(greek).toContain('data-slot="product-listing-banner"');
    expect(greek).toContain(imageOf(banner.filename));
    expect(greek).toContain('data-slot="product-listing-intro"');
    expect(greek).not.toContain(WORDS.intro.en);

    const us = async () => html(`/us/categories/${CATEGORY}`);
    expect(await seenWithinTwo(async () => (await us()).includes(WORDS.intro.en))).toBeGreaterThan(
      0,
    );
    const english = await us();
    expect(english).not.toContain(WORDS.intro.el);
    expect(english).toContain(imageOf(banner.filename));
  });

  test("the home's category tile uses the category's own picture", async () => {
    await settled("/us");
    expect(await html("/us")).not.toContain(imageOf(picture.filename));
    await api(token, "PATCH", `/api/categories/${categoryId}?locale=en`, { image: picture.id });
    // In a tile: after the first tile's start (the picture is nowhere else on the home).
    const shows = async () => {
      const page = await html("/us");
      const first = page.indexOf('data-slot="category-tile"');
      return first >= 0 && page.indexOf(imageOf(picture.filename), first) > first;
    };
    expect(await seenWithinTwo(shows)).toBeGreaterThan(0);
  });
});
