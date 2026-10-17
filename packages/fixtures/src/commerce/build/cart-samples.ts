import type { Cart, CartLine, FreeShipping } from "@shopblok/registry/contracts";
import { round2, type Context } from "../context";
import type { CommerceFixture } from "../types";
import { buildMarketing } from "./marketing";

// The sample data of CartLineItem, FreeShippingProgress and PromoCodeField (T34) that the cart
// itself does not hold: the stock states a line can be in, a line without a picture or options, the
// free-shipping bar from nothing to reached, and the promotion field in each of its states. None of
// it is words of a locale (a code, an amount and a stock state are the same in all four), so it
// needs no copy; the lines are the cart's own, changed in the one thing each sample is about.

/** The cart's line `index`: the cart always has its three. */
function lineOf(cart: Cart, index: number): CartLine {
  const line = cart.lines[index];
  if (line === undefined) throw new Error(`The cart has no line ${index}`);
  return line;
}

/** A line's total is its unit price times its quantity, to the cent. */
function withQuantity(ctx: Context, line: CartLine, quantity: number): CartLine {
  return { ...line, quantity, total: ctx.money(round2(line.unitPrice.amount * quantity)) };
}

export function buildCartSamples(ctx: Context, cart: Cart): CommerceFixture["cartSamples"] {
  const { freeShipping } = cart;
  if (freeShipping === undefined) throw new Error("The cart has no free-shipping progress");
  const { threshold } = freeShipping;
  const [promo] = cart.promoCodes;
  if (promo === undefined) throw new Error("The cart has no promotion code");
  const longCode = buildMarketing(ctx).longDiscountCode.code;

  // The sale hoodie, sold out since it was added: no limit to give, and it cannot be bought.
  const { maxQuantity: _limit, ...sale } = lineOf(cart, 1);
  const outOfStock: CartLine = { ...sale, id: "line_out", stock: { status: "out" } };

  // The low-stock tee with all three it has in the cart: the most the stock allows.
  const atLimit: CartLine = {
    ...withQuantity(ctx, lineOf(cart, 2), 3),
    id: "line_limit",
  };

  const { image: _image, ...socks } = lineOf(cart, 0);
  const noImage: CartLine = { ...socks, id: "line_no_image" };

  const { compareAtUnitPrice: _was, ...tee } = lineOf(cart, 2);
  const noOptions: CartLine = {
    ...tee,
    id: "line_no_options",
    options: [],
    maxQuantity: 10,
    stock: { status: "in-stock" },
  };

  const left = (amount: number): FreeShipping => ({ threshold, remaining: ctx.money(amount) });
  // Seven digits before the cents: the longest amount the message has to carry.
  const large: FreeShipping = {
    threshold: ctx.money(1234567.89),
    remaining: ctx.money(987654.32),
  };

  const welcome = { code: promo.code, ...(promo.discount && { discount: promo.discount }) };
  return {
    lines: { outOfStock, atLimit, noImage, noOptions },
    freeShipping: {
      empty: left(threshold.amount),
      almost: left(0.5),
      reached: left(0),
      large,
    },
    promo: {
      empty: { applied: [], code: "" },
      applied: { applied: [welcome], code: "" },
      // A code that was refused, kept in the field for the shopper to correct.
      typed: { applied: [], code: "SUMMER25" },
      // The second takes nothing off the goods (free shipping), so it has no amount.
      two: { applied: [welcome, { code: "FREESHIP" }], code: "" },
      long: {
        applied: [{ code: longCode, discount: ctx.money(round2(threshold.amount / 10)) }],
        code: longCode,
      },
    },
  };
}
