import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import { PREVIEW_KEY, sanitizePreview } from "../../../../../lib/stripe-token";

/**
 * `GET /store/orders/:id/payment-preview` (M6 D117, T100): what the order was paid with, as the
 * receipt and the account's order page show it ("Visa ending in 4242"): the `payment_preview` the
 * cart kept, which Medusa copies to the order's metadata but its Store API leaves out of an order.
 * Only the preview, never the rest of the metadata (the ConfirmationToken). Anyone with the order's
 * id reads Medusa's own `GET /store/orders/:id`, which says more; the storefront asks only for an
 * order it may show (`getReceiptOrder`, `getOrder`).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: req.params.id },
  })) as { data: { id: string; metadata?: Record<string, unknown> | null }[] };
  const order = data[0];
  if (order === undefined)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id: ${req.params.id} was not found`,
    );
  res.json({ preview: sanitizePreview(order.metadata?.[PREVIEW_KEY]) });
}
