import "server-only";
import type { Cart } from "@shopblok/registry/contracts";
import type { MarketContext } from "./market-context";
import type { CartDto } from "./medusa/cart";
import { listProductsByIds } from "./medusa/products";
import { toCart } from "./view-models/cart";

/**
 * A cart's view model for its market (`/next/cart` and the cart actions): the lines' products read
 * once, cached, in the market's region and language (their ids sorted, so the same set shares an
 * entry), then `toCart`.
 */
export async function cartView(cart: CartDto, context: MarketContext): Promise<Cart> {
  const ids = [...new Set(cart.lines.map((line) => line.productId))].sort();
  const products =
    ids.length === 0
      ? []
      : await listProductsByIds(ids, {
          regionId: context.region.id,
          locale: context.market.medusaLocale,
        });
  return toCart(cart, products, context.hrefs);
}
