import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { requestOrderTransferWorkflow } from "@medusajs/medusa/core-flows";

import type { StoreRequestOrderClaimType } from "../validators";

/**
 * `POST /store/customers/me/order-transfers` (T53, D64): a signed-in customer claims a guest order
 * by its number and its e-mail. The Store API's own transfer request takes the order's id, which a
 * guest's receipt does not show, and lets any customer start a transfer for any id; here the order
 * is found by its number and must have been placed with the e-mail typed (in any case), or the
 * answer is the same 404 as for a number that does not exist. Medusa then e-mails the order's
 * address a link to accept (the `order.transfer_requested` subscriber), so the order moves only
 * when that inbox says so. The market's prefix rides in the change's `internal_note` for the link.
 * Customers exist only once verified (T44), so only a verified customer gets here.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreRequestOrderClaimType>,
  res: MedusaResponse,
) {
  const { display_id, email, market } = req.validatedBody;
  const customerId = req.auth_context.actor_id;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "customer_id"],
    // `display_id` is an integer column; the generated filter type has it as a string.
    filters: { display_id } as unknown as { display_id: string },
  });
  const order = orders.find(
    (each) => typeof each?.email === "string" && each.email.toLowerCase() === email.toLowerCase(),
  );

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No order has this number and e-mail.");
  }

  if (order.customer_id === customerId) {
    throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "The order is already yours.");
  }

  await requestOrderTransferWorkflow(req.scope).run({
    input: {
      order_id: order.id,
      customer_id: customerId,
      logged_in_user: customerId,
      internal_note: JSON.stringify({ market: market ?? "" }),
    },
  });

  res.status(200).json({ order: { id: order.id, display_id: order.display_id } });
}
