import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { orderSummary, readOrder, sendOrderEmail } from "../lib/order-email";

/**
 * The order's confirmation (D122, SPEC §6.2): `order.placed` sends `order-placed` to the order's
 * address, in the order's language, with its lines, its sums and where it ships, and a link to the
 * order in its market. Once per order (the idempotency key).
 */
export default async function orderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const order = await readOrder(container, data.id);
  if (order === null) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`order.placed: no order ${data.id}, so nothing was sent.`);
    return;
  }
  const summary = await orderSummary(container, order);
  await sendOrderEmail(container, {
    order,
    type: "order-placed",
    template: "order-placed",
    summary,
    values: { total: summary.totals.find((row) => row.kind === "total")?.amount ?? "" },
    idempotencyKey: `order-placed-${order.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
