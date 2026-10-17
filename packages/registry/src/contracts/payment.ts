import { z } from "zod";
import { Id } from "./content";

/** The marks PaymentIcon draws (`@shopblok/ui/atoms/payment-icon`). */
export const PaymentBrand = z.enum([
  "visa",
  "mastercard",
  "americanexpress",
  "applepay",
  "googlepay",
  "revolut",
  "paypal",
  "klarna",
]);

/** A way to pay at checkout (PaymentMethodCard): the provider's method and the marks it shows. */
export const PaymentMethod = z.object({
  id: Id.describe("Medusa's payment provider id (pp_stripe_stripe)"),
  kind: z.enum(["card", "wallet", "redirect", "manual"]),
  name: z
    .string()
    .min(1)
    .describe("The name the customer reads: a brand's own (PayPal), or the store's word (Card)"),
  brands: z.array(PaymentBrand),
});

/**
 * A card a customer saved (SavedPaymentMethodCard, PaymentMethodsManager). Strict: a key that is
 * not listed, a card number above all, fails the parse instead of reaching a component.
 */
export const SavedPaymentMethod = z.strictObject({
  id: Id,
  brand: PaymentBrand,
  last4: z.string().regex(/^\d{4}$/, "the last four digits"),
  expiryMonth: z.int().min(1).max(12),
  expiryYear: z.int().min(2000).max(2100),
  isDefault: z.boolean(),
  holderName: z.string().min(1).optional(),
});

export type PaymentBrand = z.infer<typeof PaymentBrand>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type SavedPaymentMethod = z.infer<typeof SavedPaymentMethod>;
