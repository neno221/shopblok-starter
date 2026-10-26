import "server-only";
import type { Cart } from "@shopblok/registry/contracts";
import type { MarketContext } from "./market-context";
import type { CartDto } from "./medusa/cart";
import { readProductsByIds } from "./medusa/products";
import { toCart } from "./view-models/cart";

/**
 * A cart's view model for its market (`/next/cart` and the cart actions): the lines' products read
 * once in the market's region and language, then `toCart`. Not cached: the lines' stock and
 * `maxQuantity` must be the current ones, and a product's revalidation by handle would not reach
 * a cached set of ids (PR 73 review).
 */
export async function cartView(cart: CartDto, context: MarketContext): Promise<Cart> {
  const ids = [...new Set(cart.lines.map((line) => line.productId))];
  const products =
    ids.length === 0
      ? []
      : await readProductsByIds(ids, {
          regionId: context.region.id,
          locale: context.market.medusaLocale,
        });
  return toCart(cart, products, context.hrefs);
}
