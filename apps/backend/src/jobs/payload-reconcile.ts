import type { MedusaContainer } from "@medusajs/framework/types";

import { reconcile } from "../lib/payload-sync";

/**
 * D75's reconcile: every ten minutes the synced documents are compared with Medusa both ways (ids
 * and `updated_at`), which catches a change that emits no event and anything missed while Payload
 * was down. `payload-reconcile-on-start.ts` runs it once after a start. Never throws.
 */
export default async function payloadReconcile(container: MedusaContainer) {
  await reconcile(container, { kind: "reconcile" });
}

export const config = {
  name: "payload-reconcile",
  schedule: "*/10 * * * *",
};
