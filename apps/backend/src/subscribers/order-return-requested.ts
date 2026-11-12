import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { amountOf, orderSummary, readOrder, sendOrderEmail } from "../lib/order-email";

type ReturnRow = {
  id: string;
  items?: ({ item_id?: string | null; quantity?: unknown } | null)[] | null;
};

/**
 * A return requested (D122, SPEC §6.2): `order.return_requested` (a return the customer asked for
 * in the account, T53, or one made in Medusa Admin) sends `return-requested` to the order's address,
 * with the lines going back. Once per return.
 */
export default async function orderReturnRequested({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; return_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const [order, { data: returns }] = await Promise.all([
    readOrder(container, data.order_id),
    query.graph({
      entity: "return",
      fields: ["id", "items.item_id", "items.quantity"],
      filters: { id: data.return_id },
    }) as Promise<{ data: ReturnRow[] }>,
  ]);
  const found = returns[0];
  if (order === null || found === undefined) {
    logger.warn(
      `order.return_requested: no order ${data.order_id} or return ${data.return_id}, so nothing was sent.`,
    );
    return;
  }
  const only = new Map<string, number>();
  for (const item of found.items ?? []) {
    if (!item?.item_id) continue;
    only.set(item.item_id, (only.get(item.item_id) ?? 0) + amountOf(item.quantity));
  }
  await sendOrderEmail(container, {
    order,
    type: "return-requested",
    template: "return-requested",
    summary: await orderSummary(container, order, { only, totals: "none", shipTo: false }),
    idempotencyKey: `return-requested-${found.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "order.return_requested",
};
