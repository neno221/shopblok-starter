import { z } from "zod";
import { Address } from "./address";
import { Cart, CartLine, LineOption } from "./cart";
import { checkCurrency } from "./checks";
import { StepperState, SummaryLine } from "./checkout";
import { Href, Id, IsoDateTime, Link } from "./content";
import { Image } from "./image";
import { CurrencyCode, Money } from "./money";
import { OrderEvent } from "./order";
import { PaymentMethod, SavedPaymentMethod } from "./payment";

// T39: what the cart's, the checkout's and the account's organisms show (SPEC §8.4: the cart drawer,
// the three checkout steps, the payment step, the account pages). They are built from T34's
// molecules on T30's cart, order, address and payment contracts, so these are mostly those put
// together; what is new is checked here: a summary whose rows are out of order or in two currencies,
// checkout steps that are not SPEC §8.4's three, a payment choice that names nothing on offer, an
// address book or a wallet with two defaults, and a return of more than was bought. Links arrive as
// `href`s (D42): every page an organism links to is in its contract.

const uniqueIds = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

/** The cart drawer (CartDrawer, a sheet): the cart, the field's code, and the ways on. */
export const CartDrawer = z.object({
  cart: Cart,
  promoCode: z
    .string()
    .describe("What the promotion field holds: kept after an error, empty at first"),
  cartHref: Href.describe("The cart page: 'View cart'"),
  checkoutHref: Href.describe("The checkout's first step"),
  continueHref: Href.describe("Where 'Continue shopping' goes from an empty cart"),
});

/**
 * The dropdown under the header's cart button after a product is added (QuickCartDropdown): the
 * line just added as the cart now holds it, what the cart holds in all, and the ways on.
 */
export const QuickCart = z
  .object({
    added: CartLine.describe("The line the product went into, with its new quantity"),
    itemCount: z.int().positive().describe("Every item in the cart now, the added ones included"),
    subtotal: Money.describe("The cart's subtotal now"),
    cartHref: Href,
    checkoutHref: Href,
  })
  .superRefine((quick, context) => {
    checkCurrency(context, quick.subtotal.currencyCode, [
      [["added", "unitPrice"], quick.added.unitPrice],
      [["added", "total"], quick.added.total],
    ]);
    if (quick.itemCount < quick.added.quantity)
      context.addIssue({
        code: "custom",
        path: ["itemCount"],
        message: "the cart holds fewer items than the line just added",
      });
  });

/** A line of an order summary: what was bought, without the controls a cart line has. */
export const SummaryItem = z.object({
  id: Id,
  title: z.string().min(1),
  image: Image.optional(),
  options: z.array(LineOption),
  quantity: z.int().positive(),
  total: Money,
});

const kindOrder = ["subtotal", "discount", "shipping", "tax", "total"] as const;

/**
 * The order summary (OrderSummary; the checkout's column, the confirmation): the lines, collapsed
 * under `lg`, then the rows in the order a receipt has them (subtotal, discounts, shipping, tax),
 * ending with the one total. One currency throughout.
 */
export const OrderSummary = z
  .object({
    currencyCode: CurrencyCode,
    items: z.array(SummaryItem).min(1),
    itemCount: z.int().positive().describe("The sum of the lines' quantities"),
    rows: z.array(SummaryLine).min(2).describe("Subtotal first, the total last, once each"),
  })
  .superRefine((summary, context) => {
    checkCurrency(context, summary.currencyCode, [
      ...summary.items.map((item, index): [(string | number)[], Money | undefined] => [
        ["items", index, "total"],
        item.total,
      ]),
      ...summary.rows.map((row, index): [(string | number)[], Money | undefined] => [
        ["rows", index, "amount"],
        row.amount,
      ]),
    ]);
    if (!uniqueIds(summary.items))
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "a line is listed twice",
      });
    const quantities = summary.items.reduce((sum, item) => sum + item.quantity, 0);
    if (quantities !== summary.itemCount)
      context.addIssue({
        code: "custom",
        path: ["itemCount"],
        message: `the lines hold ${quantities} items, not ${summary.itemCount}`,
      });
    const kinds = summary.rows.map((row) => row.kind);
    if (kinds[0] !== "subtotal")
      context.addIssue({
        code: "custom",
        path: ["rows", 0],
        message: "the first row is not the subtotal",
      });
    if (kinds.at(-1) !== "total" || kinds.filter((kind) => kind === "total").length !== 1)
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "the total is not the last row, once",
      });
    const ranks = kinds.map((kind) => kindOrder.indexOf(kind));
    if (ranks.some((rank, index) => index > 0 && rank < ranks[index - 1]!))
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "the rows are not in a receipt's order (subtotal, discount, shipping, tax, total)",
      });
    for (const kind of ["subtotal", "shipping", "tax"] as const)
      if (kinds.filter((each) => each === kind).length > 1)
        context.addIssue({
          code: "custom",
          path: ["rows"],
          message: `${kind} is listed twice`,
        });
  });

