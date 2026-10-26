import "server-only";
import type { Money } from "./products";
import { getAuthHeaders } from "./cookies";
import { localeHeaders, medusaRequest } from "./sdk";

/** A way to ship a cart (DeliveryStep, T52), with its price for this cart. */
export type ShippingOptionDto = {
  id: string;
  name: string;
  price: Money | null;
  /** A pickup point rather than a delivery (SPEC §8.4). */
  pickup: boolean;
};

type WireShippingOption = {
  id: string;
  name?: string | null;
  amount?: number | null;
  calculated_price?: { calculated_amount?: number | null; currency_code?: string | null } | null;
  price_type?: string | null;
  service_zone?: { fulfillment_set?: { type?: string | null } | null } | null;
};

export function toShippingOption(
  option: WireShippingOption,
  currencyCode: string,
): ShippingOptionDto {
  const amount = option.calculated_price?.calculated_amount ?? option.amount;
  return {
    id: option.id,
    name: option.name ?? option.id,
    price: typeof amount === "number" ? { amount, currencyCode } : null,
    pickup: option.service_zone?.fulfillment_set?.type === "pickup",
  };
}

/** The shipping options for a cart, in its region. Per cart, so never cached across requests. */
export async function listShippingOptions(
  cartId: string,
  currencyCode: string,
  locale?: string,
): Promise<ShippingOptionDto[]> {
  const headers = { ...(locale ? localeHeaders(locale) : {}), ...(await getAuthHeaders()) };
  const { shipping_options: options } = await medusaRequest((sdk) =>
    sdk.store.fulfillment.listCartOptions({ cart_id: cartId }, headers),
  );
  return (options as unknown as WireShippingOption[]).map((option) =>
    toShippingOption(option, currencyCode),
  );
}
