import { z } from "zod";
import { checkCurrency } from "./checks";
import { Href, Id } from "./content";
import { Image } from "./image";
import { CurrencyCode, Money } from "./money";
import { Stock } from "./product";

/** A chosen option of a line (`Colour: Oat`): the option's title and the value's label. */
export const LineOption = z.object({ option: z.string().min(1), value: z.string().min(1) });

/** One line of a cart (CartLineItem). */
export const CartLine = z.object({
  id: Id,
  productId: Id,
  variantId: Id,
  title: z.string().min(1),
  href: Href,
  image: Image.optional(),
  options: z.array(LineOption),
  quantity: z.int().positive(),
  maxQuantity: z.int().positive().optional().describe("The most the stock allows"),
  unitPrice: Money,
  compareAtUnitPrice: Money.optional(),
  total: Money,
  stock: Stock,
});

/** A promotion code applied to the cart, and what it takes off. */
export const PromoCode = z.object({ code: z.string().min(1), discount: Money.optional() });

/** A cart (CartDrawer, the cart page, OrderSummary): its lines and totals, in one currency. */
export const Cart = z
  .object({
    id: Id,
    currencyCode: CurrencyCode,
    lines: z.array(CartLine),
    itemCount: z.int().nonnegative().describe("The sum of the lines' quantities"),
    subtotal: Money,
    discountTotal: Money,
    shippingTotal: Money.optional().describe("Unknown until a shipping option is chosen"),
    taxTotal: Money.optional(),
    total: Money,
    promoCodes: z.array(PromoCode),
    freeShipping: z
      .object({ threshold: Money, remaining: Money })
      .optional()
      .describe("FreeShippingProgress: the threshold, and what is left to reach it"),
  })
  .superRefine((cart, context) => {
    checkCurrency(context, cart.currencyCode, [
      [["subtotal"], cart.subtotal],
      [["discountTotal"], cart.discountTotal],
      [["shippingTotal"], cart.shippingTotal],
      [["taxTotal"], cart.taxTotal],
      [["total"], cart.total],
      [["freeShipping", "threshold"], cart.freeShipping?.threshold],
      [["freeShipping", "remaining"], cart.freeShipping?.remaining],
      ...cart.lines.flatMap((line, index): [(string | number)[], Money | undefined][] => [
        [["lines", index, "unitPrice"], line.unitPrice],
        [["lines", index, "compareAtUnitPrice"], line.compareAtUnitPrice],
        [["lines", index, "total"], line.total],
      ]),
      ...cart.promoCodes.map((promo, index): [(string | number)[], Money | undefined] => [
        ["promoCodes", index, "discount"],
        promo.discount,
      ]),
    ]);
    const quantities = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
    if (quantities !== cart.itemCount)
      context.addIssue({
        code: "custom",
        path: ["itemCount"],
        message: `the lines hold ${quantities} items, not ${cart.itemCount}`,
      });
  });

export type LineOption = z.infer<typeof LineOption>;
export type CartLine = z.infer<typeof CartLine>;
export type PromoCode = z.infer<typeof PromoCode>;
export type Cart = z.infer<typeof Cart>;
