import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { orderSummary, readOrder, sendOrderEmail } from "../lib/order-email";

/**
 * The order canceled (D122, SPEC §6.2): `order.canceled` sends `order-canceled` to the order's
 * address, with what the order held and its sums. Once per order.
 */
export default async function orderCanceled({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const order = await readOrder(container, data.id);
  if (order === null) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`order.canceled: no order ${data.id}, so nothing was sent.`);
    return;
  }
  await sendOrderEmail(container, {
    order,
    type: "order-canceled",
    template: "order-canceled",
    summary: await orderSummary(container, order, { shipTo: false }),
    idempotencyKey: `order-canceled-${order.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "order.canceled",
};
