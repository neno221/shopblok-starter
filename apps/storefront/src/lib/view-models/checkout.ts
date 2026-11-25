import type {
  Address,
  AddressFormState,
  Cart,
  CheckoutDone,
  CheckoutPage,
  CheckoutSteps,
  Order,
  OrderConfirmationPage,
  OrderSummary,
  PaymentBrand,
  PaymentStep,
  SavedPaymentMethod,
  ShippingOption,
  SummaryItem,
  SummaryLine,
} from "@shopblok/registry/contracts";
import { CHECKOUT_STEP_IDS } from "@shopblok/registry/contracts";
import type { CartAddressDto, CartDto } from "../medusa/cart";
import type { ShippingOptionDto } from "../medusa/fulfillment";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto } from "../medusa/orders";
import { STRIPE_PAYMENT_PROVIDER, SYSTEM_PAYMENT_PROVIDER } from "../medusa/payment";
import type { PaymentPreview } from "../medusa/payment-preview";
import type { SavedMethodDto } from "../medusa/payment-methods";
import { toCurrencyCode, toMoney, toProductImage, type Hrefs } from "./common";

// The cart page's, the checkout's and the receipt's view models (T52, D65), from the data layer's
// DTOs and the cart's view model (`cartView`, which reads the lines' products once). Pure: the
// market's URLs and words come in as arguments.

export type CheckoutStepId = (typeof CHECKOUT_STEP_IDS)[number];

/** How far a cart has come: the steps whose data Medusa holds. */
export function stepsDone(cart: CartDto): Record<CheckoutStepId, boolean> {
  const contact = cart.email !== null && cart.shippingAddress !== null;
  // M6 D117: a kept ConfirmationToken counts too: Medusa deletes the cart's sessions when its total
  // moves (a promotion on the review page), and the review's action initiates a new one; and (D119)
  // so does a kept saved method.
  const delivery =
    contact &&
    cart.shippingMethod !== null &&
    (cart.paymentProviderId !== null || cart.paymentToken !== null || cart.savedMethod !== null);
  return { contact, delivery, review: false };
}

/**
 * Whether the cart's kept payment is the signed-in customer's own (M6 D119): a saved method, or a
 * token that saves its method, needs the cart's own customer to be the caller, `customerId` (PR 142
 * review, item 2: a session that lapsed on a shared computer must not leave the next shopper paying
 * with the customer's card). Any other payment is anyone's who holds the cart.
 */
export function ownsKeptPayment(
  cart: Pick<CartDto, "savedMethod" | "paymentSave" | "customerId">,
  customerId: string | null,
): boolean {
  if (cart.savedMethod === null && !cart.paymentSave) return true;
  return customerId !== null && customerId === cart.customerId;
}

/**
 * The cart as the checkout shows it to a caller who does not own its kept payment
 * (`ownsKeptPayment`): as if the delivery step kept none, so the review is not open and the payment
 * step is drawn again. Only a read: the review's action forgets the payment on the cart itself.
 */
