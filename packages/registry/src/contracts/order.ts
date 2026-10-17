import { z } from "zod";
import { Address } from "./address";
import { LineOption } from "./cart";
import { checkCurrency } from "./checks";
import { Href, Id, IsoDateTime } from "./content";
import { Image } from "./image";
import { CurrencyCode, Money } from "./money";
import { PaymentBrand } from "./payment";

/** A line of a placed order. */
export const OrderLine = z.object({
  id: Id,
  title: z.string().min(1),
  href: Href.optional(),
  image: Image.optional(),
  options: z.array(LineOption),
  quantity: z.int().positive(),
  unitPrice: Money,
  total: Money,
});

/** One step of an order's history (OrderTimeline). */
export const OrderEvent = z.object({
  kind: z.enum([
    "placed",
    "paid",
    "fulfilled",
    "shipped",
    "delivered",
    "canceled",
    "return-requested",
    "returned",
  ]),
  at: IsoDateTime,
  carrier: z.string().min(1).optional(),
  trackingNumber: z.string().min(1).optional(),
  trackingUrl: Href.optional(),
});

/** A placed order (OrderTable, the order page, the confirmation), in one currency. */
export const Order = z
  .object({
    id: Id,
    displayId: z.int().positive().describe("The number the customer sees"),
    email: z.email(),
    placedAt: IsoDateTime,
    status: z.enum(["pending", "completed", "canceled", "requires-action"]),
    currencyCode: CurrencyCode,
    lines: z.array(OrderLine).min(1),
    subtotal: Money,
    discountTotal: Money,
    shippingTotal: Money,
    taxTotal: Money,
    total: Money,
    shippingAddress: Address,
    billingAddress: Address.optional(),
    shippingMethod: z.object({ name: z.string().min(1), price: Money }),
    payment: z
      .object({
        name: z
          .string()
          .min(1)
          .optional()
          .describe("The method's name, as PaymentMethod's; what a manual payment shows"),
        brand: PaymentBrand.optional(),
        last4: z
          .string()
          .regex(/^\d{4}$/)
          .optional(),
      })
      .refine((payment) => payment.name !== undefined || payment.brand !== undefined, {
        message: "a payment needs a name or a brand",
      })
      .describe("A card's brand, or the name of a method with none (`pp_system_default`)"),
    events: z.array(OrderEvent).min(1).describe("Oldest first; the first is `placed`"),
  })
  .superRefine((order, context) => {
    checkCurrency(context, order.currencyCode, [
      [["subtotal"], order.subtotal],
      [["discountTotal"], order.discountTotal],
      [["shippingTotal"], order.shippingTotal],
      [["taxTotal"], order.taxTotal],
      [["total"], order.total],
      [["shippingMethod", "price"], order.shippingMethod.price],
      ...order.lines.flatMap((line, index): [(string | number)[], Money | undefined][] => [
        [["lines", index, "unitPrice"], line.unitPrice],
        [["lines", index, "total"], line.total],
      ]),
    ]);
    if (order.events[0]?.kind !== "placed")
      context.addIssue({
        code: "custom",
        path: ["events", 0],
        message: "the first event is not `placed`",
      });
    const times = order.events.map((event) => Date.parse(event.at));
    if (times.some((time, index) => index > 0 && time < times[index - 1]!))
      context.addIssue({
        code: "custom",
        path: ["events"],
        message: "the events are not oldest first",
      });
  });

export type OrderLine = z.infer<typeof OrderLine>;
export type OrderEvent = z.infer<typeof OrderEvent>;
export type Order = z.infer<typeof Order>;
