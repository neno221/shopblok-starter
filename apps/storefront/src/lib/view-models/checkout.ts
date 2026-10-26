import type {
  Address,
  AddressFormState,
  Cart,
  CheckoutPage,
  CheckoutSteps,
  Order,
  OrderConfirmationPage,
  OrderSummary,
  PaymentStep,
  ShippingOption,
  SummaryItem,
  SummaryLine,
} from "@shopblok/registry/contracts";
import { CHECKOUT_STEP_IDS } from "@shopblok/registry/contracts";
import type { CartAddressDto, CartDto } from "../medusa/cart";
import type { ShippingOptionDto } from "../medusa/fulfillment";
import type { OrderDto } from "../medusa/orders";
import { SYSTEM_PAYMENT_PROVIDER } from "../medusa/payment";
import { toCurrencyCode, toMoney, toProductImage, type Hrefs } from "./common";

// The cart page's, the checkout's and the receipt's view models (T52, D65), from the data layer's
// DTOs and the cart's view model (`cartView`, which reads the lines' products once). Pure: the
// market's URLs and words come in as arguments.

export type CheckoutStepId = (typeof CHECKOUT_STEP_IDS)[number];

/** How far a cart has come: the steps whose data Medusa holds. */
export function stepsDone(cart: CartDto): Record<CheckoutStepId, boolean> {
  const contact = cart.email !== null && cart.shippingAddress !== null;
  const delivery = contact && cart.shippingMethod !== null && cart.paymentProviderId !== null;
  return { contact, delivery, review: false };
}

/** The first step the cart has not done: where `/checkout` sends a shopper. */
export function firstOpenStep(cart: CartDto): CheckoutStepId {
  const done = stepsDone(cart);
  return !done.contact ? "contact" : !done.delivery ? "delivery" : "review";
}

/** Whether the shopper may be on `step`: every step before it done. */
export function canOpen(cart: CartDto, step: CheckoutStepId): boolean {
  const done = stepsDone(cart);
  return CHECKOUT_STEP_IDS.slice(0, CHECKOUT_STEP_IDS.indexOf(step)).every((each) => done[each]);
}

/** A cart address as the contract's (empty fields left out). */
export function toContractAddress(address: CartAddressDto): Address {
  const optional = <K extends string>(key: K, value: string | null) =>
    value === null ? {} : ({ [key]: value } as Record<K, string>);
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    ...optional("company", address.company),
    address1: address.address1,
    ...optional("address2", address.address2),
    ...optional("city", address.city),
    ...optional("province", address.province),
    ...optional("postalCode", address.postalCode),
    countryCode: address.countryCode,
    ...optional("phone", address.phone),
  };
}

const summaryItem = (line: Cart["lines"][number]): SummaryItem => ({
  id: line.id,
  title: line.title,
  ...(line.image === undefined ? {} : { image: line.image }),
  options: line.options,
  quantity: line.quantity,
  total: line.total,
});

/** The order summary of a cart: shipping once a method is chosen, the tax Medusa worked out. */
export function toCartSummary(view: Cart, cart: CartDto): OrderSummary {
  const codes = view.promoCodes.map((promo) => promo.code).join(", ");
  const rows: SummaryLine[] = [
    { kind: "subtotal", amount: view.subtotal },
    ...(view.discountTotal.amount > 0
      ? [
          {
            kind: "discount" as const,
            amount: view.discountTotal,
            ...(codes === "" ? {} : { detail: codes }),
          },
        ]
      : []),
    cart.shippingMethod === null
      ? { kind: "shipping" }
      : { kind: "shipping", amount: toMoney(cart.shippingMethod.amount) },
    ...(view.taxTotal !== undefined && view.taxTotal.amount > 0
      ? [{ kind: "tax" as const, amount: view.taxTotal }]
      : []),
    { kind: "total", amount: view.total },
  ];
  return {
    currencyCode: view.currencyCode,
    items: view.lines.map(summaryItem),
    itemCount: view.itemCount,
    rows,
  };
}

/** CheckoutSteps on `current`: the steps before it link back to their pages. */
export function toCheckoutSteps(
  view: Cart,
  cart: CartDto,
  current: CheckoutStepId,
  labels: Record<CheckoutStepId, string>,
  stepHref: (step: CheckoutStepId) => string,
): CheckoutSteps {
  const index = CHECKOUT_STEP_IDS.indexOf(current);
  return {
    steps: {
      steps: CHECKOUT_STEP_IDS.map((id, at) => ({
        id,
        label: labels[id],
        ...(at < index ? { href: stepHref(id) } : {}),
      })),
      current,
    },
    summary: toCartSummary(view, cart),
  };
}

/** The countries the address form offers: the market's first, then the rest of its region's. */
export function formCountries(marketCountry: string, regionCountries: readonly string[]): string[] {
  const rest = regionCountries.filter((code) => code !== marketCountry);
  return regionCountries.includes(marketCountry) ? [marketCountry, ...rest] : [...rest];
}

