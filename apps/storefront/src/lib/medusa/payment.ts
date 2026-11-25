import "server-only";
import { cached } from "../cache";
import { medusaRequest } from "./sdk";

/** The system provider (SPEC §8.4): no key, zero totals, "Pay later" in PaymentStep (D65). */
export const SYSTEM_PAYMENT_PROVIDER = "pp_system_default";

async function fetchPaymentProviders(regionId: string): Promise<string[]> {
  const { payment_providers: providers } = await medusaRequest((sdk) =>
    sdk.store.payment.listPaymentProviders({ region_id: regionId }),
  );
  return providers.map((provider) => provider.id).sort();
}

/**
 * The ids of the payment providers a region offers. The same for every visitor, so cached; tagged
 * with the regions, which is where an owner enables a provider.
 */
export const listPaymentProviders = cached(fetchPaymentProviders, {
  name: "medusa:payment-providers",
  tags: ["medusa:regions"],
  life: "minutes",
});

/** Stripe's card-and-wallet provider (M6 D117): Medusa's `payment-stripe` with the id `stripe`. */
export const STRIPE_PAYMENT_PROVIDER = "pp_stripe_stripe";

/**
 * The publishable key the Payment Element loads with (`NEXT_PUBLIC_STRIPE_KEY`, inlined at build),
 * or `null` without one: then the checkout offers the system payment only.
 */
export function stripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_KEY?.trim();
  return key ? key : null;
}

/**
 * Whether the checkout takes the payment with Stripe (D117): the region offers it, the storefront
 * has its publishable key, and there is something to pay (Stripe cannot take a zero amount, so a
 * 100% promotion completes with the system payment). Otherwise "Pay later".
 */
export function paysWithStripe(providers: readonly string[], total: number): boolean {
  return (
    providers.includes(STRIPE_PAYMENT_PROVIDER) && stripePublishableKey() !== null && total > 0
  );
}
