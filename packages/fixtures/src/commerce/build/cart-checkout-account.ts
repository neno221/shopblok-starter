import type {
  Cart,
  CheckoutSteps,
  Order,
  OrderSummary,
  PaymentMethod,
  ReturnRequest,
  SavedPaymentMethod,
  ShippingOption,
  StepperState,
  SummaryItem,
  SummaryLine,
} from "@shopblok/registry/contracts";
import type { Address } from "@shopblok/registry/contracts";
import { round2, type Context } from "../context";
import { cartSpec } from "../data/checkout";
import type { CommerceFixture } from "../types";
import { vatIncluded } from "./checkout";

// The cart, checkout and account organisms' samples (T39), made from the locale's cart, orders,
// address book, cards and payment methods: the cart drawer full and empty, the dropdown after the
// first line was added, the order summary of the cart and of the delivered order, the three
// checkout steps (the review with the standard delivery chosen), the payment step for a customer
// with saved cards, for a guest and with no provider (the system payment), the account's pages, the
// orders' history and list, the address book and the wallet full and empty, and the return form of
// the delivered order, blank and filled in.

/** What a summary shows of a cart's or an order's line. */
function summaryItem(line: Cart["lines"][number] | Order["lines"][number]): SummaryItem {
  return {
    id: line.id,
    title: line.title,
    ...(line.image !== undefined && { image: line.image }),
    options: line.options.map((option) => ({ ...option })),
    quantity: line.quantity,
    total: line.total,
  };
}

/** The cart's summary, before shipping is chosen, or with an option's price in it. */
function cartSummary(ctx: Context, cart: Cart, shipping?: ShippingOption): OrderSummary {
  const total = round2(cart.total.amount + (shipping?.price.amount ?? 0));
  const tax = shipping === undefined ? cart.taxTotal?.amount : vatIncluded(ctx, total);
  const rows: SummaryLine[] = [
    { kind: "subtotal", amount: cart.subtotal },
    ...(cart.discountTotal.amount > 0
      ? [
          {
            kind: "discount" as const,
            amount: cart.discountTotal,
            detail: cartSpec.promo.code,
          },
        ]
      : []),
    shipping === undefined ? { kind: "shipping" } : { kind: "shipping", amount: shipping.price },
    // The US price has no tax in it: the sales tax is worked out at checkout.
    tax === undefined ? { kind: "tax" } : { kind: "tax", amount: ctx.money(tax) },
    { kind: "total", amount: ctx.money(total) },
  ];
  return {
    currencyCode: cart.currencyCode,
    items: cart.lines.map(summaryItem),
    itemCount: cart.itemCount,
    rows,
  };
}

/** A placed order's summary: what it cost, as the confirmation and the order page show it. */
function orderSummary(order: Order): OrderSummary {
  return {
    currencyCode: order.currencyCode,
    items: order.lines.map(summaryItem),
    itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    rows: [
      { kind: "subtotal", amount: order.subtotal },
      ...(order.discountTotal.amount > 0
        ? [{ kind: "discount" as const, amount: order.discountTotal }]
        : []),
      { kind: "shipping", amount: order.shippingTotal },
      { kind: "tax", amount: order.taxTotal },
      { kind: "total", amount: order.total },
    ],
  };
}

export function buildCartCheckout(
  ctx: Context,
  cart: Cart,
  steps: {
    contact: StepperState;
    delivery: StepperState;
    review: StepperState;
  },
  shippingOptions: ShippingOption[],
  paymentMethods: PaymentMethod[],
  savedPaymentMethods: SavedPaymentMethod[],
  orders: Order[],
): CommerceFixture["cartCheckout"] {
  const [first] = cart.lines;
  const [delivered] = orders;
  const standard = shippingOptions.find((option) => option.id === "so_standard");
  if (first === undefined || delivered === undefined || standard === undefined)
    throw new Error("the cart, the orders or the shipping options are empty");
  const links = {
    cartHref: ctx.href("/cart"),
    checkoutHref: ctx.href("/checkout/contact"),
  };
  const summary = cartSummary(ctx, cart);
  const checkout = (state: StepperState, withShipping = false): CheckoutSteps => ({
    steps: state,
    summary: withShipping ? cartSummary(ctx, cart, standard) : summary,
  });
  const defaultCard = savedPaymentMethods.find((card) => card.isDefault);
  return {
    drawer: {
      full: { cart, promoCode: "", ...links, continueHref: ctx.href("/store") },
      empty: {
        cart: {
          id: cart.id,
          currencyCode: cart.currencyCode,
          lines: [],
          itemCount: 0,
          subtotal: ctx.money(0),
          discountTotal: ctx.money(0),
          total: ctx.money(0),
          promoCodes: [],
        },
        promoCode: "",
        ...links,
        continueHref: ctx.href("/store"),
      },
    },
    quickCart: {
      added: first,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      ...links,
    },
    summary: { cart: summary, order: orderSummary(delivered) },
    checkout: {
      contact: checkout(steps.contact),
      delivery: checkout(steps.delivery),
      review: checkout(steps.review, true),
    },
    payment: {
      saved: {
        saved: savedPaymentMethods,
        methods: paymentMethods,
        ...(defaultCard !== undefined && { selected: defaultCard.id }),
        canSave: true,
        saveForLater: false,
      },
      guest: {
        saved: [],
        methods: paymentMethods,
        canSave: false,
        saveForLater: false,
      },
      system: { saved: [], methods: [], canSave: false, saveForLater: false },
    },
  };
}

