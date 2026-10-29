import "server-only";
import type { Messages } from "@shopblok/i18n";
import type { MarketContext } from "../../market-context";
import { listCategories } from "../../medusa/categories";
import { listCollections } from "../../medusa/collections";
import { findProductTagId, listProductIdsOfType } from "../../medusa/product-groups";
import { listProductMetadata, listProductsByIds } from "../../medusa/products";
import { searchProducts } from "../../medusa/search";
import { readCategoryContent } from "../catalog";
import { renderTime } from "../now";
import { cmsOrNull } from "../read";
import type { CatalogReads } from "./catalog";
import type { CommerceContext } from "./commerce";

/**
 * The catalog reads of one market (T64): every search in the market's language and its region's
 * currency, every product priced in its region. The data layer's own cached reads, so the blocks
 * share their entries with the listing pages and are refreshed by the same tags; a category's own
 * picture is its Payload document's (T69), tagged `cms:category:<handle>`.
 */
export function catalogReads({ market, region }: Pick<MarketContext, "market" | "region">) {
  const locale = market.medusaLocale;
  const reads: CatalogReads = {
    search: async ({ filters, sort, limit }) =>
      (
        await searchProducts({
          locale,
          currencyCode: region.currencyCode,
          query: "",
          filters,
          sort,
          page: 1,
          pageSize: limit,
        })
      ).ids,
    products: async (ids) =>
      ids.length === 0 ? [] : listProductsByIds([...ids], { regionId: region.id, locale }),
    categories: () => listCategories(locale),
    collections: () => listCollections(locale),
    // Sorted, so the same products and keys share an entry whatever the editor's order.
    metadata: async (ids, keys) =>
      ids.length === 0 || keys.length === 0
        ? {}
        : listProductMetadata([...ids].sort(), [...new Set(keys)].sort()),
    tagId: (value) => findProductTagId(value),
    typeProductIds: (value) => listProductIdsOfType(value),
    // The synced collections have no drafts, so Draft Mode reads the same document (T69).
    categoryImage: async (handle) =>
      (
        await cmsOrNull(
          readCategoryContent({ market, draft: false }, handle),
          "category tile: its newest product's picture",
        )
      )?.image,
  };
  return reads;
}

/** The commerce blocks' context for a market (T64): its catalog, its URLs, the render's time. */
export async function commerceContext(
  context: Pick<MarketContext, "market" | "region" | "hrefs" | "url">,
  messages: Messages,
): Promise<CommerceContext> {
  const words = messages.sections.productCollection;
  return {
    reads: catalogReads(context),
    hrefs: context.hrefs,
    now: await renderTime(),
    storeHref: context.url("/store"),
    words: {
      empty: { title: words.emptyTitle, text: words.emptyText, action: words.emptyAction },
      recentlyViewed: messages.templates.productDetail.recentlyViewed,
    },
  };
}
