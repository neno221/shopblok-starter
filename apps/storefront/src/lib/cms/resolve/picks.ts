import { MAX_CART_PICKS, type CartPick } from "@shopblok/registry/contracts";
import type { ProductDto } from "../../medusa/products";
import type { Hrefs } from "../../view-models/common";
import { toImages, toPriceSummary } from "../../view-models/product";
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

/**
 * A product as a pick, or `null` when none of its variants can be bought in the region. Its price
 * is the one of the variants it offers (PR 121 review, item 2: a sold-out variant's lower price is
 * not the pick's), and its picture the product's first, or none (the row's empty box).
 */
export function toPick(product: ProductDto, hrefs: Pick<Hrefs, "product">): CartPick | null {
  const available = product.variants.filter(
    (variant) => variant.available && variant.price !== null,
  );
  const price = toPriceSummary(available);
  if (price === null) return null;
  const [image] = toImages(product);
  return {
    id: product.id,
    title: product.title,
    href: hrefs.product(product.handle),
    ...(image === undefined ? {} : { image }),
    price,
    choices: available.map((variant) => ({
      variantId: variant.id,
      label: variant.title || product.title,
    })),
  };
}

/**
 * The picks for a cart that holds `held` (product ids), at most four, in the source's order. A
 * source an editor never saved is the newest four; one that asks for nothing (no mode) too. None
 * when the catalog cannot be read.
 */
export async function resolvePicks(
  value: ProductSourceValue | null | undefined,
  reads: CatalogReads,
  hrefs: Pick<Hrefs, "product">,
  held: ReadonlySet<string>,
): Promise<CartPick[]> {
  const source = value?.mode == null ? DEFAULT_PICKS : value;
  let found: Awaited<ReturnType<typeof sourceProducts>>;
  try {
    found = await sourceProducts(source, reads, {
      max: MAX_CART_PICKS,
      defaultLimit: MAX_CART_PICKS,
      extra: held.size,
    });
  } catch (error) {
    // PR 121 review, item 1: the picks are an extra. A failed read (a search timeout, Medusa
    // restarting) is no picks, never a failed drawer: the cart's change has gone through by then.
    console.error("cart drawer: the picks could not be read", error);
    return [];
  }
  const { products, limit } = found;
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
