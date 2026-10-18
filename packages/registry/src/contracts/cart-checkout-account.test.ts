import { describe, expect, it } from "vitest";
import {
  AccountNav,
  AddressBook,
  CartDrawer,
  CheckoutSteps,
  OrderSummary,
  OrderTable,
  OrderTimeline,
  PaymentMethodsManager,
  PaymentStep,
  QuickCart,
  ReturnRequest,
} from "./cart-checkout-account";

// The cart, checkout and account organisms' own rules (T39): a summary out of a receipt's order or
// in two currencies, checkout steps that are not SPEC §8.4's three, a payment choice that names
// nothing on offer, two defaults, and a return of more than was bought. `@shopblok/fixtures`' test
// parses the real data.

type Schema = {
  safeParse(value: unknown): { error?: { issues: { message: string }[] } };
};

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });
const usd = (amount: number) => ({ amount, currencyCode: "USD" });

const line = {
  id: "line_1",
  productId: "prod_1",
  variantId: "var_1",
  title: "Hoodie",
  href: "/products/hoodie",
  options: [{ option: "Size", value: "M" }],
  quantity: 2,
  unitPrice: eur(50),
  total: eur(100),
  stock: { status: "in-stock" },
};

const cart = {
  id: "cart_1",
  currencyCode: "EUR",
  lines: [line],
  itemCount: 2,
  subtotal: eur(100),
  discountTotal: eur(0),
  total: eur(100),
  promoCodes: [],
};

const item = {
  id: "line_1",
  title: "Hoodie",
  options: [],
  quantity: 2,
  total: eur(100),
};
const summary = {
  currencyCode: "EUR",
  items: [item],
  itemCount: 2,
  rows: [
    { kind: "subtotal", amount: eur(100) },
    { kind: "discount", amount: eur(10), detail: "WELCOME10" },
    { kind: "shipping" },
    { kind: "total", amount: eur(90) },
  ],
};

const steps = (ids: string[]) => ({
  steps: ids.map((id) => ({ id, label: id })),
  current: ids[0],
});

const card = (id: string, isDefault = false) => ({
  id,
  brand: "visa",
  last4: "4242",
  expiryMonth: 8,
  expiryYear: 2028,
  isDefault,
});

const method = {
  id: "pp_stripe_stripe",
  kind: "card",
  name: "Card",
  brands: ["visa"],
};

const address = (id: string, isDefaultShipping = false) => ({
  address: {
    id,
    firstName: "Maria",
    lastName: "Georgiou",
    address1: "1 Main Street",
    city: "Nicosia",
    countryCode: "cy",
    isDefaultShipping,
  },
  editHref: `/account/addresses/${id}`,
});

const order = (id: string, placedAt: string) => ({
  id,
  displayId: 1001,
  placedAt,
  status: "delivered",
  itemCount: 2,
  total: eur(90),
  href: `/account/orders/${id}`,
});

const returnItem = {
  id: "line_1",
  title: "Hoodie",
  options: [],
  quantity: 2,
  returnable: 2,
  quantityChosen: 0,
};
const request = {
  orderId: "order_1",
  displayId: 1001,
  items: [returnItem],
  reasons: [{ id: "too-small", label: "Too small" }],
  note: "",
};

describe("CartDrawer and QuickCart", () => {
  it("accept a cart with its links, and an empty one", () => {
    const drawer = {
      cart,
      promoCode: "",
      cartHref: "/cart",
      checkoutHref: "/checkout",
      continueHref: "/store",
    };
    expect(issues(CartDrawer, drawer)).toEqual([]);
    expect(
      issues(CartDrawer, {
        ...drawer,
        cart: { ...cart, lines: [], itemCount: 0 },
      }),
    ).toEqual([]);
  });

  it("refuse a dropdown whose cart holds fewer items than the line added, or another currency", () => {
    const quick = {
      added: line,
      itemCount: 3,
      subtotal: eur(150),
      cartHref: "/cart",
      checkoutHref: "/checkout",
    };
    expect(issues(QuickCart, quick)).toEqual([]);
    expect(issues(QuickCart, { ...quick, itemCount: 1 })).toContain(
      "the cart holds fewer items than the line just added",
    );
    expect(issues(QuickCart, { ...quick, subtotal: usd(150) }).join()).toMatch(
      /EUR in a USD total/,
    );
  });
});

