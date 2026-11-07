import { createHash } from "node:crypto";
import { documentRef, type SectionsDocument } from "../catalog-sections";
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

/** A reference as Payload stores it, by its own id: populated (an object) or not (the id). */
function referenceId(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value ?? null;
  return (value as { id?: unknown }).id ?? null;
}

/**
 * A stored tab's fingerprint: its label and its source as the editor set them (the references by
 * their Payload ids, so a synced document's own changes leave it as it is), 12 characters. The
 * endpoint carries it as `v` and the route answers only the tab it still names: an answer is
 * cached a minute (`CATALOG_HEADERS`), and a tab moved, edited or removed since must never get
 * another tab's products under its label (PR 124's review, finding 2). A republished page whose
 * tab changed asks a new URL; a page drawn before the change gets a 404, which no cache keeps.
 */
export function tabVersion(tab: StoredTab): string {
  const source = tab.productSource ?? {};
  const key = JSON.stringify([
    text(tab.label) ?? null,
    source.mode ?? null,
    referenceId(source.collection),
    referenceId(source.category),
    source.descendants ?? null,
    (source.products ?? []).map(referenceId),
    source.tag ?? null,
    source.type ?? null,
    source.limit ?? null,
    source.sort ?? null,
  ]);
  return createHash("sha256").update(key).digest("base64url").slice(0, 12);
}

/**
 * A tab's endpoint: the market, the published document that holds the block (a page, a synced
 * document's own sections or the `templates` global's defaults, T87), the block's id, the
 * tab's place among the block's stored tabs and the stored tab's fingerprint (`tabVersion`). The
 * route reads nothing else from the query (no source, no limit, no region), so a forged parameter
 * changes nothing.
 */
export function tabEndpoint(
  market: string,
  doc: SectionsDocument,
  block: string,
  tab: number,
  stored: StoredTab,
): string {
  const query = new URLSearchParams({
    market,
    doc: documentRef(doc),
    block,
    tab: String(tab),
    v: tabVersion(stored),
  });
  return `${BLOCK_TAB_ROUTE}?${query.toString()}`;
}