export function withoutKeptPayment(cart: CartDto): CartDto {
  return {
    ...cart,
    paymentProviderId: null,
    paymentToken: null,
    paymentPreview: null,
    savedMethod: null,
    paymentSave: false,
  };
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
 * The saved address that fills an empty contact step (T53): the customer's default when the region
 * ships there, else the first saved address it ships to (PR 81 review, item 3).
 */
export function savedAddressFor(
  customer: CustomerDto,
  countries: readonly string[],
): CustomerAddressDto | null {
  const fits = customer.addresses.filter((address) => countries.includes(address.countryCode));
  return fits.find((address) => address.isDefaultShipping) ?? fits[0] ?? null;
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

/** A shipping option a wallet can offer (M6 T102): one with a price, delivered (not a pickup). */
export const expressDeliverable = (option: ShippingOptionDto): boolean =>
  option.price !== null && !option.pickup;

/** A shipping option as the express rail's wallet lists it; the amount in the main unit. */
export type ExpressRate = { id: string; name: string; amount: number };

/** The cart's shipping options a wallet can offer, `first` (the cart's own, if any) first. */
export function toExpressRates(
  options: readonly ShippingOptionDto[],
  first?: string,
): ExpressRate[] {
  const rates = options
    .filter(expressDeliverable)
    .map((option) => ({ id: option.id, name: option.name, amount: option.price?.amount ?? 0 }));
  const index = rates.findIndex((rate) => rate.id === first);
  if (index <= 0) return rates;
  return [rates[index] as ExpressRate, ...rates.slice(0, index), ...rates.slice(index + 1)];
}

/**
 * A saved method as PaymentStep and PaymentMethodsManager draw it (M6 D119), or `null` for a card
 * that lacks its digits or expiry. A card of a brand the design system has no mark for (Discover,
 * JCB, Cartes Bancaires…) is a plain `card` ("Card ending in 1117"), so the customer can still pay
 * with it and remove it (PR 142 review, item 1). Stripe keeps nothing of a Revolut Pay account to
 * show, so it is its name alone.
 */
export function toSavedPaymentMethod(method: SavedMethodDto): SavedPaymentMethod | null {
  if (method.type === "revolut_pay")
    return { kind: "revolut_pay", id: method.id, isDefault: false };
  if (method.last4 === null || method.expiryMonth === null || method.expiryYear === null)
    return null;
  return {
    id: method.id,
    brand: (method.brand === null ? undefined : CARD_BRANDS[method.brand]) ?? "card",
    last4: method.last4,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isDefault: false,
  };
}

/** The saved methods the design system can draw, in Stripe's order (newest first). */
export function toSavedPaymentMethods(methods: readonly SavedMethodDto[]): SavedPaymentMethod[] {
  return methods.flatMap((method) => {
    const saved = toSavedPaymentMethod(method);
    return saved === null ? [] : [saved];
  });
}

/**
 * What a signed-in customer's payment step adds (M6 D119): their saved methods above the Element,
 * "Save this card for next time", and which one is chosen. Only for the cart's own customer.
 */
export type SavedChoice = {
  saved: SavedPaymentMethod[];
  canSave: boolean;
  saveForLater: boolean;
  /** The saved method the cart pays with, or a failed submit's choice. */
  selected?: string;
};

/**
 * The payment step: Stripe's Payment Element (M6 D117), chosen, when the checkout pays with it
 * (`paysWithStripe`), with a signed-in customer's saved methods first and "Save this card for next
 * time" (D119); the system payment ("Pay later") alone otherwise (D65).
 */
export function toPaymentStep(stripeName?: string, own?: SavedChoice): PaymentStep {
  if (stripeName !== undefined) {
    const saved = own?.saved ?? [];
    const selected =
      own?.selected !== undefined && saved.some((method) => method.id === own.selected)
        ? own.selected
        : STRIPE_PAYMENT_PROVIDER;
    return {
      saved,
      methods: [
        {
          id: STRIPE_PAYMENT_PROVIDER,
          kind: "card",
          name: stripeName,
          brands: ["visa", "mastercard", "americanexpress", "applepay", "googlepay", "revolut"],
        },
      ],
      selected,
      canSave: own?.canSave ?? false,
      saveForLater: own?.saveForLater ?? false,
    };
  }
  return {
    saved: [],
    methods: [],
    selected: SYSTEM_PAYMENT_PROVIDER,
    canSave: false,
    saveForLater: false,
  };
}

/** The names a payment line falls back on: the system payment's and Stripe's (M6). */
export type PaymentNames = { system: string; stripe: string };

/** The payment names from a catalog's PaymentStep words. */
export const paymentNames = (messages: {
  organisms: { paymentStep: { systemName: string; stripeName: string } };
}): PaymentNames => ({
  system: messages.organisms.paymentStep.systemName,
  stripe: messages.organisms.paymentStep.stripeName,
});

const CARD_BRANDS: Record<string, PaymentBrand> = {
  visa: "visa",
  mastercard: "mastercard",
  amex: "americanexpress",
};

const WALLETS: Record<string, PaymentBrand> = { apple_pay: "applepay", google_pay: "googlepay" };

/**
 * How a payment reads (M6 D117): Stripe's preview as a card's brand and last four ("Visa ending in
 * 4242"), Revolut Pay and Link (the express rail's, T102) by their names, a wallet with no card
 * shown by the wallet's mark, any other Stripe method by Stripe's name; the system payment's words
 * otherwise.
 */
export function paymentOf(
  providerId: string | null,
  preview: PaymentPreview | null,
  names: PaymentNames,
): { name?: string; brand?: PaymentBrand; last4?: string } {
  if (providerId !== STRIPE_PAYMENT_PROVIDER)
    return { name: paymentName(providerId, names.system) };
  if (preview === null) return { name: names.stripe };
  const brand = preview.brand === undefined ? undefined : CARD_BRANDS[preview.brand];
  if (preview.type === "card" && brand !== undefined && preview.last4 !== undefined)
    return { brand, last4: preview.last4 };
  if (preview.type === "revolut_pay") return { name: "Revolut Pay", brand: "revolut" };
  if (preview.type === "link") return { name: "Link" };
  const wallet = preview.wallet === undefined ? undefined : WALLETS[preview.wallet];
  if (wallet !== undefined) return { brand: wallet };
  return { name: names.stripe };
}

/**
 * The cart's payment provider as the review shows it: its session's, or Stripe when it has none but
 * keeps a ConfirmationToken. Medusa deletes a cart's sessions when its total moves (a promotion, a
 * change in another tab), and "Place order" makes a new Stripe session from the kept token, so the
 * review still pays with the token's card (PR 140's review, item 2).
 */
export function cartPaymentProvider(
  cart: Pick<CartDto, "paymentProviderId" | "paymentToken" | "savedMethod">,
) {
  return (
    cart.paymentProviderId ??
    (cart.paymentToken !== null || cart.savedMethod !== null ? STRIPE_PAYMENT_PROVIDER : null)
  );
}

/** What a payment is called: the system payment's words, or the provider's id. */
export function paymentName(providerId: string | null, systemName: string): string {
  return providerId === null || providerId === SYSTEM_PAYMENT_PROVIDER ? systemName : providerId;
}

/** The review step from a cart whose steps are done. `null` when one is not. */
export function toReviewStep(
  cart: CartDto,
  names: PaymentNames,
  editHrefs: { contact: string; delivery: string },
): Extract<CheckoutPage["step"], { kind: "review" }> | null {
  if (cart.email === null || cart.shippingAddress === null || cart.shippingMethod === null)
    return null;
  return {
    kind: "review",
    email: cart.email,
    shippingAddress: toContractAddress(cart.shippingAddress),
    shippingMethod: { name: cart.shippingMethod.name, price: toMoney(cart.shippingMethod.amount) },
    payment: paymentOf(cartPaymentProvider(cart), cart.paymentPreview, names),
    editHrefs,
  };
}

/**
 * The `one-page` checkout's finished steps (T86) from the cart: each step before `current`, with its
 * "Edit" link (the step's page at its anchor). `undefined` for a step the cart has not done, which
 * `canOpen` keeps from happening for a step before the one shown.
 */
export function toCheckoutDone(
  cart: CartDto,
  current: CheckoutStepId,
  names: PaymentNames,
  editHrefs: { contact: string; delivery: string },
): CheckoutDone {
  const before = CHECKOUT_STEP_IDS.slice(0, CHECKOUT_STEP_IDS.indexOf(current));
  const done: CheckoutDone = {};
  if (before.includes("contact") && cart.email !== null && cart.shippingAddress !== null)
    done.contact = {
      email: cart.email,
      shippingAddress: toContractAddress(cart.shippingAddress),
      editHref: editHrefs.contact,
    };
  if (before.includes("delivery") && cart.shippingMethod !== null)
    done.delivery = {
      shippingMethod: {
        name: cart.shippingMethod.name,
        price: toMoney(cart.shippingMethod.amount),
      },
      payment: paymentOf(cartPaymentProvider(cart), cart.paymentPreview, names),
      editHref: editHrefs.delivery,
    };
  return done;
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
  names: PaymentNames,
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
    payment: paymentOf(order.paymentProviderId, order.paymentPreview, names),
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
