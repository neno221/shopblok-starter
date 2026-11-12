import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { sendCartCreated } from "../lib/analytics";

/**
 * `cart.created` → PostHog's `cart_created` (M6 D124), only when the cart carries the visitor's analytics
 * consent (`lib/analytics.ts`).
 */
export default async function analyticsCartCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await sendCartCreated(container, data.id);
}

export const config: SubscriberConfig = {
  event: "cart.created",
};
