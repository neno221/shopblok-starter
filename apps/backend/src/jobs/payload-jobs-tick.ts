import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { createPayloadJobsTick } from "../lib/payload-jobs";

/** One tick for the process's life, so its failure log keeps its ten-minute memory. */
const tick = createPayloadJobsTick();

/**
 * Every minute (M7 D148, 1; T111): Payload's scheduled publishing, called from Medusa's worker
 * (`lib/payload-jobs.ts`). A scheduled job runs where Medusa's background work runs
 * (`workerMode`: the `medusa-worker` service on staging, D132; `shared` in development and CI), never
 * on the `server` service. Off without `CRON_SECRET` or `PAYLOAD_SERVER_URL`; bootstrap leaves the
 * backend's `CRON_SECRET` blank in development, where `next dev`'s timer calls the endpoint, so the
 * two never both run.
 */
export default async function payloadJobsTick(container: MedusaContainer) {
  await tick(process.env, container.resolve(ContainerRegistrationKeys.LOGGER));
}

export const config = {
  name: "payload-jobs-tick",
  schedule: "* * * * *",
};
