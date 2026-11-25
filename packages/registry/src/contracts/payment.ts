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
 * not listed, a card number above all, fails the parse instead of reaching a component. `kind` is
 * left out for a card (M3's shape), and is "card" when given.
 */
export const SavedCard = z.strictObject({
  kind: z.literal("card").optional(),
  id: Id,
  brand: PaymentBrand,
  last4: z.string().regex(/^\d{4}$/, "the last four digits"),
  expiryMonth: z.int().min(1).max(12),
  expiryYear: z.int().min(2000).max(2100),
  isDefault: z.boolean(),
  holderName: z.string().min(1).optional(),
});

/**
 * M6 D119 (T101): a Revolut Pay account a customer saved. Stripe keeps nothing of it the shop could
 * show (no digits, no expiry), so it is drawn by its name and mark alone. Strict, as a card is.
 */
export const SavedRevolutPay = z.strictObject({
  kind: z.literal("revolut_pay"),
  id: Id,
  isDefault: z.boolean(),
});

/** A saved payment method: a card, or (M6) a Revolut Pay account. */
export const SavedPaymentMethod = z.union([SavedCard, SavedRevolutPay]);

export type PaymentBrand = z.infer<typeof PaymentBrand>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type SavedCard = z.infer<typeof SavedCard>;
export type SavedRevolutPay = z.infer<typeof SavedRevolutPay>;
export type SavedPaymentMethod = z.infer<typeof SavedPaymentMethod>;
