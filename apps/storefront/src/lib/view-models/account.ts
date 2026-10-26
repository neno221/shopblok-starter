import type { Messages } from "@shopblok/i18n";
import type {
  AccountNav,
  AccountOrderScreen,
  AddressBook,
  AddressFormState,
  OrderEvent,
  OrderListItem,
  OrderTable,
  ReturnRequest,
} from "@shopblok/registry/contracts";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto, ReturnReasonDto } from "../medusa/orders";
import { returnableOf } from "../medusa/orders";
import { toContractAddress, toOrderConfirmation } from "./checkout";
import { toMoney, toProductImage, type Hrefs } from "./common";

// The account's view models (T53, D64), from the data layer's DTOs. Pure: the market's URLs and
// words come in as arguments (`url` is the market's: a path inside it as its public URL).

type Url = (path: string) => string;

/** The account's pages, in AccountNav's order; wishlist waits for M8. */
const PAGES = [
  ["overview", "overview", "/account"],
  ["orders", "orders", "/account/orders"],
  ["addresses", "addresses", "/account/addresses"],
  ["payment-methods", "paymentMethods", "/account/payment-methods"],
  ["returns", "returns", "/account/returns"],
  ["profile", "profile", "/account/profile"],
] as const;

export type AccountSection = (typeof PAGES)[number][0];

export function toAccountNav(
  words: Messages["templates"]["account"]["nav"],
  url: Url,
  current: AccountSection,
): AccountNav {
  return {
    items: PAGES.map(([id, key, path]) => ({ id, label: words[key], href: url(path) })),
    current,
  };
}

/**
 * Where an order is, as the customer reads it: canceled; something back or asked back; all of it
 * delivered; something shipped or packed; else placed. Medusa's order has no event history in the
 * Store API, so the latest state is all there is.
 */
export function latestKind(order: OrderDto): OrderEvent["kind"] {
  if (order.status === "canceled") return "canceled";
  const total = (pick: (line: OrderDto["lines"][number]) => number) =>
    order.lines.reduce((sum, line) => sum + pick(line), 0);
  const quantity = total((line) => line.quantity);
  if (total((line) => line.returnReceived) > 0) return "returned";
  if (total((line) => line.returnRequested) > 0) return "return-requested";
  if (quantity > 0 && total((line) => line.delivered) >= quantity) return "delivered";
  if (total((line) => line.shipped) > 0) return "shipped";
  if (total((line) => line.fulfilled) > 0) return "fulfilled";
  return "placed";
}

/** The order's history: placed, and where it is now (at its last change) when that is later. */
export function orderEvents(order: OrderDto): OrderEvent[] {
  const kind = latestKind(order);
  const placed: OrderEvent = { kind: "placed", at: order.createdAt };
  if (kind === "placed") return [placed];
  const at = Date.parse(order.updatedAt) >= Date.parse(order.createdAt) ? order.updatedAt : order.createdAt;
  return [placed, { kind, at }];
}

/** One row of the orders: its number, date, state, size and total, and `href` (its page). */
export function toOrderListItem(order: OrderDto, href: string): OrderListItem {
  return {
    id: order.id,
    displayId: Math.max(1, order.displayId),
    placedAt: order.createdAt,
    status: latestKind(order),
    itemCount: Math.max(
      1,
      order.lines.reduce((sum, line) => sum + line.quantity, 0),
    ),
    total: toMoney(order.total),
    href,
  };
}

/** The orders as OrderTable lists them, each linked by `hrefOf`. */
export function toOrderTable(
  orders: OrderDto[],
  hrefOf: (order: OrderDto) => string,
  shopHref: string,
): OrderTable {
  return {
    orders: orders
      .filter((order) => order.lines.length > 0)
      .map((order) => toOrderListItem(order, hrefOf(order))),
    shopHref,
  };
}

