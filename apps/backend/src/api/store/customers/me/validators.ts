import { z } from "@medusajs/framework/zod";

/**
 * A signed-in customer's claim of a guest order (T53, D64, SPEC §8.4): the number on the receipt
 * and the e-mail the order was placed with, and the market's public prefix for the e-mail's link
 * (`storefrontLink` accepts only a prefix's shape) and its language for the copy (T70).
 */
export const StoreRequestOrderClaim = z.object({
  display_id: z.coerce.number().int().positive(),
  email: z.string().trim().min(1).max(320),
  market: z.string().max(16).optional(),
  /** The market's language, for the e-mail's copy (T70; `email-copy.ts` accepts only its shape). */
  language: z.string().max(16).optional(),
});

/** A return from the customer's own order (T53): the lines, one reason, an optional note. */
export const StoreCreateCustomerReturn = z.object({
  order_id: z.string().min(1).max(128),
  items: z
    .array(z.object({ id: z.string().min(1).max(128), quantity: z.number().int().min(1) }))
    .min(1)
    .max(100),
  reason_id: z.string().min(1).max(128),
  note: z.string().max(500).optional(),
});

export type StoreRequestOrderClaimType = z.infer<typeof StoreRequestOrderClaim>;
export type StoreCreateCustomerReturnType = z.infer<typeof StoreCreateCustomerReturn>;
