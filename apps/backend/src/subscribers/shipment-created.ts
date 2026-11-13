import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { amountOf, orderSummary, readOrder, sendOrderEmail } from "../lib/order-email";

type FulfillmentRow = {
  id: string;
  labels?: ({ tracking_number?: string | null; tracking_url?: string | null } | null)[] | null;
  items?: ({ line_item_id?: string | null; quantity?: unknown } | null)[] | null;
  order?: { id: string } | null;
};

/**
 * A shipment (D122, SPEC §6.2): `shipment.created` (a fulfillment marked shipped in Medusa Admin)
 * sends `order-shipped` to the order's address, with the lines in the parcel and each label's
 * tracking number, linked to the carrier's page when the label has an http(s) one. Nothing when
 * the admin unticked "send notification" (`no_notification`). Once per fulfillment.
 */
export default async function shipmentCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  if (data.no_notification) return;
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: fulfillments } = (await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "labels.tracking_number",
      "labels.tracking_url",
      "items.line_item_id",
      "items.quantity",
      "order.id",
    ],
    filters: { id: data.id },
  })) as { data: FulfillmentRow[] };
  const fulfillment = fulfillments[0];
  const order = fulfillment?.order ? await readOrder(container, fulfillment.order.id) : null;
  if (!fulfillment || order === null) {
    logger.warn(`shipment.created: no order for fulfillment ${data.id}, so nothing was sent.`);
    return;
  }

  const only = new Map<string, number>();
  for (const item of fulfillment.items ?? []) {
    if (!item?.line_item_id) continue;
    only.set(item.line_item_id, (only.get(item.line_item_id) ?? 0) + amountOf(item.quantity));
  }
  const tracking = (fulfillment.labels ?? []).flatMap((label) =>
    label?.tracking_number
      ? [
          {
            number: label.tracking_number,
            ...(label.tracking_url ? { url: label.tracking_url } : {}),
          },
        ]
      : [],
  );

  await sendOrderEmail(container, {
    order,
    type: "order-shipped",
    template: "order-shipped",
    summary: await orderSummary(container, order, {
      ...(only.size > 0 ? { only } : {}),
      totals: "none",
      tracking,
    }),
    idempotencyKey: `order-shipped-${fulfillment.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};
