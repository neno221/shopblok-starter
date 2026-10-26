"use server";

import { catalogs } from "@shopblok/i18n";
import type { Cart } from "@shopblok/registry/contracts";
import type { CartDrawerClientProps } from "@shopblok/ui/organisms/cart-drawer-client";
import { cartDrawerParts } from "@shopblok/ui/organisms/cart-drawer";
import type { QuickCartDropdownClientProps } from "@shopblok/ui/organisms/quick-cart-dropdown-client";
import { quickCartParts } from "@shopblok/ui/organisms/quick-cart-dropdown";
import type { PromoCodeError } from "@shopblok/ui/molecules/promo-code-field";
import { cartView, emptyCart, marketCart, promoErrorOf } from "../cart-view";
import { getMarketContext, type MarketContext } from "../market-context";
import { SHELL_PREFETCH } from "../site";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  applyPromoAction,
  removeLineAction,
  removePromoAction,
  updateLineAction,
  type CartAnswer,
} from "./cart-handlers";
import {
  applyPromoFromCart,
  removeLineFromCart,
  removePromoFromCart,
  updateLineFromCart,
} from "./checkout";

// The header's cart islands (D65, T52): the drawer and the quick cart. Both organisms are server
// components on purpose (D49: no catalog and no formatter in a client chunk), and what they show is
// the visitor's, while the header is prerendered for everyone (ADR 0004). So the island asks these
// actions when the drawer opens, after a change in it and after an add, and each renders the
// organism's parts on the server, in the market's language, from the cookie's cart (never an id
// from the browser but a line of that cart). The drawer's forms post to the cart page's actions, so
// a form the island does not catch still works (it lands on the cart page); the island catches
// them and sends them to `changeCartInDrawer`, which answers the drawer again.

/** What the drawer draws, without its open state (the island's). */
export type DrawerParts = Omit<CartDrawerClientProps, "open" | "onOpenChange">;
/** What the quick cart draws, without its open state. */
export type QuickParts = Omit<QuickCartDropdownClientProps, "open" | "onOpenChange">;

export type DrawerAnswer = { parts: DrawerParts; count: number };

const MAX_KEY = 64;
const INTENTS = ["update", "remove", "apply-code", "remove-code"] as const;
type Intent = (typeof INTENTS)[number];

async function contextOf(market: unknown): Promise<MarketContext | null> {
  if (typeof market !== "string" || market.length > MAX_KEY) return null;
  return getMarketContext(market);
}

function drawerFor(
  context: MarketContext,
  cart: Cart,
  promo?: { code: string; error: PromoCodeError },
): DrawerAnswer {
  const { market } = context;
  const messages = catalogs[market.locale];
  const parts = cartDrawerParts({
    cart,
    promoCode: promo?.code ?? "",
    cartHref: context.url("/cart"),
    checkoutHref: context.url("/checkout"),
    continueHref: context.url("/store"),
    copy: {
      drawer: messages.organisms.cartDrawer,
      line: messages.molecules.cartLineItem,
      promo: messages.molecules.promoCodeField,
      freeShipping: messages.molecules.freeShippingProgress,
      rows: messages.molecules.orderSummaryRow,
    },
    locale: market.htmlLang,
    updateAction: updateLineFromCart.bind(null, market.key),
    removeAction: removeLineFromCart.bind(null, market.key),
    applyCodeAction: applyPromoFromCart.bind(null, market.key),
    removeCodeAction: removePromoFromCart.bind(null, market.key),
    ...(promo === undefined ? {} : { promoError: promo.error }),
    prefetch: SHELL_PREFETCH,
  });
  return { parts, count: cart.itemCount };
}

async function currentCart(context: MarketContext): Promise<Cart> {
  const cart = await marketCart(context);
  return cart === null ? emptyCart(context) : cartView(cart, context);
}

/** The drawer for the visitor's cart on `market`'s pages, or `null` for a key that names none. */
export async function renderCartDrawer(market: unknown): Promise<DrawerAnswer | null> {
  const context = await contextOf(market);
  if (context === null) return null;
  return drawerFor(context, await currentCart(context));
}

const HANDLERS: Record<Intent, (input: unknown) => Promise<ActionResult<CartAnswer>>> = {
  update: updateLineAction,
  remove: removeLineAction,
  "apply-code": applyPromoAction,
  "remove-code": removePromoAction,
};

/**
 * A change made in the drawer (`intent` says which of its forms sent `data`), then the drawer
 * again: the cart the action answered, or the current one with a refused code beside its field.
 */
export async function changeCartInDrawer(
  market: unknown,
  intent: unknown,
  data: unknown,
): Promise<DrawerAnswer | null> {
  const context = await contextOf(market);
  if (context === null || !(data instanceof FormData)) return null;
  if (typeof intent !== "string" || !(INTENTS as readonly string[]).includes(intent)) return null;
  const result = await HANDLERS[intent as Intent]({
    ...formDataToObject(data),
    market: context.market.key,
  });
  if (result.ok) return drawerFor(context, result.data.cart);
  const cart = await currentCart(context);
  const code = data.get("code");
  if (intent === "apply-code" && typeof code === "string")
    return drawerFor(context, cart, {
      code,
      error: promoErrorOf(result.form),
    });
  return drawerFor(context, cart);
}

/** The quick cart after an add: the cart's line `lineId` as it is now, or `null`. */
export async function renderQuickCart(
  market: unknown,
  lineId: unknown,
): Promise<QuickParts | null> {
  const context = await contextOf(market);
  if (context === null || typeof lineId !== "string") return null;
  const cart = await marketCart(context);
  if (cart === null) return null;
  const view = await cartView(cart, context);
  const added = view.lines.find((line) => line.id === lineId);
  if (added === undefined) return null;
  return quickCartParts({
    added,
    itemCount: view.itemCount,
    subtotal: view.subtotal,
    cartHref: context.url("/cart"),
    checkoutHref: context.url("/checkout"),
    copy: catalogs[context.market.locale].organisms.quickCartDropdown,
    locale: context.market.htmlLang,
    prefetch: SHELL_PREFETCH,
  });
}
