import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../../../../../../config/modules";
import { listSavedMethods, stripeHolderOf } from "../../../../../../lib/saved-methods";

/**
 * `DELETE /store/customers/me/payment-methods/:id` (M6 D119, T101): detaches one of the caller's
 * saved methods from their Stripe customer. A method that is not among the caller's own (another
 * customer's, one that does not exist) answers 404, as SPEC §11.1 says for what is not yours.
 */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? "";
  const customerId = req.auth_context.actor_id;
  const mine = await listSavedMethods(req.scope, customerId);
  const holder = await stripeHolderOf(req.scope, customerId);
  if (holder === null || !mine.some((method) => method.id === id))
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Payment method with id: ${id} was not found`,
    );
  const payment = req.scope.resolve(Modules.PAYMENT);
  await payment.deletePaymentMethods({
    provider_id: STRIPE_PROVIDER_ID,
    id,
    context: { account_holder: holder as never },
  } as never);
  res.json({ id, object: "payment_method", deleted: true });
}
