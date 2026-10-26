import "server-only";
import type { Cart, CartLine } from "@shopblok/registry/contracts";
import { updateTag } from "next/cache";
import { z } from "zod";
import { cartView } from "../cart-view";
import { getMarketContext, type MarketContext } from "../market-context";
import {
  addLine,
  applyPromoCode,
  getCart,
  removeLine,
  removePromoCode,
  updateLine,
} from "../medusa/cart";
import { action, ActionError } from "./action";

// The cart's actions (D60, D61): each answers the new count for `setCartCount` and the view model
// the drawer or the quick cart draws, never Medusa's cart. `updateTag("cart")` expires the
// per-visitor reads T52 tags `cart`, so the next render reads the change (SPEC §8.3).

const marketKey = z.string().min(1).max(64);
const id = z.string().min(1).max(128);
/** One line holds at most this many: a typing slip (1000) is refused here, not by Medusa. */
export const MAX_LINE_QUANTITY = 99;

export type CartAnswer = { count: number; cart: Cart };
export type AddToCartAnswer = { count: number; line: CartLine; cart: Cart };

async function contextFor(key: string): Promise<MarketContext> {
  const context = await getMarketContext(key);
  if (context === null) throw new ActionError("not-found", `no open market ${key}`);
  return context;
}

/** The visitor's cart, refused unless `lineId` is one of its lines (SPEC §11.1: ownership by id). */
async function requireLine(lineId: string, locale: string): Promise<void> {
  const cart = await getCart(locale);
  if (cart === null || !cart.lines.some((line) => line.id === lineId))
    throw new ActionError("not-found", `line ${lineId} is not in the visitor's cart`);
}

export const addToCartAction = action(
  z.object({
    market: marketKey,
    variantId: id,
    quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY).default(1),
  }),
  async ({ market, variantId, quantity }): Promise<AddToCartAnswer> => {
    const context = await contextFor(market);
    const cart = await addLine(
      { regionId: context.region.id, locale: context.market.medusaLocale },
      variantId,
      quantity,
    );
    updateTag("cart");
    const view = await cartView(cart, context);
    const line = view.lines.find((candidate) => candidate.variantId === variantId);
    if (line === undefined)
      throw new ActionError("rejected", `Medusa added no line for ${variantId}`);
    return { count: view.itemCount, line, cart: view };
  },
);

export const updateLineAction = action(
  z.object({
    market: marketKey,
    lineId: id,
    quantity: z.coerce.number().int().min(0).max(MAX_LINE_QUANTITY),
  }),
  async ({ market, lineId, quantity }): Promise<CartAnswer> => {
    const context = await contextFor(market);
    await requireLine(lineId, context.market.medusaLocale);
    const cart = await updateLine(lineId, quantity, context.market.medusaLocale);
    updateTag("cart");
    const view = await cartView(cart, context);
    return { count: view.itemCount, cart: view };
  },
);

export const removeLineAction = action(
  z.object({ market: marketKey, lineId: id }),
  async ({ market, lineId }): Promise<CartAnswer> => {
    const context = await contextFor(market);
    await requireLine(lineId, context.market.medusaLocale);
    const cart = await removeLine(lineId, context.market.medusaLocale);
    updateTag("cart");
    const view = await cartView(cart, context);
    return { count: view.itemCount, cart: view };
  },
);

/** A promotion code as a shopper types it: no spaces around it, case kept (Medusa compares exactly). */
const promoCode = z.string().trim().min(1).max(64);

export const applyPromoAction = action(
  z.object({ market: marketKey, code: promoCode }),
  async ({ market, code }): Promise<CartAnswer> => {
    const context = await contextFor(market);
    const cart = await applyPromoCode(code, context.market.medusaLocale);
    // An unknown code is Medusa's 400 ("The promotion code … is invalid", checked on the stack),
    // which `action()` answers as `rejected`. A code that exists but that the cart does not qualify
    // for can come back applied to nothing, so the answer is checked too.
    if (!cart.promoCodes.some((promo) => promo.code.toUpperCase() === code.toUpperCase()))
      throw new ActionError("rejected", `code ${code} was not applied`);
    updateTag("cart");
    const view = await cartView(cart, context);
    return { count: view.itemCount, cart: view };
  },
);

export const removePromoAction = action(
  z.object({ market: marketKey, code: promoCode }),
  async ({ market, code }): Promise<CartAnswer> => {
    const context = await contextFor(market);
    const cart = await removePromoCode(code, context.market.medusaLocale);
    updateTag("cart");
    const view = await cartView(cart, context);
    return { count: view.itemCount, cart: view };
  },
);
