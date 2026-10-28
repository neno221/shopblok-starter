import type { MedusaContainer } from "@medusajs/framework/types";

import { reconcile } from "../lib/payload-sync";

/**
 * The reconcile once, 30 s after the server (or worker) starts, so what changed while it was down
 * reaches Payload before the first ten-minute run. Not the module's `onApplicationStart`: Medusa
 * 2.21.2 does run that hook, but a module sees only its own container, so it cannot read the
 * catalog; a job runs where background work runs (`workerMode`), as the scheduled one does.
 */
export default async function payloadReconcileOnStart(container: MedusaContainer) {
  await reconcile(container, { kind: "reconcile" });
}

export const config = {
  name: "payload-reconcile-on-start",
  schedule: { interval: 30_000, numberOfExecutions: 1 },
};