/** SPEC §8.4's three checkout steps, by id, in their order. */
export const CHECKOUT_STEP_IDS = ["contact", "delivery", "review"] as const;

/**
 * The checkout (CheckoutSteps): SPEC §8.4's three steps (contact and address; delivery and payment;
 * review) with where the shopper is, and the order summary beside them. The step's own content (the
 * address form, the delivery options and PaymentStep, the review) is a slot.
 */
export const CheckoutSteps = z
  .object({
    steps: StepperState,
    summary: OrderSummary,
  })
  .refine(
    (checkout) =>
      checkout.steps.steps.length === CHECKOUT_STEP_IDS.length &&
      checkout.steps.steps.every((step, index) => step.id === CHECKOUT_STEP_IDS[index]),
    "the steps are not SPEC §8.4's three: contact, delivery, review",
  );

/**
 * The payment step (PaymentStep): the customer's saved cards, the ways to pay the region offers,
 * which is chosen, and whether a new card is kept. With neither, the step offers the system payment
 * (Medusa's `pp_system_default`): the order is placed and paid as the shop arranges.
 */
export const PaymentStep = z
  .object({
    saved: z.array(SavedPaymentMethod).describe("The signed-in customer's cards; none for a guest"),
    methods: z.array(PaymentMethod).describe("The region's payment providers"),
    selected: Id.optional().describe("A saved card's id or a method's; none: nothing is chosen"),
    canSave: z
      .boolean()
      .describe("A signed-in customer may keep a new card: 'Save for next time' is offered"),
    saveForLater: z.boolean().describe("The box's state"),
  })
  .superRefine((step, context) => {
    const ids = [...step.saved, ...step.methods].map((each) => each.id);
    ids.forEach((id, index) => {
      if (ids.indexOf(id) !== index)
        context.addIssue({
          code: "custom",
          path: ["methods"],
          message: `${id} is offered twice`,
        });
    });
    if (step.selected !== undefined && !ids.includes(step.selected) && ids.length > 0)
      context.addIssue({
        code: "custom",
        path: ["selected"],
        message: "the chosen payment is not one on offer",
      });
    if (step.saved.filter((card) => card.isDefault).length > 1)
      context.addIssue({
        code: "custom",
        path: ["saved"],
        message: "two cards are the default",
      });
    if (step.saveForLater && !step.canSave)
      context.addIssue({
        code: "custom",
        path: ["saveForLater"],
        message: "a card is saved for a customer who cannot keep one",
      });
  });

/** The account's navigation (AccountNav): its pages, and the one the customer is on. */
export const AccountNav = z
  .object({
    items: z.array(Link.extend({ id: Id })).min(2),
    current: Id.describe("The id of the page the customer is on"),
  })
  .refine((nav) => uniqueIds(nav.items), "a page is listed twice")
  .refine(
    (nav) => nav.items.some((item) => item.id === nav.current),
    "current is not one of the pages",
  );

/** An order's history (OrderTimeline): its events, oldest first, from the order being placed. */
export const OrderTimeline = z
  .object({ events: z.array(OrderEvent).min(1) })
  .refine((timeline) => timeline.events[0]?.kind === "placed", "the first event is not `placed`")
  .refine((timeline) => {
    const times = timeline.events.map((event) => Date.parse(event.at));
    return times.every((time, index) => index === 0 || time >= times[index - 1]!);
  }, "the events are not oldest first");

/** One order in the account's list (OrderTable): what a row shows, and the order's page. */
export const OrderListItem = z.object({
  id: Id,
  displayId: z.int().positive(),
  placedAt: IsoDateTime,
  status: OrderEvent.shape.kind.describe("The latest event: what the customer reads as its state"),
  itemCount: z.int().positive(),
  total: Money,
  href: Href,
});

