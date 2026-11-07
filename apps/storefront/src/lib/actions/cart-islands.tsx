"use server";

import type { Cart } from "@shopblok/registry/contracts";
import type { CartDrawerClientProps } from "@shopblok/ui/organisms/cart-drawer-client";
import { miniCartParts } from "@shopblok/ui/organisms/cart-drawer";
import type { QuickCartDropdownClientProps } from "@shopblok/ui/organisms/quick-cart-dropdown-client";
import { quickCartParts } from "@shopblok/ui/organisms/quick-cart-dropdown";
import type { PromoCodeError } from "@shopblok/ui/molecules/promo-code-field";
import { messagesFor } from "../../i18n/market-messages";
import { cartView, emptyCart, promoErrorOf } from "../cart-view";
import { cmsOrNull } from "../cms/read";
import { catalogReads } from "../cms/resolve/market";
import { resolvePicks } from "../cms/resolve/picks";
import { DRAWER_FORMS, MINI_CART_PICKS, type DrawerForm } from "../cms/template-options";
import { miniCartFrom, readCartTemplate } from "../cms/templates";
import { getMarketContext, type MarketContext } from "../market-context";
import { getCart } from "../medusa/cart";
import { SHELL_PREFETCH } from "../site";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  addToCartAction,
  applyPromoAction,
  removeLineAction,
  removePromoAction,
  updateLineAction,
  type CartAnswer,
} from "./cart-handlers";
import {
  addPickFromCart,
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
// T85 (D101): the `templates` global's `miniCart` decides the member, read here on the server for
// the market (`readCartTemplate`), never taken from the browser: the drawer, or the drawer with
// picks, whose products are resolved here for the market's region and language (the catalog's
// cached reads) and leave out what the cart holds. A pick's form is one more intent ("add").

/** What the drawer draws, without its open state (the island's). */
export type DrawerParts = Omit<CartDrawerClientProps, "open" | "onOpenChange">;
/** What the quick cart draws, without its open state. */
export type QuickParts = Omit<QuickCartDropdownClientProps, "open" | "onOpenChange">;

export type DrawerAnswer = { parts: DrawerParts; count: number };

const MAX_KEY = 64;
async function contextOf(market: unknown): Promise<MarketContext | null> {
  if (typeof market !== "string" || market.length > MAX_KEY) return null;
  return getMarketContext(market);
}

/**
 * The member a click on the header's cart opens, published, for the market (`null`: the cart page),
 * and the picks' source; M4's drawer when the global cannot be read.
 */
async function miniCartOf(context: MarketContext) {
  return miniCartFrom(
    await cmsOrNull(
      readCartTemplate({ market: context.market, draft: false }),
      "cart drawer: the first mini cart",
    ),
  );
}

async function drawerFor(
  context: MarketContext,
  cart: Cart,
  promo?: { code: string; error: PromoCodeError },
  choice?: Awaited<ReturnType<typeof miniCartOf>>,
): Promise<DrawerAnswer> {
  const { market } = context;
  const [messages, { member, picks: source }] = await Promise.all([
    messagesFor(market),
    choice ?? miniCartOf(context),
  ]);
  // "Cart page" while the drawer is open (the global changed since): the first member's drawer.
  const variant = member ?? "drawer";
  const picks =
    variant === MINI_CART_PICKS
      ? await resolvePicks(
          source,
          catalogReads(context),
          context.hrefs,
          new Set(cart.lines.map((line) => line.productId)),
        )
      : undefined;
  const parts = miniCartParts({
    variant,
    ...(picks === undefined ? {} : { picks }),
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
      price: messages.molecules.priceBlock,
    },
    locale: market.htmlLang,
    updateAction: updateLineFromCart.bind(null, market.key),
    removeAction: removeLineFromCart.bind(null, market.key),
    applyCodeAction: applyPromoFromCart.bind(null, market.key),
    removeCodeAction: removePromoFromCart.bind(null, market.key),
    addAction: addPickFromCart.bind(null, market.key),
    ...(promo === undefined ? {} : { promoError: promo.error }),
    prefetch: SHELL_PREFETCH,
  });
  return { parts, count: cart.itemCount };
}

async function currentCart(context: MarketContext): Promise<Cart> {
  const cart = await getCart(context.market.medusaLocale);
  return cart === null ? emptyCart(context) : cartView(cart, context);
}

/**
 * The drawer for the visitor's cart on `market`'s pages, as the `templates` global's `miniCart`
 * draws it, or `null` for a key that names no market or a global that says "Cart page" (the island
 * opens the cart page then).
 */
export async function renderCartDrawer(market: unknown): Promise<DrawerAnswer | null> {
  const context = await contextOf(market);
  if (context === null) return null;
  const [choice, cart] = await Promise.all([miniCartOf(context), currentCart(context)]);
  if (choice.member === null) return null;
  return drawerFor(context, cart, undefined, choice);
}

/** The change each of the drawer's forms asks for (`DRAWER_FORMS`, what the island sends). */
const HANDLERS: Record<DrawerForm, (input: unknown) => Promise<ActionResult<CartAnswer>>> = {
  "cart-line-item-update": updateLineAction,
  "cart-line-item-update-fallback": updateLineAction,
  "cart-line-item-remove": removeLineAction,
  "promo-code-apply": applyPromoAction,
  "promo-code-remove": removePromoAction,
  "cart-pick-add": addToCartAction,
};

/**
 * A change made in the drawer (`intent`, the `data-slot` of the form that sent `data`), then the drawer
 * again: the cart the action answered, or the current one with a refused code beside its field.
 */
export async function changeCartInDrawer(
  market: unknown,
  intent: unknown,
  data: unknown,
): Promise<DrawerAnswer | null> {
  const context = await contextOf(market);
  if (context === null || !(data instanceof FormData)) return null;
  if (!(DRAWER_FORMS as readonly unknown[]).includes(intent)) return null;
  const result = await HANDLERS[intent as DrawerForm]({
    ...formDataToObject(data),
    market: context.market.key,
  });
  if (result.ok) return drawerFor(context, result.data.cart);
  const cart = await currentCart(context);
  const code = data.get("code");
  if (intent === "promo-code-apply" && typeof code === "string")
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
  const cart = await getCart(context.market.medusaLocale);
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
    copy: (await messagesFor(context.market)).organisms.quickCartDropdown,
    locale: context.market.htmlLang,
    prefetch: SHELL_PREFETCH,
  });
}
