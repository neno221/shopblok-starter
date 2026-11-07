import type { ProductCard } from "@shopblok/registry/contracts";
import { categoryPaths } from "../../medusa/categories";
import type { Hrefs } from "../../view-models/common";
import type { CatalogReads } from "./catalog";
import { liveMedusaId, resolveProductSource, type ProductSourceValue } from "./products";
import { text } from "./shared";

// The `tabs` product collection's tabs (T81, M5 plan §5 T81): each tab a label and a source of its
// own, resolved in the market's region through the catalog's cached reads, as every source is
// (`resolveProductSource`). The page's resolver (`commerce.ts`) reads every tab, to leave out those
// with nothing in the market and to put the first tab's products in the HTML; the tab's route
// (`/next/block-tab`) reads one tab by its stored place the same way, so its answer and the page
// agree and share the cache entries.

/** A tab as Payload stores it: its label in the page's language and its source. */
export type StoredTab = { label?: string | null; productSource?: ProductSourceValue | null };

/** The most products a tab shows, and how many unless the editor says (the block's own). */
export const TAB_LIMITS = { max: 24, defaultLimit: 8 } as const;

/** The most tabs a block has (SPEC §7.4's "up to four sources"). */
export const MAX_TABS = 4;

/** A tab resolved for the market: its label, the listing its products come from, its products. */
export type ResolvedTab = { label: string; href: string; products: ProductCard[] };

/**
 * The listing a tab's products come from, its link without scripts: a collection's or a category's
 * page, the store on sale or newest first, or the store.
 */
async function listingOf(
  source: ProductSourceValue,
  reads: CatalogReads,
  hrefs: Required<Hrefs>,
  storeHref: string,
): Promise<string> {
  switch (source.mode) {
    case "collection": {
      const id = liveMedusaId(source.collection);
      const found = id === null ? undefined : (await reads.collections()).find((c) => c.id === id);
      return found === undefined ? storeHref : hrefs.collection(found.handle);
    }
    case "category": {
      const id = liveMedusaId(source.category);
      const found =
        id === null
          ? undefined
          : categoryPaths(await reads.categories()).find(({ node }) => node.id === id);
      return found === undefined ? storeHref : hrefs.category(found.path.join("/"));
    }
    case "onSale":
      return `${storeHref}?sale=1`;
    case "newest":
      return `${storeHref}?sort=newest`;
    default:
      return storeHref;
  }
}

/**
 * One stored tab for the market: `null` when it has no label or its source has nothing the market
 * sells (no fallback: a tab is left out instead).
 */
export async function resolveTab(
  tab: StoredTab,
  reads: CatalogReads,
  hrefs: Required<Hrefs>,
  storeHref: string,
): Promise<ResolvedTab | null> {
  const label = text(tab.label);
  const source = tab.productSource;
  if (label === undefined || source == null) return null;
  // No `emptyBehavior` on a tab's source: nothing found is no products, never the newest.
  const resolved = await resolveProductSource(
    { ...source, emptyBehavior: "hide" },
    reads,
    hrefs,
    TAB_LIMITS,
  );
  const products = resolved?.products ?? [];
  if (products.length === 0) return null;
  return { label, href: await listingOf(source, reads, hrefs, storeHref), products };
}

/** Where the tab island asks for a tab's products (`src/app/next/block-tab/route.ts`). */
export const BLOCK_TAB_ROUTE = "/next/block-tab";

/**
 * A tab's endpoint: the market, the published page that holds the block, the block's id and the
 * tab's place among the block's stored tabs. The route reads nothing else from the query (no
 * source, no limit, no region), so a forged parameter changes nothing.
 */
export function tabEndpoint(market: string, doc: number, block: string, tab: number): string {
  const query = new URLSearchParams({ market, doc: String(doc), block, tab: String(tab) });
  return `${BLOCK_TAB_ROUTE}?${query.toString()}`;
}