/** The account's orders (OrderTable), newest first. */
export const OrderTable = z
  .object({
    orders: z.array(OrderListItem),
    shopHref: Href.describe("Where a customer with no orders goes: the shop"),
  })
  .refine((table) => uniqueIds(table.orders), "an order is listed twice")
  .refine((table) => {
    const times = table.orders.map((order) => Date.parse(order.placedAt));
    return times.every((time, index) => index === 0 || time <= times[index - 1]!);
  }, "the orders are not newest first");

/** A saved address in the book, with the page that edits it. */
export const AddressBookEntry = z.object({
  address: Address.required({ id: true }),
  editHref: Href,
});

/** The account's address book (AddressBook): the addresses, and the page that adds one. */
export const AddressBook = z
  .object({ entries: z.array(AddressBookEntry), addHref: Href })
  .refine(
    (book) => uniqueIds(book.entries.map((entry) => entry.address)),
    "an address is listed twice",
  )
  .refine(
    (book) => book.entries.filter((entry) => entry.address.isDefaultShipping).length <= 1,
    "two addresses are the default for shipping",
  )
  .refine(
    (book) => book.entries.filter((entry) => entry.address.isDefaultBilling).length <= 1,
    "two addresses are the default for billing",
  );

/** The account's saved cards (PaymentMethodsManager), and the page that adds one (M6's Stripe). */
export const PaymentMethodsManager = z
  .object({
    cards: z.array(SavedPaymentMethod),
    addHref: Href.optional().describe("Where a card is added; none: the shop cannot add one yet"),
  })
  .refine((wallet) => uniqueIds(wallet.cards), "a card is listed twice")
  .refine(
    (wallet) => wallet.cards.filter((card) => card.isDefault).length <= 1,
    "two cards are the default",
  );

/** A line of an order that can be sent back: what was bought, and how many may still be returned. */
export const ReturnItem = z
  .object({
    id: Id.describe("The order line's id"),
    title: z.string().min(1),
    image: Image.optional(),
    options: z.array(LineOption),
    quantity: z.int().positive().describe("How many were bought"),
    returnable: z.int().nonnegative().describe("How many may still be returned"),
    quantityChosen: z.int().nonnegative().describe("What the form holds: 0 at first"),
  })
  .refine((item) => item.returnable <= item.quantity, {
    message: "more may be returned than were bought",
    path: ["returnable"],
  })
  .refine((item) => item.quantityChosen <= item.returnable, {
    message: "more are chosen than may be returned",
    path: ["quantityChosen"],
  });

/** The return form (ReturnRequestForm): the order, its lines, the shop's reasons, and the form's values. */
export const ReturnRequest = z
  .object({
    orderId: Id,
    displayId: z.int().positive(),
    items: z.array(ReturnItem).min(1),
    reasons: z
      .array(z.object({ id: Id, label: z.string().min(1) }))
      .min(1)
      .describe("Medusa's return reasons, as the shop wrote them"),
    reason: Id.optional().describe("The reason chosen; none at first"),
    note: z.string().max(500).describe("What the customer wrote: empty at first"),
  })
  .refine((request) => uniqueIds(request.items), "a line is listed twice")
  .refine((request) => uniqueIds(request.reasons), "a reason is listed twice")
  .refine(
    (request) =>
      request.reason === undefined || request.reasons.some((each) => each.id === request.reason),
    "the reason chosen is not one of the shop's",
  )
  .refine(
    (request) => request.items.some((item) => item.returnable > 0),
    "nothing on the order can be returned",
  );

export type CartDrawer = z.infer<typeof CartDrawer>;
export type QuickCart = z.infer<typeof QuickCart>;
export type SummaryItem = z.infer<typeof SummaryItem>;
export type OrderSummary = z.infer<typeof OrderSummary>;
export type CheckoutSteps = z.infer<typeof CheckoutSteps>;
export type PaymentStep = z.infer<typeof PaymentStep>;
export type AccountNav = z.infer<typeof AccountNav>;
export type OrderTimeline = z.infer<typeof OrderTimeline>;
export type OrderListItem = z.infer<typeof OrderListItem>;
export type OrderTable = z.infer<typeof OrderTable>;
export type AddressBookEntry = z.infer<typeof AddressBookEntry>;
export type AddressBook = z.infer<typeof AddressBook>;
export type PaymentMethodsManager = z.infer<typeof PaymentMethodsManager>;
export type ReturnItem = z.infer<typeof ReturnItem>;
export type ReturnRequest = z.infer<typeof ReturnRequest>;
