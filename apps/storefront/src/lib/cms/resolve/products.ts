import type { ProductCard } from "@shopblok/registry/contracts";
import type { ProductDto } from "../../medusa/products";
import type { SearchFilters, SearchSort } from "../../medusa/search";
import type { Hrefs } from "../../view-models/common";
import { toProductCard } from "../../view-models/product";
import { flattenCategories, type CategoryNode } from "../../medusa/categories";
import type { CatalogReads } from "./catalog";

// SPEC §7.5's `productSource`, resolved (T64, D79): the references Payload stores become the
// market's products, in its region's prices and its language, through `CatalogReads`. Each mode is
// one read of the data layer: the search for a collection, a category (with its descendants from
// the tree), a tag, the newest and the products on sale (the index's `on_sale_<currency>`, a price
// from a sale price list); the products by id for a handpicked list, in the editor's order; a
// product type's products by id, then the search for their order. A reference Medusa deleted
// (D75's soft delete) gives nothing, never a stale product. When nothing is found, the block's
// `emptyBehavior` decides: hide the block, say so, or show the newest instead.

/** A `productSource` group as Payload stores it, read at depth 1 (references populated). */
export type ProductSourceValue = {
  mode?: string | null;
  collection?: unknown;
  category?: unknown;
  descendants?: boolean | null;
  products?: readonly unknown[] | null;
  tag?: string | null;
  type?: string | null;
  limit?: number | null;
  sort?: string | null;
  emptyBehavior?: string | null;
};

export type EmptyBehavior = "hide" | "message" | "newest";

/** A source's products for a block, and what to do when there are none. */
export type ResolvedProducts = { products: ProductCard[]; empty: EmptyBehavior };

const SORTS: Record<string, Exclude<SearchSort, "relevance">> = {
  newest: "newest",
  priceAsc: "price-asc",
  priceDesc: "price-desc",
  title: "title",
};

/**
 * A synced document's Medusa id, when the reference is populated and Medusa has not deleted it.
 * A bare id (the document was not populated) is not enough to know either, so it gives nothing.
 */
export function liveMedusaId(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  const doc = value as { medusaId?: unknown; deletedInMedusa?: unknown };
  return typeof doc.medusaId === "string" && doc.medusaId !== "" && doc.deletedInMedusa !== true
    ? doc.medusaId
    : null;
}

/** The node with Medusa id `id` in the tree, or `undefined`. */
export function findCategory(tree: readonly CategoryNode[], id: string): CategoryNode | undefined {
  return flattenCategories(tree).find((node) => node.id === id);
}

/** A whole number from 1 to `max`, else `fallback`. */
function limitOf(value: number | null | undefined, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? Math.min(value, max)
    : Math.min(fallback, max);
}

const emptyOf = (value: string | null | undefined): EmptyBehavior =>
  value === "message" || value === "newest" ? value : "hide";

/** The DTOs as cards, without the products that have no price in the region. */
function cards(products: readonly ProductDto[], hrefs: Pick<Hrefs, "product">): ProductCard[] {
  const seen = new Set<string>();
  return products.flatMap((product) => {
    if (seen.has(product.id)) return [];
    seen.add(product.id);
    return toProductCard(product, hrefs) ?? [];
  });
}

/**
 * The source's product DTOs, in the order the source gives them: at most `limit`, or for a
 * handpicked list (whose limit field is hidden) the editor's whole list up to the block's `max`.
 */
async function readSource(
  value: ProductSourceValue,
  reads: CatalogReads,
  { limit, max }: { limit: number; max: number },
): Promise<ProductDto[]> {
  const sort = SORTS[value.sort ?? ""] ?? "newest";
  const search = async (filters: SearchFilters, order = sort) =>
    reads.products(await reads.search({ filters, sort: order, limit }));
  switch (value.mode) {
    case "handpicked": {
      const ids = (value.products ?? []).flatMap((product) => liveMedusaId(product) ?? []);
      return ids.length === 0 ? [] : reads.products([...new Set(ids)].slice(0, max));
    }
    case "collection": {
      const id = liveMedusaId(value.collection);
      return id === null ? [] : search({ collectionIds: [id] });
    }
    case "category": {
      const id = liveMedusaId(value.category);
      if (id === null) return [];
      const node = findCategory(await reads.categories(), id);
      // A category the Store API does not list (inactive, internal) has nothing to show.
      if (node === undefined) return [];
      const ids =
        value.descendants === false ? [node.id] : flattenCategories([node]).map((n) => n.id);
      return search({ categoryIds: ids });
    }
    case "newest":
      return search({}, "newest");
    case "onSale":
      return search({ onSale: true });
    case "tag": {
      const tag = value.tag?.trim() ?? "";
      const id = tag === "" ? null : await reads.tagId(tag);
      return id === null ? [] : search({ tagIds: [id] });
    }
    case "type": {
      const type = value.type?.trim() ?? "";
      const ids = type === "" ? [] : await reads.typeProductIds(type);
      return ids.length === 0 ? [] : search({ productIds: ids });
    }
    default:
      return [];
  }
}

/**
 * A `productSource`'s products as cards for the market, at most `max` (the block's own most), or
 * `null` for a source that asks for none (the hero's "No products"). With no product found, the
 * `newest` behaviour is applied here (the newest products instead); `hide` and `message` are the
 * block's to apply, from `empty`.
 */
export async function resolveProductSource(
  value: ProductSourceValue | null | undefined,
  reads: CatalogReads,
  hrefs: Pick<Hrefs, "product">,
  { max = 24, defaultLimit = 8 }: { max?: number; defaultLimit?: number } = {},
): Promise<ResolvedProducts | null> {
  if (value == null || value.mode == null || value.mode === "none") return null;
  const limit = limitOf(value.limit, max, defaultLimit);
  const empty = emptyOf(value.emptyBehavior);
  const found = cards(await readSource(value, reads, { limit, max }), hrefs);
  if (found.length > 0 || empty !== "newest" || value.mode === "newest")
    return { products: found, empty };
  const newest = await reads.products(await reads.search({ filters: {}, sort: "newest", limit }));
  return { products: cards(newest, hrefs), empty };
}