export function buildAccount(
  ctx: Context,
  orders: Order[],
  addresses: Address[],
  savedPaymentMethods: SavedPaymentMethod[],
): CommerceFixture["account"] {
  const words = ctx.copy.account;
  const [delivered, placed] = orders;
  if (delivered === undefined || placed === undefined)
    throw new Error("the fixtures have two orders");
  const pages = [
    ["overview", words.nav.overview, "/account"],
    ["orders", words.nav.orders, "/account/orders"],
    ["addresses", words.nav.addresses, "/account/addresses"],
    ["payment-methods", words.nav.paymentMethods, "/account/payment-methods"],
    ["returns", words.nav.returns, "/account/returns"],
    ["profile", words.nav.profile, "/account/profile"],
  ] as const;
  // Newest first, as the account lists them.
  const newestFirst = [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
  const reasons: ReturnRequest["reasons"] = [
    { id: "rr_too_small", label: words.reasons.tooSmall },
    { id: "rr_too_large", label: words.reasons.tooLarge },
    { id: "rr_not_as_described", label: words.reasons.notAsDescribed },
    { id: "rr_changed_mind", label: words.reasons.changedMind },
  ];
  const items = delivered.lines.map((line) => ({
    id: line.id,
    title: line.title,
    ...(line.image !== undefined && { image: line.image }),
    options: line.options.map((option) => ({ ...option })),
    quantity: line.quantity,
    returnable: line.quantity,
    quantityChosen: 0,
  }));
  const blank: ReturnRequest = {
    orderId: delivered.id,
    displayId: delivered.displayId,
    items,
    reasons,
    note: "",
  };
  const book = addresses.map((address) => ({
    address: { ...address, id: address.id ?? `addr_${address.countryCode}` },
    editHref: ctx.href(`/account/addresses/${address.id ?? address.countryCode}`),
  }));
  return {
    nav: {
      items: pages.map(([id, label, path]) => ({
        id,
        label,
        href: ctx.href(path),
      })),
      current: "orders",
    },
    timeline: {
      delivered: { events: delivered.events },
      placed: { events: placed.events },
    },
    orders: {
      list: {
        orders: newestFirst.map((order) => ({
          id: order.id,
          displayId: order.displayId,
          placedAt: order.placedAt,
          status: order.events.at(-1)?.kind ?? "placed",
          itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
          total: order.total,
          href: ctx.href(`/account/orders/${order.id}`),
        })),
        shopHref: ctx.href("/store"),
      },
      empty: {
        orders: [],
        shopHref: ctx.href("/store"),
      },
    },
    addressBook: {
      full: { entries: book, addHref: ctx.href("/account/addresses/new") },
      empty: { entries: [], addHref: ctx.href("/account/addresses/new") },
    },
    paymentMethods: {
      cards: {
        cards: savedPaymentMethods,
        addHref: ctx.href("/account/payment-methods/new"),
      },
      empty: { cards: [], addHref: ctx.href("/account/payment-methods/new") },
    },
    returnRequest: {
      blank,
      // The tee (two bought), one of them too small, with a note.
      filled: {
        ...blank,
        items: items.map((item, index) => (index === 1 ? { ...item, quantityChosen: 1 } : item)),
        reason: "rr_too_small",
        note: words.note,
      },
    },
  };
}
