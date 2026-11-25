import type { MedusaContainer } from "@medusajs/framework/types";

import { syncStripeRegions } from "../lib/stripe-regions";

/**
 * `sync-stripe-regions` once at the backend's start (M6 D117): the keys this process started with
 * decide whether Stripe is on every region, so adding or removing them takes effect on a restart
 * without `pnpm bootstrap`. Ten seconds after the start, where background work runs (`workerMode`),
 * as `payload-reconcile-on-start` does.
 */
export default async function stripeRegionsOnStart(container: MedusaContainer) {
  await syncStripeRegions(container);
}

export const config = {
  name: "stripe-regions-on-start",
  schedule: { interval: 10_000, numberOfExecutions: 1 },
};
