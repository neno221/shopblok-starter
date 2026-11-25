import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { MedusaError } from "@medusajs/framework/utils";

import { refusesSystemSession, sessionsToProcess } from "../../api/store/payment-sessions/guard";
import { stripeRegistered } from "../../lib/stripe-regions";

/** Medusa's number fields come as a number or a BigNumber-like `{ numeric }`. */
const amountOf = (value: unknown): number => {
  const n =
    typeof value === "object" && value !== null && "numeric" in value
      ? Number((value as { numeric: unknown }).numeric)
      : Number(value);
  return Number.isFinite(n) ? n : 0;
};

// M6 D117 (T100, PR 140's review, item 1): the session route's guard refuses "Pay later" on a
// positive total when the session is made; this refuses it again when the cart is completed. A
// session can outlive that check: one made at a zero total in a race with a change that raises the
// total (the session route takes no cart lock), or one left from before the shop had Stripe's keys.
// The system provider authorises anything, so without this the cart would become an unpaid order.
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const row = cart as unknown as {
    total?: unknown;
    payment_collection?: {
      payment_sessions?: ({ provider_id?: string; status?: string } | null)[] | null;
    } | null;
  };
  const total = amountOf(row.total);
  if (total <= 0) return;
  const providers = sessionsToProcess(row.payment_collection?.payment_sessions ?? []);
  if (providers.length === 0) return;
  const stripe = await stripeRegistered(container);
  if (providers.some((providerId) => refusesSystemSession(providerId, total, stripe)))
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Pay later is offered only for a zero total while Stripe takes payments.",
    );
});