/** Anything of the order that can still go back. */
export const canReturn = (order: OrderDto) =>
  order.status !== "canceled" && order.lines.some((line) => returnableOf(line) > 0);

/** One order's page: the receipt's parts with its real history, and the return when there is one. */
export function toAccountOrder(
  order: OrderDto,
  hrefs: Pick<Hrefs, "product">,
  systemName: string,
  backHref: string,
  returnHref: string,
): AccountOrderScreen | null {
  const receipt = toOrderConfirmation(order, hrefs, systemName, backHref);
  if (receipt === null) return null;
  return {
    kind: "order",
    order: { ...receipt.order, events: orderEvents(order) },
    summary: receipt.summary,
    backHref,
    ...(canReturn(order) ? { returnHref } : {}),
  };
}

/** The return form for an order, its lines with what may go back; `null` when nothing may. */
export function toReturnRequest(
  order: OrderDto,
  reasons: ReturnReasonDto[],
  typed?: { reason?: string; note?: string; quantities?: Record<string, number> },
): ReturnRequest | null {
  if (!canReturn(order) || reasons.length === 0) return null;
  return {
    orderId: order.id,
    displayId: Math.max(1, order.displayId),
    items: order.lines.map((line) => {
      const returnable = Math.min(returnableOf(line), Math.max(1, line.quantity));
      const chosen = typed?.quantities?.[line.id] ?? 0;
      return {
        id: line.id,
        title: line.title || line.productHandle || line.id,
        ...(line.thumbnail ? { image: toProductImage(line.thumbnail, line.title) } : {}),
        options: [],
        quantity: Math.max(1, line.quantity),
        returnable,
        quantityChosen: Math.min(Math.max(0, chosen), returnable),
      };
    }),
    reasons,
    ...(typed?.reason !== undefined && reasons.some((each) => each.id === typed.reason)
      ? { reason: typed.reason }
      : {}),
    note: (typed?.note ?? "").slice(0, 500),
  };
}

/** The address book: each address with its edit page, the defaults kept to one each. */
export function toAddressBook(customer: CustomerDto, url: Url): AddressBook {
  let shipping = false;
  let billing = false;
  return {
    entries: customer.addresses.map((address) => {
      const isDefaultShipping = address.isDefaultShipping && !shipping;
      const isDefaultBilling = address.isDefaultBilling && !billing;
      shipping ||= isDefaultShipping;
      billing ||= isDefaultBilling;
      return {
        address: {
          ...toContractAddress(address),
          id: address.id,
          ...(isDefaultShipping ? { isDefaultShipping } : {}),
          ...(isDefaultBilling ? { isDefaultBilling } : {}),
        },
        editHref: url(`/account/addresses/${encodeURIComponent(address.id)}`),
      };
    }),
    addHref: url("/account/addresses/new"),
  };
}

/**
 * The address form: what a failed submit typed, else the saved address, else the market's country
 * with nothing typed; the countries are the region's (the market's first).
 */
export function toAccountAddressForm(
  countries: string[],
  saved: CustomerAddressDto | null,
  typed: Record<string, string> | undefined,
): AddressFormState {
  const fallback = countries[0] ?? "";
  if (typed !== undefined && Object.keys(typed).length > 0) {
    const values: AddressFormState["values"] = {
      countryCode: countries.includes(typed.countryCode ?? "") ? typed.countryCode! : fallback,
    };
    for (const field of [
      "firstName",
      "lastName",
      "company",
      "address1",
      "address2",
      "city",
      "province",
      "postalCode",
      "phone",
    ] as const) {
      const value = typed[field]?.trim();
      if (value) values[field] = value;
    }
    return { countries, values };
  }
  if (saved !== null) {
    const values = toContractAddress(saved);
    // A saved address in a country the region no longer has is offered in the market's country.
    return countries.includes(values.countryCode)
      ? { countries, values }
      : { countries, values: { ...values, countryCode: fallback } };
  }
  return { countries, values: { countryCode: fallback } };
}
