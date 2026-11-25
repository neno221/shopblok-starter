import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../../../../../config/modules";
import {
  ensureStripeHolder,
  listSavedMethods,
  SAVED_TYPES,
} from "../../../../../lib/saved-methods";
import { stripeRegistered } from "../../../../../lib/stripe-regions";

// M6 D119 (T101): the signed-in customer's saved payment methods. `/store/customers/me*` is
// authenticated by Medusa's own middleware (a customer's session or bearer token; anyone else gets
// a 401), and each route reads only the caller's own account holder, so another customer's method
// is never listed, and `DELETE` answers 404 for it (`[id]/route.ts`). Medusa's tutorial put its
// list under `/store/payment-methods/:account_holder_id` with a middleware matcher that named two
// parameters, so its authentication never ran; under `me` the caller is the only customer there is.

/** `GET /store/customers/me/payment-methods`: the caller's saved cards and Revolut Pay. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const methods = await listSavedMethods(req.scope, req.auth_context.actor_id);
  res.json({ payment_methods: methods });
}

/**
 * `POST /store/customers/me/payment-methods`: a SetupIntent for the account's "Add a payment
 * method" (the Payment Element in setup mode confirms it in the browser with its client secret).
 * The caller's Stripe customer is made first when they have none. The intent is for later payments
 * without the customer (`usage: off_session`) and only for the types the shop saves.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  if (!(await stripeRegistered(req.scope)))
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Stripe is not on.");
  const holder = await ensureStripeHolder(req.scope, req.auth_context.actor_id);
  const payment = req.scope.resolve(Modules.PAYMENT);
  const created = await payment.createPaymentMethods({
    provider_id: STRIPE_PROVIDER_ID,
    context: { account_holder: holder as never },
    data: { usage: "off_session", payment_method_types: [...SAVED_TYPES] },
  });
  const secret = (created.data as { client_secret?: unknown } | undefined)?.client_secret;
  if (typeof secret !== "string")
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Stripe made no SetupIntent");
  res.json({ setup_intent: { id: created.id, client_secret: secret } });
}
