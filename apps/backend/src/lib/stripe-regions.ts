import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

import { STRIPE_PROVIDER_ID } from "../config/modules";

/** The system payment ("Pay later", D117): on every region, whether Stripe is on or not. */
export const SYSTEM_PROVIDER_ID = "pp_system_default";

type RegionRow = { id: string; name: string; providers: string[] };

/** What one region's providers should be: the system payment always, Stripe while it is registered. */
export function wantedProviders(current: readonly string[], stripe: boolean): string[] {
  const kept = current.filter((id) => id !== STRIPE_PROVIDER_ID && id !== SYSTEM_PROVIDER_ID);
  return [...kept, SYSTEM_PROVIDER_ID, ...(stripe ? [STRIPE_PROVIDER_ID] : [])].sort();
}

/** The regions whose providers differ from what they should be, each with its new list. */
export function regionChanges(
  regions: readonly RegionRow[],
  stripe: boolean,
): { id: string; name: string; providers: string[] }[] {
  return regions.flatMap((region) => {
    const wanted = wantedProviders(region.providers, stripe);
    const now = [...region.providers].sort();
    return wanted.length === now.length && wanted.every((id, i) => id === now[i])
      ? []
      : [{ id: region.id, name: region.name, providers: wanted }];
  });
}

/**
 * Whether Stripe's provider is registered in this process (D117). Medusa writes every provider it
 * has ever loaded into `payment_provider` and marks the ones it did not load this time disabled, so
 * a provider row alone is no proof: `is_enabled` is.
 */
export async function stripeRegistered(container: MedusaContainer): Promise<boolean> {
  const payment = container.resolve(Modules.PAYMENT);
  const [providers] = await payment.listAndCountPaymentProviders({ id: [STRIPE_PROVIDER_ID] });
  return providers.some((provider) => provider.id === STRIPE_PROVIDER_ID && provider.is_enabled);
}

/**
 * `sync-stripe-regions` (D117), two-way and idempotent: Stripe on every region while it is
 * registered, off every region when it is not (Medusa would still list a disabled provider in
 * `GET /store/payment-providers`, so a shop whose keys were removed would offer a Stripe that cannot
 * take a payment), and the system payment on every region always. Run by `pnpm bootstrap` and once
 * at the backend's start (`jobs/stripe-regions-on-start.ts`).
 */
export async function syncStripeRegions(
  container: MedusaContainer,
): Promise<{ stripe: boolean; changed: string[] }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const stripe = await stripeRegistered(container);
  const { data } = (await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })) as { data: { id: string; name: string; payment_providers?: ({ id: string } | null)[] }[] };
  const regions = data.map((region) => ({
    id: region.id,
    name: region.name,
    providers: (region.payment_providers ?? []).flatMap((p) => (p ? [p.id] : [])),
  }));
  const changes = regionChanges(regions, stripe);
  for (const change of changes) {
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: change.id }, update: { payment_providers: change.providers } },
    });
  }
  if (changes.length > 0)
    logger.info(
      `Updated payment providers (${stripe ? "Stripe on" : "Stripe off"}): ${changes
        .map((change) => change.name)
        .join(", ")} (the system payment stays on every region).`,
    );
  return { stripe, changed: changes.map((change) => change.name) };
}
