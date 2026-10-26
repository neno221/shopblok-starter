// The listing island's and the search overlay's endpoints (D59, D63, T50): `/next/listing` and
// `/next/search`, their statuses, their cache headers and what the overlay suggests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubListingMedusa, wireSearch } from "../../test-support/listing-wire";
import { connectionRefused, PUBLISHABLE_KEY } from "../../test-support/medusa-fetch";
import { seeded } from "../markets/test-maps";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));

const get = (path: string) => new Request(`http://localhost:8000${path}`);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const searchBody = (calls: ReturnType<typeof stubListingMedusa>) =>
  calls.filter((call) => call.url.pathname === "/store/search").at(-1)?.body as {
    filters: Record<string, unknown>;
    pagination: { skip: number; take: number };
  };

describe("GET /next/listing (D59)", () => {
  it("answers 400 for a scope that is none, or none at all", async () => {
    stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    for (const query of [
      "market=en-us",
      "market=en-us&scope=nonsense",
      "market=en-us&scope=category:a//b",
    ]) {
      const response = await listingResponse(get(`/next/listing?${query}`));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("answers 404 for a market that is none", async () => {
    stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    for (const market of ["xx-zz", ""]) {
      const response = await listingResponse(get(`/next/listing?market=${market}&scope=store`));
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("answers 404 for a listing Medusa lacks", async () => {
    stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    for (const scope of ["collection:nope", "category:nope", "category:apparel/nope"]) {
      const response = await listingResponse(get(`/next/listing?market=en-us&scope=${scope}`));
      expect(response.status).toBe(404);
    }
  });

  it("answers 404 for a page past the last", async () => {
    stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    const response = await listingResponse(get("/next/listing?market=en-us&scope=store&page=2"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers the listing's results as JSON that a shared cache may keep a minute", async () => {
    const calls = stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    const response = await listingResponse(
      get("/next/listing?market=en-us&scope=category:apparel&sort=price-asc&sale=1&q=ignored"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const body = await response.json();
    expect(body.toolbar.count).toBe(2);
    expect(body.grid.products.map((card: { id: string }) => card.id)).toEqual([
      "prod_hoodie",
      "prod_mug",
    ]);
    // The forms of the results go to the search page and name the listing they came from.
    expect(body.toolbar.sort).toMatchObject({
      action: "/us/search",
      selected: "price-asc",
      params: [
        { name: "scope", value: "category:apparel" },
        { name: "sale", value: "1" },
      ],
    });
    expect(body.filters.params).toContainEqual({ name: "scope", value: "category:apparel" });
    // The chips link back to the listing's own path.
    expect(body.filters.active.clearHref).toBe("/us/categories/apparel?sort=price-asc");
    // A listing's island never sends words: the query is dropped, and the sort is the engine's.
    expect(
      body.toolbar.sort.options.map((option: { value: string }) => option.value),
    ).not.toContain("relevance");
    expect(searchBody(calls).filters).not.toHaveProperty("q");
    expect(searchBody(calls).filters).toHaveProperty("$and");
  });

  it("reads the page from the query and the page size from the setting", async () => {
    vi.stubEnv("STOREFRONT_LISTING_PAGE_SIZE", "10");
    const calls = stubListingMedusa(() => wireSearch({ metadata: { count: 35 } }));
    const { listingResponse } = await import("./handlers");
    const response = await listingResponse(get("/next/listing?market=en-us&scope=store&page=3"));
    expect(response.status).toBe(200);
    expect((await response.json()).page).toEqual({ page: 3, pageCount: 4 });
    expect(searchBody(calls).pagination).toMatchObject({ skip: 20, take: 10 });
  });

  it("answers 503 when Medusa cannot be reached", async () => {
    stubListingMedusa(() => connectionRefused());
    const { listingResponse } = await import("./handlers");
    const response = await listingResponse(get("/next/listing?market=en-us&scope=store"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when Medusa is down before the market is known", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw connectionRefused();
      }),
    );
    const { listingResponse } = await import("./handlers");
    const response = await listingResponse(get("/next/listing?market=en-us&scope=store"));
    expect(response.status).toBe(503);
  });

  it("lets a fault of our own through", async () => {
    vi.stubEnv("STOREFRONT_LISTING_PAGE_SIZE", "99");
    stubListingMedusa();
    const { listingResponse } = await import("./handlers");
    await expect(listingResponse(get("/next/listing?market=en-us&scope=store"))).rejects.toThrow(
      /STOREFRONT_LISTING_PAGE_SIZE/,
    );
  });
});

describe("GET /next/search (D63)", () => {
  const facets = (
    categories: [string, number][],
    options: [string, number][] = [],
  ): ReturnType<typeof wireSearch> =>
    wireSearch({
      facets: {
        category_ids: {
          type: "value",
          values: categories.map(([value, count]) => ({ value, count })),
        },
        option_value_ids: {
          type: "value",
          values: options.map(([value, count]) => ({ value, count })),
        },
      },
    });

  it("answers 400 for a query that is empty", async () => {
    stubListingMedusa();
    const { searchResponse } = await import("./handlers");
    for (const path of ["/next/search?market=en-us", "/next/search?market=en-us&q=%20%20"]) {
      const response = await searchResponse(get(path));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("answers 404 for a market that is none", async () => {
    stubListingMedusa();
    const { searchResponse } = await import("./handlers");
    const response = await searchResponse(get("/next/search?market=xx-zz&q=hoodie"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers the overlay's products, asking for 8 at most, by relevance", async () => {
    const calls = stubListingMedusa();
    const { searchResponse } = await import("./handlers");
    const response = await searchResponse(get("/next/search?market=en-us&q=%20hoodie%20"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const body = await response.json();
    expect(body.query).toBe("hoodie");
    expect(body.total).toBe(2);
    expect(body.products.map((card: { id: string }) => card.id)).toEqual([
      "prod_hoodie",
      "prod_mug",
    ]);
    expect(body.products.length).toBeLessThanOrEqual(8);
    expect(searchBody(calls)).toMatchObject({
      filters: { q: "hoodie" },
      pagination: { skip: 0, take: 8 },
    });
  });

  it("keeps 200 characters of the query", async () => {
    stubListingMedusa();
    const { searchResponse } = await import("./handlers");
    const body = await (
      await searchResponse(get(`/next/search?market=en-us&q=${"a".repeat(300)}`))
    ).json();
    expect(body.query).toHaveLength(200);
  });

  it("links the matches' categories by their paths, the most numerous first, four at most", async () => {
    stubListingMedusa(() =>
      facets([
        ["pcat_home", 3],
        ["pcat_tops", 5],
        ["pcat_apparel", 4],
        ["pcat_knit", 1],
        ["pcat_orphan", 2],
        ["pcat_none", 9],
        ["pcat_empty", 0],
      ]),
    );
    const { searchResponse } = await import("./handlers");
    const body = await (await searchResponse(get("/next/search?market=en-us&q=shirt"))).json();
    // An id the tree lacks and a count of 0 are left out.
    expect(body.categories).toEqual([
      { label: "Μπλούζες", href: "/us/categories/apparel/tops" },
      { label: "Ρούχα", href: "/us/categories/apparel" },
      { label: "Σπίτι", href: "/us/categories/home" },
      { label: "Χωρίς γονέα", href: "/us/categories/orphan" },
    ]);
  });

  it("suggests the matches' option values: three letters or more, not the query, four at most", async () => {
    stubListingMedusa(() =>
      facets(
        [],
        [
          ["optval_s", 20],
          ["optval_black", 9],
          ["optval_navy", 8],
          ["optval_white", 7],
          ["optval_unknown", 6],
          ["optval_green", 5],
          ["optval_olive", 4],
          ["optval_red", 3],
        ],
      ),
    );
    const { searchResponse } = await import("./handlers");
    const body = await (await searchResponse(get("/next/search?market=en-us&q=NAVY"))).json();
    // "S" is shorter than three, "Navy" is the query (whatever its case), and the id has no label.
    expect(body.suggestions).toEqual(["Black", "White", "Green", "Olive"]);
    expect(body.categories).toEqual([]);
  });

  it("suggests nothing when the matches have no option values", async () => {
    stubListingMedusa(() => facets([]));
    const { searchResponse } = await import("./handlers");
    const body = await (await searchResponse(get("/next/search?market=en-us&q=mug"))).json();
    expect(body.suggestions).toEqual([]);
  });

  it("answers 503 when Medusa cannot be reached", async () => {
    stubListingMedusa(() => connectionRefused());
    const { searchResponse } = await import("./handlers");
    const response = await searchResponse(get("/next/search?market=en-us&q=hoodie"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
