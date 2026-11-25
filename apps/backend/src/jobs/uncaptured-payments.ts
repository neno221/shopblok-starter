import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../config/modules";

/** Six days (M6 D118): a card's authorisation lapses after about seven. */
export const UNCAPTURED_AFTER_MS = 6 * 24 * 60 * 60 * 1000;

type PaymentRow = {
  id: string;
  provider_id: string;
  created_at: string | Date;
  captured_at?: string | Date | null;
  canceled_at?: string | Date | null;
  payment_collection?: { order?: { id: string; display_id?: number | null } | null } | null;
};

/** The Stripe payments authorised more than six days before `now` and neither captured nor canceled. */
export function staleUncaptured(payments: readonly PaymentRow[], now: Date): PaymentRow[] {
  return payments.filter(
    (payment) =>
      payment.provider_id === STRIPE_PROVIDER_ID &&
      !payment.captured_at &&
      !payment.canceled_at &&
      now.getTime() - new Date(payment.created_at).getTime() >= UNCAPTURED_AFTER_MS,
  );
}

/**
 * Once a day (M6 D118): a warning for each order whose Stripe payment has waited six days or more
 * for its capture (the shipment that captures it, or Medusa Admin's "Capture"), so it is shipped or
 * captured before the card's authorisation lapses.
 */
export default async function uncapturedPayments(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "payment",
    fields: [
      "id",
      "provider_id",
      "created_at",
      "captured_at",
      "canceled_at",
      "payment_collection.order.id",
      "payment_collection.order.display_id",
    ],
    filters: { provider_id: STRIPE_PROVIDER_ID, captured_at: null, canceled_at: null },
  })) as { data: PaymentRow[] };
  for (const payment of staleUncaptured(data, new Date())) {
    const order = payment.payment_collection?.order;
    logger.warn(
      `Order ${order?.display_id ?? order?.id ?? "(unknown)"}: its Stripe payment ${payment.id} has waited 6 days for its capture. Ship it or capture it in Medusa Admin before the authorisation lapses (about 7 days).`,
    );
  }
}

export const config = {
  name: "uncaptured-payments",
  schedule: "17 6 * * *",
};
