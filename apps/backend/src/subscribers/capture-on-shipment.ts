import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";

import { STRIPE_PROVIDER_ID } from "../config/modules";

type PaymentRow = {
  id: string;
  provider_id: string;
  captured_at?: string | Date | null;
  canceled_at?: string | Date | null;
};

/** The order's Stripe payments that are authorised and not captured or canceled yet. */
export function uncapturedStripePayments(payments: readonly (PaymentRow | null)[]): PaymentRow[] {
  return payments.flatMap((payment) =>
    payment &&
    payment.provider_id === STRIPE_PROVIDER_ID &&
    !payment.captured_at &&
    !payment.canceled_at
      ? [payment]
      : [],
  );
}

/**
 * Capture when the order ships (M6 D118, SPEC §10.1): Stripe authorises at the order
 * (`capture: false`), and the first shipment (`shipment.created`, a fulfillment marked shipped)
 * captures the whole authorised amount, so a shop charges for what it sends. Medusa Admin's own
 * "Capture" stays for anything else (an order picked up, a partial capture). "Pay later"
 * (`pp_system_default`) is never captured here: nothing was paid. A failure is logged and the
 * shipment stands; an admin captures by hand. `jobs/uncaptured-payments.ts` names an order left
 * uncaptured for 6 days, before a card's authorisation lapses at about 7.
 */
export default async function captureOnShipment({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: fulfillments } = (await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "order.id",
      "order.payment_collections.payments.id",
      "order.payment_collections.payments.provider_id",
      "order.payment_collections.payments.captured_at",
      "order.payment_collections.payments.canceled_at",
    ],
    filters: { id: data.id },
  })) as {
    data: {
      id: string;
      order?: {
        id: string;
        payment_collections?: ({ payments?: (PaymentRow | null)[] | null } | null)[] | null;
      } | null;
    }[];
  };
  const order = fulfillments[0]?.order;
  if (!order) return;
  const payments = uncapturedStripePayments(
    (order.payment_collections ?? []).flatMap((collection) => collection?.payments ?? []),
  );
  for (const payment of payments) {
    try {
      await capturePaymentWorkflow(container).run({ input: { payment_id: payment.id } });
      logger.info(`Captured payment ${payment.id} of order ${order.id} on its shipment.`);
    } catch (error) {
      logger.error(
        `Capturing payment ${payment.id} of order ${order.id} on its shipment failed: ${
          error instanceof Error ? error.message : String(error)
        }. Capture it in Medusa Admin.`,
      );
    }
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
  context: { subscriberId: "capture-on-shipment" },
};
