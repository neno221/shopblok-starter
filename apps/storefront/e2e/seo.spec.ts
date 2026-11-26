import { listMarkets } from "../src/lib/markets/market";
import type { Market, MarketMap } from "../src/lib/markets/types";
import { buildPublicUrl } from "../src/lib/markets/url";
import { INDEXABLE_ROUTES, NOINDEX_ROUTES } from "../src/lib/seo/routes";
import { appEnv } from "./support/app-env";
import { expect, test } from "./support/csp";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";
import { rest } from "./support/payload-rest";
import { adminToken, base } from "./support/server";

// M7 D147 (T110): the SEO surface (SPEC §12) on `next start` with the seeded markets and Medusa:
//
// - `robots.txt` is closed (CI is not the live shop; `robots.test.ts` checks the open one).
// - Each open market's sitemap lists every product its region sells (against the Store API), its
//   categories, collections, pages and posts, each at the market's own address with every open
//   market's address as `xhtml:link` alternates, and names no market that is not open.
// - A page published in Payload appears in the sitemaps after its revalidation, and leaves them
//   when it is deleted.
// - One address of every indexable route (`lib/seo/routes.ts`) has hreflang for every open market,
//   and its share picture answers; one of every other route is `noindex`.
// - The JSON-LD of the home, a product, a category and a post parses, with Google's required
//   properties; a sale with an end gives the product's offers `priceValidUntil`.
// - The generated share picture answers 200, a PNG of 1200 × 630, in English and in Greek.
// - A CMS redirect from a root file (`/catalog.pdf`) answers its 308.
//
// What it makes (a page, a redirect, a GBP sale on one product) is deleted at the end.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

const stamp = Date.now().toString(36);
const SALE_PRODUCT = "demo-dotted-notebook";

let token = "";
let map: MarketMap;
let markets: Market[];
let origin = "";
const made: { pages: number[]; redirects: number[]; priceLists: string[] } = {
  pages: [],
  redirects: [],
  priceLists: [],
};

/** A GET of the shop from Node, no cookies, no redirects followed. */
const get = (path: string, init: RequestInit = {}) =>
  fetch(`${base()}${path}`, { redirect: "manual", ...init });

const text = async (path: string) => {
  const response = await get(path, { redirect: "follow" });
  expect(response.status, path).toBe(200);
  return response.text();
};

const unescapeHtml = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

/** A market's public URL of `path`, absolute (a market on its own domain has one already). */
const publicUrl = (market: Market, path: string) =>
  new URL(buildPublicUrl(market, path, map), origin).toString();

const market = (key: string) => {
  const found = markets.find((each) => each.key === key);
  if (found === undefined) throw new Error(`no open market ${key}`);
  return found;
};

/** The open market an absolute URL is in: the one whose home is the longest start of it. */
function marketOfUrl(url: string): string | undefined {
  let best: { key: string; length: number } | undefined;
  for (const each of markets) {
    const home = publicUrl(each, "/").replace(/\/$/, "");
    const inside = url === home || url === `${home}/` || url.startsWith(`${home}/`);
    if (inside && (best === undefined || home.length > best.length))
      best = { key: each.key, length: home.length };
  }
  return best?.key;
}

type SitemapEntry = { loc: string; lastmod?: string; alternates: Record<string, string> };

/** A sitemap's entries, read from its XML. */
function parseSitemap(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body = ""]) => ({
    loc: unescapeHtml(/<loc>([^<]*)<\/loc>/.exec(body)?.[1] ?? ""),
    ...(/<lastmod>([^<]*)<\/lastmod>/.exec(body)?.[1] === undefined
      ? {}
      : { lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(body)?.[1] }),
    alternates: Object.fromEntries(
      [...body.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(
        ([, lang = "", href = ""]) => [lang, unescapeHtml(href)],
      ),
    ),
  }));
}

const sitemapOf = async (key: string) => parseSitemap(await text(`/sitemap/${key}.xml`));

/** The `<link rel="alternate" hreflang>` of a page's HTML. */
const hreflangOf = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(
      ([, lang = "", href = ""]) => [lang, unescapeHtml(href)],
    ),
  );

