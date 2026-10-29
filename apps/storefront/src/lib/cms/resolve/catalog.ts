import type { Image } from "@shopblok/registry/contracts";
import type { CategoryNode } from "../../medusa/categories";
import type { CollectionDto } from "../../medusa/collections";
import type { ProductDto } from "../../medusa/products";
import type { SearchFilters, SearchSort } from "../../medusa/search";
import { PLACEHOLDER_IMAGE, toProductImage } from "../../view-models/common";
import { toImages } from "../../view-models/product";

// What the commerce blocks read from Medusa (T64, SPEC §7.5's resolution rule), for one market:
// each read already knows the market's region and language (`catalogReads` in `./market.ts`), so a
// resolver cannot forget them and a test passes a fake. Each real read is one of the data layer's
// `cached()` reads, tagged as the catalog's (`medusa:products`, `search`, `medusa:categories`), so
// the catalog's revalidation (T49's subscriber, the price-list job) refreshes the blocks with it.

export type CatalogReads = {
  /** The ids of the first `limit` products that match, in `sort`'s order. */
  search: (input: {
    filters: SearchFilters;
    sort: Exclude<SearchSort, "relevance">;
    limit: number;
  }) => Promise<string[]>;
  /** Products by id, in the order asked, without those the market does not sell. */
  products: (ids: readonly string[]) => Promise<ProductDto[]>;
  /** The category tree in the market's language. */
  categories: () => Promise<CategoryNode[]>;
  /** The collections in the market's language. */
  collections: () => Promise<CollectionDto[]>;
  /** The `metadata` values of `keys`, as text, by product id (only those keys, only scalars). */
  metadata: (
    ids: readonly string[],
    keys: readonly string[],
  ) => Promise<Record<string, Record<string, string>>>;
  /** A tag's id by its value, or `null`. */
  tagId: (value: string) => Promise<string | null>;
  /** The ids of a product type's products by the type's value (none when no type has it). */
  typeProductIds: (value: string) => Promise<string[]>;
};

/** How many of a category's newest products are looked at for a picture (M3's home, T51). */
export const PICTURE_CANDIDATES = 4;

/** A product's first usable picture: its images, then its thumbnail; never the placeholder. */
function usablePicture(product: ProductDto): Image | undefined {
  const thumbnail = product.thumbnail === null ? [] : [toProductImage(product.thumbnail, "")];
  return [...toImages(product), ...thumbnail].find((image) => image.src !== PLACEHOLDER_IMAGE.src);
}

/**
 * A category's picture: the first usable one among its newest products (its children's included),
 * so a product without a picture does not leave the tile empty. Decoration: the tile's name says
 * where it goes, so the `alt` is empty. M3's home (T51) and the category showcase share it.
 */
export async function categoryPicture(
  reads: Pick<CatalogReads, "search" | "products">,
  categoryIds: string[],
): Promise<Image | undefined> {
  const ids = await reads.search({
    filters: { categoryIds },
    sort: "newest",
    limit: PICTURE_CANDIDATES,
  });
  if (ids.length === 0) return undefined;
  for (const product of await reads.products(ids)) {
    const picture = usablePicture(product);
    if (picture !== undefined) return { ...picture, alt: "" };
  }
  return undefined;
}
