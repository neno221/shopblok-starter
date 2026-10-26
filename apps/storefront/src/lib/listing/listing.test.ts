// A listing's results (D59, T50): the page size setting, a scope resolved from Medusa's categories
// and collections, and one page of results with its facets, chips, sort and empty states.
import { catalogs } from "@shopblok/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubListingMedusa, wireSearch } from "../../test-support/listing-wire";
import { PUBLISHABLE_KEY } from "../../test-support/medusa-fetch";
import { seeded } from "../markets/test-maps";
import { parseListingQuery } from "./query";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));

const messages = catalogs.en;
const copy = messages.templates.productListing;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function load() {
  const listing = await import("./listing");
  const { getMarketContext } = await import("../market-context");
  const context = await getMarketContext("en-us");
  if (context === null) throw new Error("the seeded map has en-us");
  return { ...listing, context };
}

describe("listingPageSize", () => {
  it("is 24 unless the setting says otherwise", async () => {
    const { listingPageSize } = await import("./listing");
    expect(listingPageSize({})).toBe(24);
    expect(listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: "" })).toBe(24);
    expect(listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: "  " })).toBe(24);
  });

  it("takes a whole number from 1 to 48", async () => {
    const { listingPageSize } = await import("./listing");
    expect(listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: "1" })).toBe(1);
    expect(listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: " 12 " })).toBe(12);
    expect(listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: "48" })).toBe(48);
  });

  it("throws for anything else", async () => {
    const { listingPageSize } = await import("./listing");
    for (const value of ["0", "49", "-3", "2.5", "many", "1e1x"])
      expect(() => listingPageSize({ STOREFRONT_LISTING_PAGE_SIZE: value })).toThrow(
        /STOREFRONT_LISTING_PAGE_SIZE must be a whole number from 1 to 48/,
      );
  });

  it("reads the process environment when it is given no source", async () => {
    const { listingPageSize } = await import("./listing");
    vi.stubEnv("STOREFRONT_LISTING_PAGE_SIZE", "36");
    expect(listingPageSize()).toBe(36);
  });
});

describe("resolveScope", () => {
  it("names the store: every product, under the home page", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    expect(await resolveScope(context, messages, { kind: "store" })).toEqual({
      scope: { kind: "store" },
      title: "All products",
      trail: [{ label: "Home", href: context.url("/") }],
      path: "/store",
      filters: {},
    });
  });

  it("finds a collection by its handle and filters by its id", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    const resolved = await resolveScope(context, messages, {
      kind: "collection",
      handle: "basics",
    });
    expect(resolved).toMatchObject({
      title: "Basics",
      path: "/collections/basics",
      filters: { collectionIds: ["pcol_basics"] },
      trail: [{ label: "Home" }],
    });
  });

  it("is null for a collection Medusa lacks", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    expect(
      await resolveScope(context, messages, { kind: "collection", handle: "nope" }),
    ).toBeNull();
  });

  it("finds a nested category, with the parents in its trail and its own id", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    const resolved = await resolveScope(context, messages, {
      kind: "category",
      path: ["apparel", "tops"],
    });
    expect(resolved).toEqual({
      scope: { kind: "category", path: ["apparel", "tops"] },
      title: "Μπλούζες",
      trail: [
        { label: "Home", href: context.url("/") },
        { label: "Ρούχα", href: context.hrefs.category("apparel") },
      ],
      path: "/categories/apparel/tops",
      filters: { categoryIds: ["pcat_tops"] },
    });
  });

  it("lists a parent category's descendants too", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    const resolved = await resolveScope(context, messages, { kind: "category", path: ["apparel"] });
    expect(resolved?.filters.categoryIds).toEqual(["pcat_apparel", "pcat_knit", "pcat_tops"]);
    expect(resolved?.trail).toHaveLength(1);
  });

  it("is null for a category, or a path through one, that is not there", async () => {
    stubListingMedusa();
    const { resolveScope, context } = await load();
    for (const path of [["nope"], ["apparel", "nope"], ["home", "tops"], ["tops"]])
      expect(await resolveScope(context, messages, { kind: "category", path })).toBeNull();
  });
});