const metaContent = (html: string, attribute: string, name: string) => {
  const tag = new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`).exec(html);
  return tag?.[1] === undefined ? undefined : unescapeHtml(tag[1]);
};

/** Every JSON-LD node of a page: each script's object, or each node of its `@graph`. */
function jsonLdOf(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(
    ([, body = ""]) => {
      const data = JSON.parse(body) as Record<string, unknown>;
      expect(data["@context"]).toBe("https://schema.org");
      return Array.isArray(data["@graph"]) ? (data["@graph"] as Record<string, unknown>[]) : [data];
    },
  );
}

const nodesOfType = (nodes: Record<string, unknown>[], type: string) =>
  nodes.filter((node) => node["@type"] === type);

/** Google's required properties of a BreadcrumbList: each item's position and name, `item` but on the last. */
function expectBreadcrumbs(node: Record<string, unknown> | undefined) {
  expect(node, "a BreadcrumbList").toBeDefined();
  const items = node?.["itemListElement"] as Record<string, unknown>[];
  expect(items.length).toBeGreaterThan(0);
  items.forEach((item, index) => {
    expect(item["@type"]).toBe("ListItem");
    expect(item["position"]).toBe(index + 1);
    expect(typeof item["name"]).toBe("string");
    if (index < items.length - 1) expect(String(item["item"])).toMatch(/^https?:\/\//);
  });
}

/** A PNG's width and height, from its IHDR chunk. */
const pngSize = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

async function expectShareImage(url: string) {
  const response = await fetch(url);
  expect(response.status, url).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
}

/** The Store API from Node with the storefront's publishable key. */
async function store<T>(path: string): Promise<T> {
  const response = await fetch(`${medusaUrl()}${path}`, {
    headers: {
      "x-publishable-api-key": appEnv("storefront", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"),
    },
  });
  expect(response.status, `${path}: ${await response.clone().text()}`).toBe(200);
  return (await response.json()) as T;
}

type StoreProduct = {
  handle: string;
  variants: { id: string; calculated_price?: { calculated_amount?: number | null } | null }[];
};

/** The handles a region sells: a product with a priced variant there (the page's 404 rule). */
async function soldHandles(regionId: string): Promise<string[]> {
  const handles: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await store<{ products: StoreProduct[]; count: number }>(
      `/store/products?region_id=${regionId}&fields=handle,*variants.calculated_price&order=handle&limit=100&offset=${offset}`,
    );
    for (const product of page.products)
      if (product.variants.some((v) => typeof v.calculated_price?.calculated_amount === "number"))
        handles.push(product.handle);
    if (page.products.length === 0 || offset + page.products.length >= page.count) return handles;
  }
}

async function regionOf(country: string): Promise<string> {
  const { regions } = await store<{ regions: { id: string; countries: { iso_2: string }[] }[] }>(
    "/store/regions?fields=id,countries.iso_2",
  );
  const region = regions.find((each) => each.countries.some((c) => c.iso_2 === country));
  if (region === undefined) throw new Error(`no region has ${country}`);
  return region.id;
}

test.beforeAll(async () => {
  token = await adminToken();
  map = (await (await get("/next/markets")).json()) as MarketMap;
  markets = listMarkets(map);
  origin = new URL(base()).origin;
  expect(markets.length, "the seeded markets").toBeGreaterThan(1);
});

test.afterAll(async () => {
  for (const id of made.redirects)
    await rest(token, "DELETE", `/api/redirects/${id}`).catch(() => undefined);
  for (const id of made.pages)
    await rest(token, "DELETE", `/api/pages/${id}`).catch(() => undefined);
  if (made.priceLists.length > 0) {
    const medusa = medusaUrl();
    const admin = await medusaAdminToken(medusa);
    for (const id of made.priceLists)
      await medusaAdminApi(medusa, admin, "DELETE", `/admin/price-lists/${id}`).catch(
        () => undefined,
      );
  }
});

test("robots.txt is closed off the live shop", async () => {
  const response = await get("/robots.txt");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/plain");
  const body = await response.text();
  expect(body).toMatch(/^User-Agent: \*\nDisallow: \/\n/);
  expect(body).not.toMatch(/Sitemap:/);
});

test("each open market's sitemap lists what it sells, at its own addresses, and no other market", async () => {
  const allowedLangs = new Set([...markets.map((each) => each.htmlLang), "x-default"]);
  const origins = new Set(markets.map((each) => new URL(publicUrl(each, "/")).origin));
  for (const each of markets) {
    const entries = await sitemapOf(each.key);
    const home = publicUrl(each, "/");
    expect(entries[0]?.loc, `${each.key}: its home first`).toBe(home);
    expect(entries.map((entry) => entry.loc)).toContain(publicUrl(each, "/store"));

    // Every address is the market's own (the market whose home is its longest start), and every
    // alternate an open market's.
    expect(
      entries.filter((entry) => marketOfUrl(entry.loc) !== each.key).map((e) => e.loc),
      each.key,
    ).toEqual([]);
    for (const entry of entries) {
      for (const [lang, href] of Object.entries(entry.alternates)) {
        expect(allowedLangs.has(lang), `${each.key}: ${lang} is an open market's`).toBe(true);
        expect(origins.has(new URL(href).origin)).toBe(true);
      }
      expect(entry.alternates[each.htmlLang], `${entry.loc} names itself`).toBe(entry.loc);
      expect(entry.alternates["x-default"]).toBeDefined();
      if (entry.lastmod !== undefined) expect(Number.isNaN(Date.parse(entry.lastmod))).toBe(false);
    }

    // The products: exactly the ones the market's region sells, each dated.
    const sold = await soldHandles(await regionOf(each.country));
    const products = entries.filter((entry) => entry.loc.includes("/products/"));
    expect(
      products.map((entry) => decodeURIComponent(entry.loc.split("/products/")[1] ?? "")).sort(),
      `${each.key}: the products its region sells`,
    ).toEqual([...sold].sort());
    expect(products.every((entry) => entry.lastmod !== undefined)).toBe(true);
    expect(entries.some((entry) => entry.loc.includes("/categories/"))).toBe(true);
  }
  // A market that is not open has no sitemap, and neither has a malformed id.
  for (const id of ["xx-yy", `${markets[0]?.key}_1`, `${markets[0]?.key}_2`])
    expect((await get(`/sitemap/${id}.xml`)).status, id).toBe(404);
});

