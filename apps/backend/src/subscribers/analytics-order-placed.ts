import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { sendOrderEvent } from "../lib/analytics";

/**
 * `order.placed` → PostHog's `order_placed` (M6 D124), only when the order carries the visitor's analytics
 * consent (`lib/analytics.ts`).
 */
export default async function analyticsOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await sendOrderEvent(container, "order_placed", data.id);
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