describe("OrderSummary", () => {
  it("accepts the rows of a receipt, in order, ending with the total", () => {
    expect(issues(OrderSummary, summary)).toEqual([]);
  });

  it("refuses rows out of order, a total that is not last, and a subtotal that is not first", () => {
    const [subtotal, discount, shipping, total] = summary.rows;
    expect(
      issues(OrderSummary, {
        ...summary,
        rows: [subtotal, shipping, discount, total],
      }),
    ).toContain("the rows are not in a receipt's order (subtotal, discount, shipping, tax, total)");
    expect(issues(OrderSummary, { ...summary, rows: [subtotal, total, shipping] })).toContain(
      "the total is not the last row, once",
    );
    expect(issues(OrderSummary, { ...summary, rows: [discount, total] })).toContain(
      "the first row is not the subtotal",
    );
    expect(
      issues(OrderSummary, {
        ...summary,
        rows: [subtotal, shipping, shipping, total],
      }),
    ).toContain("shipping is listed twice");
  });

  it("refuses an amount in another currency, a line twice and a count the lines do not hold", () => {
    expect(
      issues(OrderSummary, {
        ...summary,
        items: [{ ...item, total: usd(100) }],
      }).join(),
    ).toMatch(/USD in a EUR total/);
    expect(issues(OrderSummary, { ...summary, items: [item, item], itemCount: 4 })).toContain(
      "a line is listed twice",
    );
    expect(issues(OrderSummary, { ...summary, itemCount: 3 })).toContain(
      "the lines hold 2 items, not 3",
    );
  });
});

describe("CheckoutSteps", () => {
  it("accepts SPEC §8.4's three steps and refuses any other set or order", () => {
    expect(
      issues(CheckoutSteps, {
        steps: steps(["contact", "delivery", "review"]),
        summary,
      }),
    ).toEqual([]);
    const message = "the steps are not SPEC §8.4's three: contact, delivery, review";
    expect(
      issues(CheckoutSteps, {
        steps: steps(["contact", "review", "delivery"]),
        summary,
      }),
    ).toContain(message);
    expect(
      issues(CheckoutSteps, {
        steps: steps(["cart", "contact", "delivery", "review"]),
        summary,
      }),
    ).toContain(message);
  });
});

describe("PaymentStep", () => {
  const step = {
    saved: [card("card_1", true)],
    methods: [method],
    canSave: true,
    saveForLater: false,
  };

  it("accepts a choice on offer, nothing chosen, and nothing on offer at all (the system payment)", () => {
    expect(issues(PaymentStep, { ...step, selected: "card_1" })).toEqual([]);
    expect(issues(PaymentStep, step)).toEqual([]);
    expect(
      issues(PaymentStep, {
        saved: [],
        methods: [],
        canSave: false,
        saveForLater: false,
      }),
    ).toEqual([]);
  });

  it("refuses a choice not on offer, an id twice, two defaults and a card kept for a guest", () => {
    expect(issues(PaymentStep, { ...step, selected: "card_9" })).toContain(
      "the chosen payment is not one on offer",
    );
    expect(issues(PaymentStep, { ...step, methods: [method, method] })).toContain(
      "pp_stripe_stripe is offered twice",
    );
    expect(
      issues(PaymentStep, {
        ...step,
        saved: [card("a", true), card("b", true)],
      }),
    ).toContain("two cards are the default");
    expect(issues(PaymentStep, { ...step, canSave: false, saveForLater: true })).toContain(
      "a card is saved for a customer who cannot keep one",
    );
  });
});