describe("readListing", () => {
  const params = (search = "") => new URLSearchParams(search);

  /** A listing read with the store scope, or the one given, and the links of the store page. */
  async function read(
    search: string,
    options: {
      pathPage?: number;
      pageSize?: number;
      scope?: Parameters<Awaited<ReturnType<typeof load>>["resolveScope"]>[2];
      withWords?: boolean;
    } = {},
  ) {
    const { readListing, resolveScope, scopeField, context } = await load();
    const scope = options.scope ?? { kind: "store" as const };
    const resolved = await resolveScope(context, messages, scope);
    if (resolved === null) throw new Error("the scope exists");
    const urlParams = params(search);
    const query = parseListingQuery(urlParams);
    const words = query.query !== "";
    return {
      context,
      resolved,
      results: await readListing({
        context,
        messages,
        resolved,
        query,
        params: urlParams,
        pathPage: options.pathPage ?? 1,
        pageSize: options.pageSize ?? 24,
        links: words
          ? {
              base: { path: context.url("/search"), params: params(`q=${query.query}`) },
              formAction: context.url("/search"),
              hidden: [{ name: "q", value: query.query }],
            }
          : {
              base: { path: context.url(resolved.path), params: params() },
              formAction: context.url("/search"),
              hidden: [scopeField(scope)],
            },
      }),
    };
  }

  it("answers the store's first page: the cards, the count, the groups and one page", async () => {
    const calls = stubListingMedusa();
    const { results } = await read("");
    expect(results?.toolbar.count).toBe(2);
    expect(results?.grid.products.map((card) => card.id)).toEqual(["prod_hoodie", "prod_mug"]);
    expect(results?.grid.layout).toBe("grid");
    expect(results?.page).toEqual({ page: 1, pageCount: 1 });
    expect(results?.filters?.groups.map((group) => group.id)).toEqual([
      "category",
      "collection",
      "opt_colour",
      "opt_size",
      "price",
      "sale",
    ]);
    expect(results?.filters?.active).toBeUndefined();
    expect(results?.filters?.resultCount).toBe(2);
    // The newest first without a query, 24 a page.
    const search = calls.find((call) => call.url.pathname === "/store/search");
    expect(search?.body).toMatchObject({
      filters: {},
      pagination: { skip: 0, take: 24, order: { created_at: "DESC" } },
    });
  });

  it("removes the group the scope fixes: a category page does not offer categories", async () => {
    const calls = stubListingMedusa();
    const { results } = await read("", { scope: { kind: "category", path: ["apparel"] } });
    const ids = results?.filters?.groups.map((group) => group.id);
    expect(ids).not.toContain("category");
    expect(ids).toContain("collection");
    const search = calls.find((call) => call.url.pathname === "/store/search");
    expect(search?.body).toMatchObject({
      filters: { category_ids: ["pcat_apparel", "pcat_knit", "pcat_tops"] },
    });
  });

  it("removes the collection group on a collection page, and keeps the URL's other filters", async () => {
    const calls = stubListingMedusa();
    const { results } = await read("sale=1&category=pcat_home", {
      scope: { kind: "collection", handle: "basics" },
    });
    const ids = results?.filters?.groups.map((group) => group.id);
    expect(ids).not.toContain("collection");
    expect(ids).toContain("category");
    const search = calls.find((call) => call.url.pathname === "/store/search");
    expect(search?.body).toMatchObject({
      filters: { $and: expect.arrayContaining([{ collection_ids: ["pcol_basics"] }]) },
    });
  });

  it("lets the scope win over a filter of the same group in the URL", async () => {
    const calls = stubListingMedusa();
    await read("category=pcat_home", { scope: { kind: "category", path: ["apparel", "tops"] } });
    const search = calls.find((call) => call.url.pathname === "/store/search");
    expect((search?.body as { filters: object }).filters).toEqual({ category_ids: ["pcat_tops"] });
  });

  it("has a chip per chosen value, each removing only its own value from the base path", async () => {
    stubListingMedusa();
    const { results, context } = await read(
      "sort=price-asc&collection=pcol_basics&opt_colour=optval_black&price.min=10&price.max=50&sale=1&page=1",
    );
    const store = context.url("/store");
    const active = results?.filters?.active;
    expect(active?.filters.map((chip) => chip.id)).toEqual([
      "collection:pcol_basics",
      "opt_colour:optval_black",
      "price",
      "sale",
    ]);
    expect(active?.filters[0]).toEqual({
      id: "collection:pcol_basics",
      group: "Collection",
      label: "Basics",
      removeHref: `${store}?opt_colour=optval_black&price.max=50&price.min=10&sale=1&sort=price-asc`,
    });
    expect(active?.filters[1]).toMatchObject({ group: "Colour", label: "Black" });
    expect(active?.filters[1]?.removeHref).toBe(
      `${store}?collection=pcol_basics&price.max=50&price.min=10&sale=1&sort=price-asc`,
    );
    expect(active?.filters[2]?.group).toBe("Price");
    expect(active?.filters[2]?.label).toMatch(/\$10.*\$50/);
    // The price chip removes both bounds; the page is not a filter, so no link keeps it.
    expect(active?.filters[2]?.removeHref).toBe(
      `${store}?collection=pcol_basics&opt_colour=optval_black&sale=1&sort=price-asc`,
    );
    expect(active?.filters[3]).toEqual({
      id: "sale",
      label: "On sale",
      removeHref: `${store}?collection=pcol_basics&opt_colour=optval_black&price.max=50&price.min=10&sort=price-asc`,
    });
    // Clearing keeps the sort and nothing else.
    expect(active?.clearHref).toBe(`${store}?sort=price-asc`);
  });

  it("clears to the bare path when no sort is chosen", async () => {
    stubListingMedusa();
    const { results, context } = await read("sale=1");
    expect(results?.filters?.active?.clearHref).toBe(context.url("/store"));
  });

  it("passes the scope and the filters through the sort and filter forms", async () => {
    stubListingMedusa();
    const { results, context } = await read("sort=price-desc&sale=1&category=pcat_home", {
      scope: { kind: "category", path: ["apparel"] },
    });
    expect(results?.toolbar.sort).toMatchObject({
      action: context.url("/search"),
      name: "sort",
      selected: "price-desc",
      // The filters ride along with a new sort, but not the sort itself.
      params: [
        { name: "scope", value: "category:apparel" },
        { name: "category", value: "pcat_home" },
        { name: "sale", value: "1" },
      ],
    });
    expect(results?.filters).toMatchObject({
      action: context.url("/search"),
      params: [
        { name: "scope", value: "category:apparel" },
        { name: "sort", value: "price-desc" },
      ],
    });
  });

  it("offers relevance only with a query, and ranks by it first", async () => {
    const calls = stubListingMedusa();
    const listing = await read("");
    expect(listing.results?.toolbar.sort.options.map((option) => option.value)).toEqual([
      "newest",
      "price-asc",
      "price-desc",
    ]);
    expect(listing.results?.toolbar.sort.selected).toBe("newest");

    const search = await read("q=hoodie&sale=1");
    expect(search.results?.toolbar.sort.options.map((option) => option.value)).toEqual([
      "relevance",
      "newest",
      "price-asc",
      "price-desc",
    ]);
    expect(search.results?.toolbar.sort.options[0]?.label).toBe("Relevance");
    expect(search.results?.toolbar.sort.selected).toBe("relevance");
    // The query rides along in the forms and in the chips' links.
    expect(search.results?.filters?.params).toEqual([{ name: "q", value: "hoodie" }]);
    expect(search.results?.filters?.active?.filters[0]?.removeHref).toBe(
      `${search.context.url("/search")}?q=hoodie`,
    );
    const body = calls.filter((call) => call.url.pathname === "/store/search").at(-1)?.body;
    expect(body).toMatchObject({ filters: { q: "hoodie" } });
    expect((body as { pagination: object }).pagination).not.toHaveProperty("order");
  });

  it("keeps the sort the URL names", async () => {
    stubListingMedusa();
    const { results } = await read("q=hoodie&sort=newest");
    expect(results?.toolbar.sort.selected).toBe("newest");
  });

  it("is null for a page past the last, and for a page the path names", async () => {
    stubListingMedusa(() => wireSearch({ metadata: { count: 30 } }));
    expect((await read("", { pageSize: 24 })).results?.page).toEqual({ page: 1, pageCount: 2 });
    expect((await read("", { pageSize: 24, pathPage: 2 })).results?.page).toEqual({
      page: 2,
      pageCount: 2,
    });
    expect((await read("", { pageSize: 24, pathPage: 3 })).results).toBeNull();
    // The URL's page wins over the path's.
    expect((await read("page=3", { pageSize: 24, pathPage: 1 })).results).toBeNull();
    expect((await read("page=2", { pageSize: 24, pathPage: 1 })).results?.page.page).toBe(2);
  });

  it("asks the search for the page's offset", async () => {
    const calls = stubListingMedusa(() => wireSearch({ metadata: { count: 30 } }));
    await read("", { pageSize: 10, pathPage: 3 });
    const search = calls.find((call) => call.url.pathname === "/store/search");
    expect(search?.body).toMatchObject({ pagination: { skip: 20, take: 10 } });
  });

  it("is page 1 of 1 when nothing is found", async () => {
    stubListingMedusa(() => ({ hits: [], facets: {}, metadata: { count: 0 } }));
    const { results } = await read("");
    expect(results?.page).toEqual({ page: 1, pageCount: 1 });
    expect(results?.grid.products).toEqual([]);
    expect(results?.filters).toBeUndefined();
  });

  describe("empty states", () => {
    const nothing = () => ({ hits: [], facets: {}, metadata: { count: 0 } });

    it("says no product matches when filters are chosen, with a link that clears them", async () => {
      stubListingMedusa(nothing);
      const { results, context } = await read("category=pcat_home&sort=newest");
      expect(results?.grid.empty).toEqual({
        title: copy.noMatch.title,
        text: copy.noMatch.text,
        action: { label: copy.noMatch.clear, href: `${context.url("/store")}?sort=newest` },
      });
      // The chosen value stays in its group with 0, so the shopper can untick it.
      expect(results?.filters?.groups[0]).toMatchObject({
        id: "category",
        options: [{ value: "pcat_home", count: 0, selected: true }],
      });
    });

    it("says no product matches, without a link, when no chip can be drawn", async () => {
      stubListingMedusa(nothing);
      const { results } = await read("collection=pcol_unknown");
      expect(results?.grid.empty).toEqual({ title: copy.noMatch.title, text: copy.noMatch.text });
    });

    it("says what the search found nothing for", async () => {
      stubListingMedusa(nothing);
      const { results } = await read("q=zebra");
      expect(results?.grid.empty).toEqual({
        title: "No results for “zebra”",
        text: messages.templates.searchResults.empty.text,
      });
    });

    it("sends an empty listing to the rest of the store", async () => {
      stubListingMedusa(nothing);
      const { results, context } = await read("", { scope: { kind: "category", path: ["home"] } });
      expect(results?.grid.empty).toEqual({
        title: copy.empty.title,
        text: copy.empty.text,
        action: { label: copy.empty.browse, href: context.url("/store") },
      });
    });

    it("prefers the filters' words over the query's", async () => {
      stubListingMedusa(nothing);
      const { results } = await read("q=zebra&category=pcat_home");
      expect(results?.grid.empty.title).toBe(copy.noMatch.title);
    });
  });
});
