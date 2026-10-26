// Medusa's answers for the listing tests (T50): the demo catalog's categories, collections and
// option values, and a `/store/search` that a test answers with `search`. Not a test file.
import type { WireSearchResult } from "../lib/medusa/search";
import { stubMedusaFetch, type MedusaCall } from "./medusa-fetch";
import { wireCategories, wireHoodie, wireMug } from "./medusa-wire";

const regions = {
  regions: [
    { id: "reg_us", name: "US", currency_code: "usd", countries: [{ iso_2: "us" }] },
    { id: "reg_eu", name: "EU", currency_code: "eur", countries: [{ iso_2: "cy" }] },
  ],
  count: 2,
  offset: 0,
  limit: 100,
};

/** Every option value of the catalog, as `listOptionValueLabels` reads them. */
const labelProduct = {
  id: "prod_labels",
  handle: "labels",
  title: "Labels",
  options: [
    {
      id: "opt_colour",
      title: "Colour",
      values: [
        { id: "optval_black", value: "Black" },
        { id: "optval_navy", value: "Navy" },
        { id: "optval_white", value: "White" },
        { id: "optval_green", value: "Green" },
        { id: "optval_olive", value: "Olive" },
        { id: "optval_red", value: "Red" },
      ],
    },
    {
      id: "opt_size",
      title: "Size",
      values: [
        { id: "optval_s", value: "S" },
        { id: "optval_m", value: "M" },
      ],
    },
  ],
  variants: [],
};

export const wireCollections = [{ id: "pcol_basics", handle: "basics", title: "Basics" }];

/** A search that found the hoodie and the mug, with one value of every facet. */
export function wireSearch(overrides: WireSearchResult = {}): WireSearchResult {
  return {
    hits: [{ id: "prod_hoodie" }, { id: "prod_mug" }],
    facets: {
      category_ids: {
        type: "value",
        values: [
          { value: "pcat_apparel", count: 1 },
          { value: "pcat_home", count: 1 },
        ],
      },
      collection_ids: { type: "value", values: [{ value: "pcol_basics", count: 1 }] },
      option_value_ids: {
        type: "value",
        values: [
          { value: "optval_black", count: 1 },
          { value: "optval_m", count: 1 },
        ],
      },
      on_sale_usd: { type: "value", values: [{ value: "true", count: 1 }] },
      min_price_usd: { type: "stats", min: 5, max: 100 },
    },
    metadata: { count: 2 },
    ...overrides,
  };
}

/**
 * Stubs `fetch` for a listing: regions, categories, collections, products and the search, which
 * `search` answers (an Error is a network failure). The calls are returned for the test to read.
 */
export function stubListingMedusa(
  search: (body: Record<string, unknown>, call: MedusaCall) => WireSearchResult | Error = () =>
    wireSearch(),
): MedusaCall[] {
  return stubMedusaFetch((call) => {
    const path = call.url.pathname;
    if (path === "/store/regions") return { body: regions };
    if (path === "/store/product-categories")
      return {
        body: {
          product_categories: wireCategories,
          count: wireCategories.length,
          offset: 0,
          limit: 100,
        },
      };
    if (path === "/store/collections")
      return {
        body: {
          collections: wireCollections,
          count: wireCollections.length,
          offset: 0,
          limit: 100,
        },
      };
    if (path === "/store/products") {
      const labels = (call.url.searchParams.get("fields") ?? "").startsWith("id,options.id");
      const products = labels ? [labelProduct] : [wireHoodie, wireMug];
      return { body: { products, count: products.length, offset: 0, limit: 100 } };
    }
    if (path === "/store/search") {
      const answer = search(call.body as Record<string, unknown>, call);
      return answer instanceof Error ? answer : { body: { results: [answer] } };
    }
    return { status: 404, body: { message: `no route ${path}` } };
  });
}