describe("AccountNav and OrderTimeline", () => {
  const items = [
    { id: "overview", label: "Overview", href: "/account" },
    { id: "orders", label: "Orders", href: "/account/orders" },
  ];

  it("accept the account's pages with the current one, and refuse a page twice or none current", () => {
    expect(issues(AccountNav, { items, current: "orders" })).toEqual([]);
    expect(issues(AccountNav, { items, current: "returns" })).toContain(
      "current is not one of the pages",
    );
    expect(issues(AccountNav, { items: [...items, items[0]], current: "orders" })).toContain(
      "a page is listed twice",
    );
  });

  it("accept a history from `placed`, oldest first, and refuse any other", () => {
    const placed = { kind: "placed", at: "2026-09-01T10:00:00Z" };
    const shipped = { kind: "shipped", at: "2026-09-02T10:00:00Z" };
    expect(issues(OrderTimeline, { events: [placed, shipped] })).toEqual([]);
    expect(issues(OrderTimeline, { events: [shipped] })).toContain(
      "the first event is not `placed`",
    );
    expect(
      issues(OrderTimeline, {
        events: [placed, { ...shipped, at: "2026-08-01T10:00:00Z" }],
      }),
    ).toContain("the events are not oldest first");
  });
});

describe("OrderTable", () => {
  const shopHref = "/store";

  it("accepts the orders newest first, and none", () => {
    expect(
      issues(OrderTable, {
        orders: [order("b", "2026-09-20T10:00:00Z"), order("a", "2026-09-01T10:00:00Z")],
        shopHref,
      }),
    ).toEqual([]);
    expect(issues(OrderTable, { orders: [], shopHref })).toEqual([]);
  });

  it("refuses orders oldest first, or one twice", () => {
    expect(
      issues(OrderTable, {
        orders: [order("a", "2026-09-01T10:00:00Z"), order("b", "2026-09-20T10:00:00Z")],
        shopHref,
      }),
    ).toContain("the orders are not newest first");
    const one = order("a", "2026-09-01T10:00:00Z");
    expect(issues(OrderTable, { orders: [one, one], shopHref })).toContain(
      "an order is listed twice",
    );
  });
});

describe("AddressBook and PaymentMethodsManager", () => {
  it("accept one default, and refuse two", () => {
    expect(
      issues(AddressBook, {
        entries: [address("a", true), address("b")],
        addHref: "/new",
      }),
    ).toEqual([]);
    expect(
      issues(AddressBook, {
        entries: [address("a", true), address("b", true)],
        addHref: "/new",
      }),
    ).toContain("two addresses are the default for shipping");
    expect(issues(PaymentMethodsManager, { cards: [card("a", true), card("b")] })).toEqual([]);
    expect(
      issues(PaymentMethodsManager, {
        cards: [card("a", true), card("b", true)],
      }),
    ).toContain("two cards are the default");
  });

  it("refuse an address without its id, and a card or an address twice", () => {
    const { address: withoutId } = address("a");
    expect(
      issues(AddressBook, {
        entries: [{ address: { ...withoutId, id: undefined }, editHref: "/a" }],
        addHref: "/new",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issues(AddressBook, {
        entries: [address("a"), address("a")],
        addHref: "/new",
      }),
    ).toContain("an address is listed twice");
    expect(issues(PaymentMethodsManager, { cards: [card("a"), card("a")] })).toContain(
      "a card is listed twice",
    );
  });
});

describe("ReturnRequest", () => {
  it("accepts a line that can be returned, with a reason of the shop's", () => {
    expect(issues(ReturnRequest, request)).toEqual([]);
    expect(
      issues(ReturnRequest, {
        ...request,
        reason: "too-small",
        note: "Too tight.",
      }),
    ).toEqual([]);
  });

  it("refuses more than was bought, more chosen than may go back, and a reason not the shop's", () => {
    expect(
      issues(ReturnRequest, {
        ...request,
        items: [{ ...returnItem, returnable: 3 }],
      }),
    ).toContain("more may be returned than were bought");
    expect(
      issues(ReturnRequest, {
        ...request,
        items: [{ ...returnItem, quantityChosen: 3 }],
      }),
    ).toContain("more are chosen than may be returned");
    expect(issues(ReturnRequest, { ...request, reason: "colour" })).toContain(
      "the reason chosen is not one of the shop's",
    );
  });

  it("refuses an order with nothing left to return, and a note over 500 characters", () => {
    expect(
      issues(ReturnRequest, {
        ...request,
        items: [{ ...returnItem, returnable: 0 }],
      }),
    ).toContain("nothing on the order can be returned");
    expect(issues(ReturnRequest, { ...request, note: "x".repeat(501) }).length).toBe(1);
  });
});
