import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { sendOrderEvent } from "../lib/analytics";

/**
 * `order.canceled` → PostHog's `order_canceled` (M6 D124), only when the order carries the visitor's analytics
 * consent (`lib/analytics.ts`).
 */
export default async function analyticsOrderCanceled({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await sendOrderEvent(container, "order_canceled", data.id);
}

export const config: SubscriberConfig = {
  event: "order.canceled",
};
