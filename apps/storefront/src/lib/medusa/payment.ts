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
