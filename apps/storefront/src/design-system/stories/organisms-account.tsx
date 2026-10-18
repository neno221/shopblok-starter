// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D41, D48). The
// stories of AccountNav, OrderTimeline, OrderTable, AddressBook, PaymentMethodsManager and
// ReturnRequestForm. Sample data is `commerceFixtures[ctx.locale].account` (the account's six pages,
// the delivered order's history and the paid one's, the two orders newest first and none, the four
// addresses and none, the three cards and none, the delivered order's return blank and filled in),
// the copy is `catalogs[ctx.locale]`, and the locale every `Intl` call uses is the market's
// `<html lang>`. Every link is drawn with `prefetch={false}`: the account's pages answer 404 until
// M3. Every form takes `action="#"`, which a browser posts to the page itself, and the DS never
// submits one. `now` is the fixtures' fixed time (D50).
//
// All six are server components but for the saved card's confirmation (the molecule's own), so a
// state is drawn as the page would draw it, and what is in flight is a prop (`pending`, `status`).
// Landmarks are named apart: a page of states has several navigations, lists and forms, so a
// state's names carry its label in brackets (`named`), as the headers' and the banners' do; the live
// renders keep the catalog's own names. A state's headings sit under its own `h3`.
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  AccountNav as AccountNavContent,
  AddressBook as AddressBookContent,
  OrderTable as OrderTableContent,
  OrderTimeline as OrderTimelineContent,
  PaymentMethodsManager as ManagerContent,
  ReturnRequest,
} from "@shopblok/registry/contracts";
import { AccountNav, type AccountNavProps } from "@shopblok/ui/organisms/account-nav";
import { AddressBook, type AddressBookProps } from "@shopblok/ui/organisms/address-book";
import { OrderTable, type OrderTableProps } from "@shopblok/ui/organisms/order-table";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import {
  PaymentMethodsManager,
  type PaymentMethodsManagerProps,
} from "@shopblok/ui/organisms/payment-methods-manager";
import {
  ReturnRequestForm,
  type ReturnRequestFormProps,
} from "@shopblok/ui/organisms/return-request-form";
import type { DsContext, DsState, DsStory } from "../types";

const account = (ctx: DsContext) => commerceFixtures[ctx.locale].account;
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;
/** A name with the state's label in brackets, so two states' landmarks are named apart. */
const named = (name: string, state?: string) => (state === undefined ? name : `${name} (${state})`);

// --- AccountNav ---

function nav(
  ctx: DsContext,
  content: AccountNavContent,
  options: { state?: string; words?: Partial<AccountNavProps["copy"]>; signOut?: boolean } = {},
) {
  const copy = { ...messages(ctx).organisms.accountNav, ...options.words };
  return (
    <div className="w-full max-w-xs">
      <AccountNav
        {...content}
        copy={copy}
        label={named(copy.label, options.state)}
        {...(options.signOut === false ? {} : { signOutAction: "#" })}
        prefetch={false}
      />
    </div>
  );
}