test("a page published in Payload is in the sitemaps after its revalidation, and leaves when deleted", async () => {
  const slug = `e2e-sitemap-${stamp}`;
  const created = await rest<{ doc: { id: number } }>(token, "POST", "/api/pages?locale=en", {
    title: `Sitemap ${stamp}`,
    slug,
    _status: "published",
  });
  expect(created.status, created.text).toBe(201);
  const id = created.json().doc.id;
  made.pages.push(id);
  const us = market("en-us");
  const listed = async () =>
    (await sitemapOf(us.key)).some((entry) => entry.loc === publicUrl(us, `/${slug}`));
  const started = Date.now();
  await expect.poll(listed, { timeout: 60_000, intervals: [1_000] }).toBe(true);
  console.log(
    `seo: the published page was in the sitemap after ${(Date.now() - started) / 1000} s`,
  );
  // English only: the Greek market (no Greek slug) does not list it.
  const greek = await sitemapOf("el-cy");
  expect(greek.some((entry) => entry.loc.includes(slug))).toBe(false);

  expect((await rest(token, "DELETE", `/api/pages/${id}`)).status).toBe(200);
  made.pages = made.pages.filter((each) => each !== id);
  await expect.poll(listed, { timeout: 60_000, intervals: [1_000] }).toBe(false);
});

