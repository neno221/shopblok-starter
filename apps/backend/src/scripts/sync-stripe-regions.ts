import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { syncStripeRegions } from "../lib/stripe-regions";

/**
 * `medusa exec ./src/scripts/sync-stripe-regions.ts` (M6 D117, T100): Stripe on every region while
 * its keys are set, off every region when they are not; "Pay later" stays on every region.
 * Idempotent. `pnpm bootstrap` runs it in its seeds step, and the backend runs the same once at its
 * start (`jobs/stripe-regions-on-start.ts`), so a key added or removed takes effect on a restart.
 */
export default async function syncStripeRegionsScript({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const { stripe, changed } = await syncStripeRegions(container);
  if (changed.length === 0)
    logger.info(
      `Payment providers unchanged: ${stripe ? "Stripe and the system payment" : "the system payment"} on every region.`,
    );
}