/**
 * The contact step's form: what was typed (a failed submit's), else the cart's address, else the
 * market's country with nothing typed.
 */
export function toAddressFormState(
  countries: string[],
  saved: CartAddressDto | null,
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
  if (saved !== null && countries.includes(saved.countryCode)) {
    const { isDefaultBilling: _b, isDefaultShipping: _s, ...values } = toContractAddress(saved);
    return { countries, values };
  }
  return { countries, values: { countryCode: fallback } };
}

/** A shipping option as ShippingOptionCard draws it; one Medusa could not price is unavailable. */
export function toShippingOption(option: ShippingOptionDto, currencyCode: string): ShippingOption {
  return {
    id: option.id,
    name: option.name,
    price:
      option.price === null
        ? { amount: 0, currencyCode: toCurrencyCode(currencyCode) }
        : toMoney(option.price),
    available: option.price !== null,
  };
}

/** The payment step in M3: the system payment only (D65), chosen. */
export function toPaymentStep(): PaymentStep {
  return {
    saved: [],
    methods: [],
    selected: SYSTEM_PAYMENT_PROVIDER,
    canSave: false,
    saveForLater: false,
  };
}

/** What a payment is called: the system payment's words, or the provider's id until M6. */
export function paymentName(providerId: string | null, systemName: string): string {
  return providerId === null || providerId === SYSTEM_PAYMENT_PROVIDER ? systemName : providerId;
}

/** The review step from a cart whose steps are done. `null` when one is not. */
export function toReviewStep(
  cart: CartDto,
  systemName: string,
  editHrefs: { contact: string; delivery: string },
): Extract<CheckoutPage["step"], { kind: "review" }> | null {
  if (cart.email === null || cart.shippingAddress === null || cart.shippingMethod === null)
    return null;
  return {
    kind: "review",
    email: cart.email,
    shippingAddress: toContractAddress(cart.shippingAddress),
    shippingMethod: { name: cart.shippingMethod.name, price: toMoney(cart.shippingMethod.amount) },
    payment: { name: paymentName(cart.paymentProviderId, systemName) },
    editHrefs,
  };
}

const orderStatus = (status: string): Order["status"] =>
  status === "completed" || status === "canceled"
    ? status
    : status === "requires_action"
      ? "requires-action"
      : "pending";

/** The receipt from an order: its lines, totals, address, delivery, payment and history. */
export function toOrderConfirmation(
  order: OrderDto,
  hrefs: Pick<Hrefs, "product">,
  systemName: string,
  continueHref: string,
): OrderConfirmationPage | null {
  if (order.shippingAddress === null || order.lines.length === 0) return null;
  const lines: Order["lines"] = order.lines.map((line) => ({
    id: line.id,
    title: line.title || line.productHandle || line.id,
    ...(line.productHandle === null ? {} : { href: hrefs.product(line.productHandle) }),
    ...(line.thumbnail ? { image: toProductImage(line.thumbnail, line.title) } : {}),
    options: [],
    quantity: line.quantity,
    unitPrice: toMoney(line.unitPrice),
    total: toMoney(line.total),
  }));
  const contract: Order = {
    id: order.id,
    displayId: Math.max(1, order.displayId),
    email: order.email ?? "",
    placedAt: order.createdAt,
    status: orderStatus(order.status),
    currencyCode: toCurrencyCode(order.currencyCode),
    lines,
    subtotal: toMoney(order.subtotal),
    discountTotal: toMoney(order.discountTotal),
    shippingTotal: toMoney(order.shippingTotal),
    taxTotal: toMoney(order.taxTotal),
    total: toMoney(order.total),
    shippingAddress: toContractAddress(order.shippingAddress),
    shippingMethod: {
      name: order.shippingMethod?.name || "—",
      price: toMoney(order.shippingMethod?.amount ?? order.shippingTotal),
    },
    payment: { name: paymentName(order.paymentProviderId, systemName) },
    events: [{ kind: "placed", at: order.createdAt }],
  };
  const summary: OrderSummary = {
    currencyCode: contract.currencyCode,
    items: lines.map((line) => ({
      id: line.id,
      title: line.title,
      ...(line.image === undefined ? {} : { image: line.image }),
      options: line.options,
      quantity: line.quantity,
      total: line.total,
    })),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    rows: [
      { kind: "subtotal", amount: contract.subtotal },
      ...(contract.discountTotal.amount > 0
        ? [{ kind: "discount" as const, amount: contract.discountTotal }]
        : []),
      { kind: "shipping", amount: contract.shippingTotal },
      ...(contract.taxTotal.amount > 0
        ? [{ kind: "tax" as const, amount: contract.taxTotal }]
        : []),
      { kind: "total", amount: contract.total },
    ],
  };
  return { variant: "default", order: contract, summary, continueHref };
}