test("every indexable route has hreflang for every open market and a share picture that answers", async () => {
  const us = market("en-us");
  const entries = await sitemapOf(us.key);
  const kinds = ["/products/", "/categories/", "/collections/", "/journal/"];
  const samplePath = (route: (typeof INDEXABLE_ROUTES)[number]): string | undefined => {
    if ("fixed" in route) return route.fixed;
    if (!("sitemap" in route)) return undefined;
    const prefix = publicUrl(us, "/").replace(/\/$/, "");
    const paths = entries.map((entry) => entry.loc.slice(prefix.length) || "/");
    if (route.sitemap !== "") return paths.find((path) => path.startsWith(route.sitemap));
    // A CMS page: an address of none of the other kinds, and not a fixed one.
    return paths.find(
      (path) =>
        !kinds.some((kind) => path.startsWith(kind)) && !["/", "/store", "/journal"].includes(path),
    );
  };
  const checked: string[] = [];
  for (const route of INDEXABLE_ROUTES) {
    if ("samePageAs" in route) continue; // `routes.test.ts`: the first page's metadata function.
    const path = samplePath(route);
    expect(path, `an address of ${route.route || "the home"}`).toBeDefined();
    const page = `${buildPublicUrl(us, path ?? "/", map)}`;
    const html = await text(page);
    const alternates = hreflangOf(html);
    for (const each of markets)
      expect(Object.keys(alternates), `${page}: hreflang ${each.htmlLang}`).toContain(
        each.htmlLang,
      );
    expect(alternates["x-default"], `${page}: x-default`).toBeDefined();
    expect(alternates[us.htmlLang]).toBe(publicUrl(us, path ?? "/"));
    expect(metaContent(html, "name", "robots") ?? "", page).not.toMatch(/noindex/);
    const image = metaContent(html, "property", "og:image");
    expect(image, `${page}: og:image`).toBeDefined();
    // Never the internal `/{key}/…` address, which the proxy answers 404.
    expect(new URL(image ?? "", origin).pathname.startsWith(`/${us.key}/`)).toBe(false);
    const response = await fetch(new URL(image ?? "", origin));
    expect(response.status, `${page}: ${image}`).toBe(200);
    expect(response.headers.get("content-type") ?? "").toMatch(/^image\//);
    checked.push(page);
  }
  console.log(`seo: hreflang and og:image on ${checked.join(", ")}`);
});

test("every other route is noindex", async () => {
  for (const [route, path] of Object.entries(NOINDEX_ROUTES)) {
    const page = buildPublicUrl(market("en-us"), path, map);
    const response = await get(page, { redirect: "follow" });
    const html = await response.text();
    expect(
      metaContent(html, "name", "robots") ?? "",
      `${route} (${page}, ${response.status})`,
    ).toMatch(/noindex/);
  }
});

test("the JSON-LD parses, with Google's required properties", async () => {
  const us = market("en-us");
  const entries = await sitemapOf(us.key);
  const first = (kind: string) => {
    const loc = entries.find((entry) => entry.loc.includes(kind))?.loc;
    if (loc === undefined) throw new Error(`no ${kind} in the sitemap`);
    return new URL(loc).pathname;
  };

  const home = jsonLdOf(await text("/us"));
  expect(nodesOfType(home, "Organization")[0]).toMatchObject({
    name: expect.any(String),
    url: expect.any(String),
  });
  expect(nodesOfType(home, "WebSite")[0]).toMatchObject({
    name: expect.any(String),
    url: expect.any(String),
  });

  const product = jsonLdOf(await text(first("/products/")));
  const [item] = nodesOfType(product, "Product");
  expect(item).toMatchObject({ name: expect.any(String) });
  const offers = item?.["offers"] as Record<string, unknown> | Record<string, unknown>[];
  const offerList = Array.isArray(offers)
    ? offers
    : offers["@type"] === "AggregateOffer"
      ? ((offers["offers"] as Record<string, unknown>[] | undefined) ?? [offers])
      : [offers];
  expect(offerList.length).toBeGreaterThan(0);
  for (const offer of offerList) {
    expect(offer["price"] ?? offer["lowPrice"], "an offer's price").toBeDefined();
    expect(offer["priceCurrency"]).toBe("USD");
    if (offer["availability"] !== undefined)
      expect(String(offer["availability"])).toMatch(/^https:\/\/schema\.org\//);
  }
  expectBreadcrumbs(nodesOfType(product, "BreadcrumbList")[0]);

  expectBreadcrumbs(nodesOfType(jsonLdOf(await text(first("/categories/"))), "BreadcrumbList")[0]);

  const post = jsonLdOf(await text(first("/journal/")));
  expect(nodesOfType(post, "BlogPosting")[0]).toMatchObject({
    headline: expect.any(String),
    datePublished: expect.any(String),
  });
});

test("a sale with an end gives the product's offers priceValidUntil", async () => {
  const gb = market("en-gb");
  const region = await regionOf(gb.country);
  const { products } = await store<{ products: StoreProduct[] }>(
    `/store/products?handle=${SALE_PRODUCT}&region_id=${region}&fields=handle,*variants.calculated_price`,
  );
  const variants = products[0]?.variants ?? [];
  expect(variants.length, SALE_PRODUCT).toBeGreaterThan(0);
  const ends = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  ends.setUTCHours(12, 0, 0, 0);
  const medusa = medusaUrl();
  const admin = await medusaAdminToken(medusa);
  const { price_list } = await medusaAdminApi<{ price_list: { id: string } }>(
    medusa,
    admin,
    "POST",
    "/admin/price-lists",
    {
      title: `e2e sale ${stamp}`,
      description: "seo.spec.ts: deleted at the end",
      type: "sale",
      status: "active",
      ends_at: ends.toISOString(),
      prices: variants.map((variant) => ({
        variant_id: variant.id,
        currency_code: "gbp",
        amount: Math.max(1, Math.floor((variant.calculated_price?.calculated_amount ?? 10) / 2)),
      })),
    },
  );
  made.priceLists.push(price_list.id);

  const day = ends.toISOString().slice(0, 10);
  const page = buildPublicUrl(gb, `/products/${SALE_PRODUCT}`, map);
  const validUntil = async () => {
    const nodes = jsonLdOf(await text(page));
    const offers = nodesOfType(nodes, "Product")[0]?.["offers"];
    return JSON.stringify(offers ?? null);
  };
  await expect
    .poll(validUntil, { timeout: 60_000, intervals: [2_000] })
    .toContain(`"priceValidUntil":"${day}"`);
});

test("the generated share picture answers 200, 1200 × 630, in English and in Greek", async () => {
  const html = await text("/us/store");
  const image = metaContent(html, "property", "og:image");
  expect(image).toMatch(/\/us\/share-image\?title=/);
  await expectShareImage(new URL(image ?? "", origin).toString());
  // The Greek market's home, and its card (no title).
  const greek = metaContent(await text("/store"), "property", "og:image");
  expect(greek).toMatch(/^[^?]*\/share-image\?title=/);
  await expectShareImage(new URL(greek ?? "", origin).toString());
  await expectShareImage(`${origin}/share-image`);
  // A title someone else wrote, or a parameter more: a 308 to the bare address, never drawn
  // (`shareImageQuery`), so made-up addresses cost no render and no cache slot.
  const signed = new URL(image ?? "", origin);
  const altered = new URL(signed);
  altered.searchParams.set("title", "Free money");
  const extra = new URL(signed);
  extra.searchParams.set("x", "1");
  for (const address of [altered, extra, new URL(`${origin}/us/share-image?x=1`)]) {
    const response = await get(`${address.pathname}${address.search}`);
    expect(response.status, address.search).toBe(308);
    expect(response.headers.get("location")).toBe(`${origin}/us/share-image`);
  }
});

test("a CMS redirect from /catalog.pdf answers its 308", async () => {
  expect((await get("/catalog.pdf")).status).toBe(404);
  const saved = await rest<{ doc: { id: number } }>(token, "POST", "/api/redirects", {
    from: "/catalog.pdf",
    to: { type: "custom", url: "/store" },
    type: "308",
  });
  expect(saved.status, saved.text).toBe(201);
  made.redirects.push(saved.json().doc.id);
  await expect
    .poll(async () => (await get("/catalog.pdf")).status, { timeout: 65_000, intervals: [1_000] })
    .toBe(308);
  const response = await get("/catalog.pdf?utm_source=print");
  expect(response.status).toBe(308);
  // Cyprus is the primary market, at the root: its store, the query kept.
  expect(response.headers.get("location")).toBe(`${origin}/store?utm_source=print`);
  // A file below the root is not the redirect's: the US market's own 404 page.
  expect((await get("/us/catalog.pdf")).status).toBe(404);
});
