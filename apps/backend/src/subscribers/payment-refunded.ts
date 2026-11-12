import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { amountOf, orderSummary, readOrder, sendOrderEmail } from "../lib/order-email";

type PaymentRow = {
  id: string;
  refunds?: ({ id: string; amount?: unknown; created_at?: string | Date | null } | null)[] | null;
  payment_collection?: { order?: { id: string } | null } | null;
};

/**
 * A refund (D122, SPEC §6.2): `payment.refunded` (a refund made in Medusa Admin, or the refund of a
 * received return) sends `refund-issued` to the order's address with the amount of the newest
 * refund on the payment. Once per refund.
 */
export default async function paymentRefunded({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: payments } = (await query.graph({
    entity: "payment",
    fields: [
      "id",
      "refunds.id",
      "refunds.amount",
      "refunds.created_at",
      "payment_collection.order.id",
    ],
    filters: { id: data.id },
  })) as { data: PaymentRow[] };
  const payment = payments[0];
  const refund = (payment?.refunds ?? [])
    .flatMap((each) => (each === null ? [] : [each]))
    .sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )[0];
  const orderId = payment?.payment_collection?.order?.id;
  const order = orderId ? await readOrder(container, orderId) : null;
  if (refund === undefined || order === null) {
    logger.warn(
      `payment.refunded: no refund or order for payment ${data.id}, so nothing was sent.`,
    );
    return;
  }
  const summary = await orderSummary(container, order, {
    totals: { refunded: amountOf(refund.amount) },
    shipTo: false,
  });
  await sendOrderEmail(container, {
    order,
    type: "refund-issued",
    template: "refund-issued",
    summary,
    values: { amount: summary.totals[0]?.amount ?? "" },
    idempotencyKey: `refund-issued-${refund.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
};
