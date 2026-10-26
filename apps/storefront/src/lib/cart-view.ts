import "server-only";
import type { Cart } from "@shopblok/registry/contracts";
import type { PromoCodeError } from "@shopblok/ui/molecules/promo-code-field";
import type { MarketContext } from "./market-context";
import { getMarketCart, type CartDto } from "./medusa/cart";
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

/** The visitor's cart in this market's region and language (`getMarketCart`), or `null`. */
export const marketCart = (context: MarketContext): Promise<CartDto | null> =>
  getMarketCart({ regionId: context.region.id, locale: context.market.medusaLocale });

/** An empty cart in the market's currency: what the cart page and the drawer draw without one. */
export function emptyCart(context: MarketContext): Cart {
  const currencyCode = context.region.currencyCode.toUpperCase();
  const zero = { amount: 0, currencyCode };
  return {
    id: "none",
    currencyCode,
    lines: [],
    itemCount: 0,
    subtotal: zero,
    discountTotal: zero,
    total: zero,
    promoCodes: [],
  };
}

/** A refused code's words beside its field: Medusa unreachable, or a code it does not take. */
export function promoErrorOf(form: string | undefined): PromoCodeError {
  return form === "unavailable" ? "failed" : "invalid";
}
