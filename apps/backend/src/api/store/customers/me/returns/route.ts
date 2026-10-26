import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { createAndCompleteReturnOrderWorkflow } from "@medusajs/medusa/core-flows";

import { RETURN_OPTION_TYPE_CODE } from "../../../../../scripts/lib/markets";
import type { StoreCreateCustomerReturnType } from "../validators";

type OptionRow = {
  id: string;
  type?: { code?: string | null } | null;
  rules?: ({ attribute?: string | null; value?: unknown } | null)[] | null;
  service_zone?: { geo_zones?: ({ country_code?: string | null } | null)[] | null } | null;
};

/**
 * `POST /store/customers/me/returns` (T53, D64): a return from the signed-in customer's own order.
 * Medusa's `POST /store/returns` answers anyone with an order's id (its docs' "secure return
 * creation" guide), and needs the return shipping option's id, which the Store API lists only for
 * a cart; so the account's form posts here instead (and `POST /store/returns` is closed, see
 * `middlewares.ts`). The order must be the customer's (another's is a 404, SPEC §11.1); the return
 * ships back with the free "Return" option of the zone the order ships to (the seed's, T53), and
 * every line carries the one reason and the note the form has.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateCustomerReturnType>,
  res: MedusaResponse,
) {
  const { order_id, items, reason_id, note } = req.validatedBody;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "shipping_address.country_code"],
    filters: { id: order_id },
  });
  const order = orders[0];

  if (!order || order.customer_id !== req.auth_context.actor_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id: ${order_id} was not found`);
  }

  const country = order.shipping_address?.country_code?.toLowerCase();
  const { data: options } = (await query.graph({
    entity: "shipping_option",
    fields: ["id", "type.code", "rules.attribute", "rules.value", "service_zone.geo_zones.country_code"],
  })) as { data: OptionRow[] };
  const option = options.find(
    (each) =>
      each.type?.code === RETURN_OPTION_TYPE_CODE &&
      (each.rules ?? []).some(
        (rule) => rule?.attribute === "is_return" && String(rule.value) === "true",
      ) &&
      (each.service_zone?.geo_zones ?? []).some(
        (zone) => zone?.country_code?.toLowerCase() === country,
      ),
  );

  if (!option) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "There is no return option for the country this order ships to.",
    );
  }

  const { result } = await createAndCompleteReturnOrderWorkflow(req.scope).run({
    input: {
      order_id,
      items: items.map((item) => ({ ...item, reason_id, ...(note ? { note } : {}) })),
      return_shipping: { option_id: option.id, price: 0 },
      ...(note ? { note } : {}),
    },
  });

  res.status(200).json({ return: { id: result.id } });
}
