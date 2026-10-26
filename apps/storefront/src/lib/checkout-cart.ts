import "server-only";
import type { Cart } from "@shopblok/registry/contracts";
import { cacheLife, cacheTag } from "next/cache";
import { cartView } from "./cart-view";
import { getMarketContext } from "./market-context";
import { getCart, type CartDto } from "./medusa/cart";

/**
 * The visitor's cart and its view model for the cart page and the checkout (D65): read once per
 * request (`"use cache: private"`: the cookie is read inside, and nothing is kept across requests),
 * tagged `cart` so an action's `updateTag("cart")` reaches it. `null` for a market that cannot hold
 * a cart; `cart: null` when the visitor has none.
 */
export async function readCheckoutCart(
  marketKey: string,
): Promise<{ cart: CartDto; view: Cart } | { cart: null; view: null } | null> {
  "use cache: private";
  cacheTag("cart");
  // Request-scoped only: the dynamic page's own client stale time (none) stays.
  cacheLife({ stale: Infinity });
  const context = await getMarketContext(marketKey);
  if (context === null) return null;
  const cart = await getCart(context.market.medusaLocale);
  if (cart === null) return { cart: null, view: null };
  return { cart, view: await cartView(cart, context) };
}
