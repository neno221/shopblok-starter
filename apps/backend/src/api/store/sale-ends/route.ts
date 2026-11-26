import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

/** At most this many price lists per call: the storefront asks for one product page's. */
export const SALE_ENDS_MAX_IDS = 100;

const PRICE_LIST_ID = /^plist_[0-9A-Za-z]+$/;

/** The `id` query parameter (`?id=plist_1&id=plist_2` or `?id[]=…`) as a list of price list ids. */
export function saleIdsOf(value: unknown): string[] {
  const list = (Array.isArray(value) ? value : value === undefined ? [] : [value]).filter(
    (id): id is string => typeof id === "string",
  );
  if (list.length > SALE_ENDS_MAX_IDS || list.some((id) => !PRICE_LIST_ID.test(id)))
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `id must be up to ${SALE_ENDS_MAX_IDS} price list ids (plist_…)`,
    );
  return [...new Set(list)];
}

/**
 * `GET /store/sale-ends?id=plist_…` (M7 D147, T110): when each active sale among the price lists
 * named ends, `{ sale_ends: { [id]: ends_at } }`, for the product page's `priceValidUntil` (Google's
 * Product structured data). A variant's `calculated_price` already names the price list its price
 * comes from (`calculated_price.price_list_id`), but Medusa's Store API says nothing of the list's
 * dates. Only an active `sale` with an `ends_at` is answered: a list without an end, a draft, an
 * override list (a customer group's prices) or an unknown id is left out, so nothing is read here
 * that a visitor's own `calculated_price` does not already point at, and the date is the one the
 * sale's own banner would show.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ids = saleIdsOf(req.query.id);
  if (ids.length === 0) {
    res.json({ sale_ends: {} });
    return;
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "price_list",
    fields: ["id", "ends_at", "status", "type"],
    filters: { id: ids, status: "active", type: "sale" },
  })) as {
    data: { id: string; ends_at?: string | Date | null; status?: string; type?: string }[];
  };
  const ends: Record<string, string> = {};
  for (const list of data) {
    if (list.status !== "active" || list.type !== "sale" || list.ends_at == null) continue;
    const date = new Date(list.ends_at);
    if (!Number.isNaN(date.getTime())) ends[list.id] = date.toISOString();
  }
  res.json({ sale_ends: ends });
}