const accountNavStates: readonly DsState[] = [
  {
    id: "orders",
    label: "On the orders",
    description:
      'The customer is on their orders: that link is marked aria-current="page" and drawn in bold on a filled background.',
    render: (ctx) => nav(ctx, account(ctx).nav, { state: "On the orders" }),
  },
  {
    id: "overview",
    label: "On the overview",
    description: "The mark follows the page: here it is the overview's.",
    render: (ctx) =>
      nav(ctx, { ...account(ctx).nav, current: "overview" }, { state: "On the overview" }),
  },
  {
    id: "no-sign-out",
    label: "No sign-out",
    description: "With no sign-out action there is no button: the pages alone.",
    render: (ctx) => nav(ctx, account(ctx).nav, { state: "No sign-out", signOut: false }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long names for every page and for “Sign out”: each wraps inside its pill or row, and nothing scrolls sideways.",
    render: (ctx) => {
      const { linkLabel, chipLabel, action } = ctx.fixture.long;
      const content = account(ctx).nav;
      return nav(
        ctx,
        {
          ...content,
          items: content.items.map((item, index) => ({
            ...item,
            label: index % 2 === 0 ? linkLabel : chipLabel,
          })),
        },
        { state: "Long labels", words: { signOut: action } },
      );
    },
  },
];

// --- OrderTimeline ---

function timeline(
  ctx: DsContext,
  content: OrderTimelineContent,
  options: { state?: string; words?: Partial<ReturnType<typeof timelineCopy>> } = {},
) {
  const copy = { ...timelineCopy(ctx), ...options.words };
  return (
    <div className="w-full max-w-md">
      <OrderTimeline
        {...content}
        copy={copy}
        locale={lang(ctx)}
        label={named(copy.label, options.state)}
      />
    </div>
  );
}
const timelineCopy = (ctx: DsContext) => messages(ctx).organisms.orderTimeline;

const orderTimelineStates: readonly DsState[] = [
  {
    id: "delivered",
    label: "Delivered",
    description:
      "Five events, oldest first: placed, paid, packed, shipped with its carrier, number and tracking link, and delivered, the latest, marked and filled.",
    render: (ctx) => timeline(ctx, account(ctx).timeline.delivered, { state: "Delivered" }),
  },
  {
    id: "paid",
    label: "Paid",
    description: "A new order: placed, then paid, which is its state for now.",
    render: (ctx) => timeline(ctx, account(ctx).timeline.placed, { state: "Paid" }),
  },
  {
    id: "canceled",
    label: "Canceled",
    description:
      "An order canceled after it was paid: the last event says so in words, in the destructive colour, and is the order's state.",
    render: (ctx) => {
      const { events } = account(ctx).timeline.placed;
      return timeline(
        ctx,
        { events: [...events, { kind: "canceled", at: "2026-09-30T08:15:00.000Z" }] },
        { state: "Canceled" },
      );
    },
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "A long carrier and long words for the events and the link: they wrap beside the line, and the dates keep their place.",
    render: (ctx) => {
      const { storeName, linkLabel, badge } = ctx.fixture.long;
      const copy = timelineCopy(ctx);
      return timeline(
        ctx,
        {
          events: account(ctx).timeline.delivered.events.map((event) =>
            event.kind === "shipped" ? { ...event, carrier: storeName } : event,
          ),
        },
        {
          state: "Long labels",
          words: { track: linkLabel, events: { ...copy.events, delivered: badge } },
        },
      );
    },
  },
];

// --- OrderTable ---

function table(
  ctx: DsContext,
  content: OrderTableContent,
  options: { state?: string; words?: Partial<OrderTableProps["copy"]> } = {},
) {
  const copy = { ...messages(ctx).organisms.orderTable, ...options.words };
  return (
    <OrderTable
      {...content}
      copy={copy}
      locale={lang(ctx)}
      label={named(copy.caption, options.state)}
      headingLevel={options.state === undefined ? 3 : 4}
      prefetch={false}
    />
  );
}

const orderTableStates: readonly DsState[] = [
  {
    id: "orders",
    label: "Two orders",
    description:
      "From md a table: the number heads its row, then the date, the state in a badge, the items, the total and View. Below md the same orders are cards.",
    render: (ctx) => table(ctx, account(ctx).orders.list, { state: "Two orders" }),
  },
  {
    id: "many",
    label: "Many orders",
    description:
      "Six orders, one in each state the table writes: the badges say it in words, and a canceled one is in the destructive colour.",
    render: (ctx) => {
      const [first, second] = account(ctx).orders.list.orders;
      if (first === undefined || second === undefined) return null;
      const kinds = [
        "shipped",
        "fulfilled",
        "return-requested",
        "returned",
        "canceled",
        "placed",
      ] as const;
      return table(
        ctx,
        {
          ...account(ctx).orders.list,
          orders: kinds.map((status, index) => ({
            ...(index % 2 === 0 ? first : second),
            id: `order_${1100 - index}`,
            displayId: 1100 - index,
            placedAt: new Date(Date.parse(first.placedAt) - index * 86_400_000 * 9).toISOString(),
            status,
          })),
        },
        { state: "Many orders" },
      );
    },
  },
  {
    id: "empty",
    label: "No orders",
    description: "No order yet: it says so and links to the shop.",
    render: (ctx) => table(ctx, account(ctx).orders.empty, { state: "No orders" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long column names, states and links: the table's cells wrap, a total stays on one line, and the cards wrap below md.",
    render: (ctx) => {
      const { fieldLabel, badge, action, chipLabel } = ctx.fixture.long;
      const copy = messages(ctx).organisms.orderTable;
      return table(ctx, account(ctx).orders.list, {
        state: "Long labels",
        words: {
          status: fieldLabel,
          items: chipLabel,
          view: action,
          viewLabel: `${action} #{number}`,
          statuses: { ...copy.statuses, delivered: badge, paid: badge },
        },
      });
    },
  },
];

// --- AddressBook ---

function book(
  ctx: DsContext,
  content: AddressBookContent,
  options: {
    state?: string;
    words?: Partial<AddressBookProps["copy"]["book"]>;
  } & Partial<AddressBookProps> = {},
) {
  const { state, words, ...rest } = options;
  const m = messages(ctx);
  const copy = { ...m.organisms.addressBook, ...words };
  return (
    <AddressBook
      {...content}
      copy={{ book: copy, card: m.molecules.addressCard }}
      locale={lang(ctx)}
      label={named(copy.list, state)}
      removeAction="#"
      defaultAction="#"
      headingLevel={state === undefined ? 3 : 4}
      prefetch={false}
      {...rest}
    />
  );
}

const addressBookStates: readonly DsState[] = [
  {
    id: "full",
    label: "Four addresses",
    description:
      "Each in its country's format with its marks, edit link and remove button; “Set as default” under the three that are not the default; the add tile last.",
    render: (ctx) => book(ctx, account(ctx).addressBook.full, { state: "Four addresses" }),
  },
  {
    id: "saving",
    label: "Making one the default",
    description:
      "The third address is being made the default: its button says “Saving…”, aria-disabled, and a polite region says so.",
    render: (ctx) => {
      const content = account(ctx).addressBook.full;
      return book(ctx, content, {
        state: "Making one the default",
        pending: { addressId: content.entries[2]?.address.id ?? "", action: "default" },
      });
    },
  },
  {
    id: "removing",
    label: "Removing one",
    description:
      "The second address is being removed: its remove button says “Removing…” and is held.",
    render: (ctx) => {
      const content = account(ctx).addressBook.full;
      return book(ctx, content, {
        state: "Removing one",
        pending: { addressId: content.entries[1]?.address.id ?? "", action: "remove" },
      });
    },
  },
  {
    id: "empty",
    label: "No address",
    description: "No saved address: it says so and links to add one.",
    render: (ctx) => book(ctx, account(ctx).addressBook.empty, { state: "No address" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long words for the add tile and the default button: they wrap inside them, and nothing is cut.",
    render: (ctx) => {
      const { linkLabel, action } = ctx.fixture.long;
      return book(ctx, account(ctx).addressBook.full, {
        state: "Long labels",
        words: { add: linkLabel, makeDefault: action },
      });
    },
  },
];

// --- PaymentMethodsManager ---

function wallet(
  ctx: DsContext,
  content: ManagerContent,
  options: {
    state?: string;
    words?: Partial<PaymentMethodsManagerProps["copy"]["manager"]>;
  } & Partial<PaymentMethodsManagerProps> = {},
) {
  const { state, words, ...rest } = options;
  const m = messages(ctx);
  const copy = { ...m.organisms.paymentMethodsManager, ...words };
  return (
    <PaymentMethodsManager
      {...content}
      copy={{ manager: copy, card: m.molecules.savedPaymentMethodCard, brands: m.atoms.payment }}
      locale={lang(ctx)}
      now={fixtureNow}
      label={named(copy.list, state)}
      removeAction="#"
      defaultAction="#"
      headingLevel={state === undefined ? 3 : 4}
      prefetch={false}
      {...rest}
    />
  );
}

const paymentMethodsStates: readonly DsState[] = [
  {
    id: "cards",
    label: "Three cards",
    description:
      "The default Visa and two others, each with its expiry and Remove; “Set as default” under the two that are not the default; the add tile last.",
    render: (ctx) => wallet(ctx, account(ctx).paymentMethods.cards, { state: "Three cards" }),
  },
  {
    id: "expired",
    label: "An expired card",
    description:
      "The Mastercard expired the month before: it says so in words with an icon, and can still be removed or made the default.",
    render: (ctx) => {
      const content = account(ctx).paymentMethods.cards;
      return wallet(
        ctx,
        {
          ...content,
          cards: content.cards.map((card, index) =>
            index === 1 ? { ...card, expiryMonth: 9, expiryYear: 2026 } : card,
          ),
        },
        { state: "An expired card" },
      );
    },
  },
  {
    id: "saving",
    label: "Making one the default",
    description:
      "The Mastercard is being made the default: its button says “Saving…”, aria-disabled, and a polite region says so.",
    render: (ctx) => {
      const content = account(ctx).paymentMethods.cards;
      return wallet(ctx, content, {
        state: "Making one the default",
        pending: { paymentMethodId: content.cards[1]?.id ?? "", action: "default" },
      });
    },
  },
  {
    id: "no-add",
    label: "No way to add",
    description:
      "A shop that cannot add a card here (no provider yet): the list alone, with no add tile.",
    render: (ctx) => {
      const { addHref: _add, ...content } = account(ctx).paymentMethods.cards;
      return wallet(ctx, content, { state: "No way to add" });
    },
  },
  {
    id: "empty",
    label: "No card",
    description: "No saved card: it says so and links to add one.",
    render: (ctx) => wallet(ctx, account(ctx).paymentMethods.empty, { state: "No card" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long words for the add tile and the default button: they wrap inside them, and nothing is cut.",
    render: (ctx) => {
      const { linkLabel, action } = ctx.fixture.long;
      return wallet(ctx, account(ctx).paymentMethods.cards, {
        state: "Long labels",
        words: { add: linkLabel, makeDefault: action },
      });
    },
  },
];

// --- ReturnRequestForm ---

function returnForm(
  ctx: DsContext,
  content: ReturnRequest,
  options: {
    state?: string;
    words?: Partial<ReturnRequestFormProps["copy"]>;
  } & Partial<ReturnRequestFormProps> = {},
) {
  const { state, words, ...rest } = options;
  const copy = { ...messages(ctx).organisms.returnRequestForm, ...words };
  return (
    <div className="w-full max-w-xl">
      <ReturnRequestForm
        {...content}
        copy={{ ...copy, label: named(copy.label, state) }}
        locale={lang(ctx)}
        action="#"
        {...rest}
      />
    </div>
  );
}

const returnRequestStates: readonly DsState[] = [
  {
    id: "blank",
    label: "Blank",
    description:
      "The delivered order's two lines, nothing chosen: each says how many may be returned and has its quantity, then the reason and the note.",
    render: (ctx) => returnForm(ctx, account(ctx).returnRequest.blank, { state: "Blank" }),
  },
  {
    id: "filled",
    label: "Filled in",
    description: "One of the two tees, too small, with a note.",
    render: (ctx) => returnForm(ctx, account(ctx).returnRequest.filled, { state: "Filled in" }),
  },
  {
    id: "returned",
    label: "A line returned",
    description:
      "The hoodie was returned already: its line says so and its select is disabled, and the tee can still be sent back.",
    render: (ctx) => {
      const content = account(ctx).returnRequest.blank;
      return returnForm(
        ctx,
        {
          ...content,
          items: content.items.map((item, index) =>
            index === 0 ? { ...item, returnable: 0 } : item,
          ),
        },
        { state: "A line returned" },
      );
    },
  },
  {
    id: "errors",
    label: "Errors",
    description:
      "Sent with nothing chosen: each error is beside its field, the fields are invalid and described by it, and the status region says how many need attention.",
    render: (ctx) =>
      returnForm(ctx, account(ctx).returnRequest.blank, {
        state: "Errors",
        errors: { items: "required", reason: "required" },
      }),
  },
  {
    id: "failed",
    label: "Not sent",
    description:
      "The server could not take the request: the status region says so, and the values stay as they were sent.",
    render: (ctx) =>
      returnForm(ctx, account(ctx).returnRequest.filled, { state: "Not sent", status: "error" }),
  },
  {
    id: "sending",
    label: "Sending",
    description:
      "The request is on its way: the button says “Sending…” with a spinner, is aria-disabled and stays focusable, and the form cannot be sent twice.",
    render: (ctx) =>
      returnForm(ctx, account(ctx).returnRequest.filled, { state: "Sending", status: "pending" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "The longest title on both lines, a long reason and long words for the fieldset, the reason's label and the submit: they wrap, and nothing is cut.",
    render: (ctx) => {
      const { productName, fieldLabel, hint, optionLabel, action } = ctx.fixture.long;
      const content = account(ctx).returnRequest.blank;
      return returnForm(
        ctx,
        {
          ...content,
          items: content.items.map((item) => ({ ...item, title: productName })),
          reasons: [{ id: "rr_long", label: optionLabel }, ...content.reasons],
        },
        { state: "Long labels", words: { items: fieldLabel, reason: hint, submit: action } },
      );
    },
  },
];

export const accountOrganismStories = {
  "organisms/account-nav": {
    summary:
      "The account's navigation: its pages, the one the customer is on marked, and “Sign out” as a form.",
    a11y: [
      'A navigation named “Account” around a list of links; the page the customer is on is marked aria-current="page" and drawn in bold on a filled background, by weight and fill, not colour alone.',
      "“Sign out” is the submit of a small form of its own that posts: signing out changes state, so it is never a link that a crawler or a prefetch could follow.",
      "From md it is a column beside the page; below it the pages wrap as a row of 44 px pills above the page, so every page is one tap away and nothing scrolls sideways. Tab goes through the pages in order, then “Sign out”.",
      "Every link and the button are at least 44 px, the ring is at full strength, and long names wrap (wrap-anywhere) inside their pills.",
    ],
    live: (ctx) => nav(ctx, account(ctx).nav),
    states: accountNavStates,
  },
  "organisms/order-timeline": {
    summary:
      "An order's history, oldest first: each event in words with its date, the shipment's carrier and tracking, and the latest marked as the order's state.",
    a11y: [
      "An ordered list named “Order history”, one item per event, in words (“Order placed”, “Shipped”, “Delivered”), each with its date and time as a time element with its ISO value, written in the market's locale in UTC so the server and every reader agree.",
      "The latest event is the order's state: it is marked aria-current=\"step\" and carries a “Latest” badge, and its dot is filled. A canceled order's last event says so in words in the destructive colour, never colour alone.",
      "A shipment says its carrier and tracking number, and “Track parcel” is a 44 px link to the carrier's page that opens a new tab and says so, with the number after its words for a screen reader.",
      "Long carriers and words wrap (wrap-anywhere) beside the line, and nothing is cut.",
    ],
    live: (ctx) => timeline(ctx, account(ctx).timeline.delivered),
    states: orderTimelineStates,
  },
  "organisms/order-table": {
    summary:
      "The account's orders, newest first: a table from md, the same orders as cards below it, and a link to each order.",
    a11y: [
      "From md a table with a caption (“Your orders”), column headers with scope, and each order's number as its row's header, so a screen reader names a cell by its order and its column. The last column's header (“Details”) is read and not drawn.",
      "Below md six columns do not fit, so the same orders are a list of cards: the order as a heading, then the date, the items and the total as a description list, then the link. Only one of the two is ever displayed, so a reader meets each order once.",
      "“View” is a 44 px link named for its order (“View order #1042”), the visible word first (WCAG 2.5.3). The state is a badge in words (“Delivered”), never colour alone; the number is written as it is, with no grouping; the total is in the market's currency and stays on one line.",
      "With no orders it says so and links to the shop. Long names wrap in the cells and the cards, and the table scrolls sideways inside its own box only if a column cannot wrap; its links are focusable in it.",
    ],
    live: (ctx) => table(ctx, account(ctx).orders.list),
    states: orderTableStates,
    statesLayout: "stack",
  },
  "organisms/address-book": {
    summary:
      "The account's saved addresses as cards, with “Set as default” under each that is not, and a tile that adds one.",
    a11y: [
      "A list named “Saved addresses” of AddressCards: each address in its country's format, its default marks in words, an edit link and a remove form, both named for the address.",
      "“Set as default” is the submit of a small form of its own that posts the address's id, named for its address (“Set as default: Lena Hartmann, Berlin”), the visible words first (WCAG 2.5.3).",
      "What is in flight holds that address's buttons: the default button says “Saving…”, is aria-disabled and stays focusable, and a polite region that is always there says so; the card's own remove button says “Removing…”. Nothing is sent twice.",
      "The last tile, “Add a new address”, is a 44 px link with a dashed border. With no address the book says so and links to add one. Long words wrap (wrap-anywhere), one or two columns by the room there is.",
    ],
    live: (ctx) => book(ctx, account(ctx).addressBook.full),
    states: addressBookStates,
    statesLayout: "stack",
  },
  "organisms/payment-methods-manager": {
    summary:
      "The account's saved cards, with “Set as default” under each that is not, removal with a confirmation, and a tile that adds one.",
    a11y: [
      "A list named “Saved payment methods” of SavedPaymentMethodCards: each an article named “Visa ending in 4242”, its expiry in words judged against the caller's now, “Default” in words, and Remove, which asks in a dialog before it posts.",
      "“Set as default” is the submit of a small form of its own that posts the card's id, named for its card (“Set as default: Mastercard ending in 4444”), the visible words first (WCAG 2.5.3). While it is sent it says “Saving…”, is aria-disabled and stays focusable, and a polite region that is always there says so.",
      "The add tile is drawn only when the shop can add a card here, and is a 44 px link. With no card the list says so, with the add link when there is one.",
      "Every control is at least 44 px, the ring is at full strength, and long words wrap (wrap-anywhere).",
    ],
    live: (ctx) => wallet(ctx, account(ctx).paymentMethods.cards),
    states: paymentMethodsStates,
    statesLayout: "stack",
  },
  "organisms/return-request-form": {
    summary:
      "A return as one plain form: the order's lines with how many of each to send back, a reason and an optional note.",
    a11y: [
      "One form that posts without JavaScript, named for its order (“Return items from order #1042”), with the order's id hidden. A fieldset named “Items to return” holds each line: its picture (decoration), title, options, how many may be returned, and a native select of the quantity, 0 to that number.",
      "Each select is labelled “Quantity to return” followed by its line's name for a screen reader, so a list of selects never sounds alike. A line already returned says so and its select is disabled.",
      "The reason is a required native select of the shop's reasons, and the note says it is optional in its label and its limit under it (500 characters), tied by aria-describedby.",
      "An error is a sentence beside its field or fieldset, which is invalid and described by it, the values stay as they were sent, and one polite status region that is always in the form says how many fields need attention or that the request could not be sent (WCAG 3.3.1 to 3.3.3).",
      "While it is sent the button says “Sending…”, is aria-disabled and stays focusable, and the form cannot be sent twice. Every control is at least 44 px and long words wrap (wrap-anywhere).",
    ],
    live: (ctx) => returnForm(ctx, account(ctx).returnRequest.blank),
    states: returnRequestStates,
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
