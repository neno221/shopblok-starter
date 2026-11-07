import { MAX_CART_PICKS, type CartPick } from "@shopblok/registry/contracts";
import type { ProductDto } from "../../medusa/products";
import type { Hrefs } from "../../view-models/common";
import { toProductCard } from "../../view-models/product";
import type { CatalogReads } from "./catalog";
import { sourceProducts, type ProductSourceValue } from "./products";

// The `drawer-picks` mini cart's products (T85, D101): the `templates` global's `picks`, a
// `productSource`, resolved for the market like a block's (its region's prices, its language's
// names, the catalog's cached reads and tags, `catalogReads`), each with the variants it can go
// into the cart as. A product the cart holds is left out, and the source is read that many
// products further so up to four are still shown. A product with no price in the region, or none
// of whose variants can be bought, is no pick.

/** The picks' source when the global has none saved: the newest four (D101). */
export const DEFAULT_PICKS: ProductSourceValue = { mode: "newest", limit: MAX_CART_PICKS };

/** A product as a pick, or `null` when it has no price in the region or nothing to sell. */
export function toPick(product: ProductDto, hrefs: Pick<Hrefs, "product">): CartPick | null {
  const card = toProductCard(product, hrefs);
  if (card === null) return null;
  const choices = product.variants
    .filter((variant) => variant.available && variant.price !== null)
    .map((variant) => ({ variantId: variant.id, label: variant.title || product.title }));
  if (choices.length === 0) return null;
  const [image] = card.images;
  return {
    id: card.id,
    title: card.title,
    href: card.href,
    ...(image === undefined ? {} : { image }),
    price: card.price,
    choices,
  };
}

/**
 * The picks for a cart that holds `held` (product ids), at most four, in the source's order. A
 * source an editor never saved is the newest four; one that asks for nothing (no mode) too.
 */
export async function resolvePicks(
  value: ProductSourceValue | null | undefined,
  reads: CatalogReads,
  hrefs: Pick<Hrefs, "product">,
  held: ReadonlySet<string>,
): Promise<CartPick[]> {
  const source = value?.mode == null ? DEFAULT_PICKS : value;
  const { products, limit } = await sourceProducts(source, reads, {
    max: MAX_CART_PICKS,
    defaultLimit: MAX_CART_PICKS,
    extra: held.size,
  });
  const picks: CartPick[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    if (held.has(product.id) || seen.has(product.id)) continue;
    seen.add(product.id);
    const pick = toPick(product, hrefs);
    if (pick !== null) picks.push(pick);
    if (picks.length === limit) break;
  }
  return picks;
}
