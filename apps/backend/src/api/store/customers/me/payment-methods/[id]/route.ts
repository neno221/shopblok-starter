import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { savedMethodsOf, stripeHolderOf } from "../../../../../../lib/saved-methods";
import { detachPaymentMethodWorkflow } from "../../../../../../workflows/saved-payment-methods";

/**
 * `DELETE /store/customers/me/payment-methods/:id` (M6 D119, T101): detaches one of the caller's
 * saved methods from their Stripe customer. A method that is not among the caller's own (another
 * customer's, one that does not exist) answers 404, as SPEC §11.1 says for what is not yours.
 */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? "";
  const customerId = req.auth_context.actor_id;
  const holder = await stripeHolderOf(req.scope, customerId);
  const mine = await savedMethodsOf(req.scope, holder);
  if (holder === null || !mine.some((method) => method.id === id))
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Payment method with id: ${id} was not found`,
    );
  await detachPaymentMethodWorkflow(req.scope).run({ input: { id, holder } });
  res.json({ id, object: "payment_method", deleted: true });
}
