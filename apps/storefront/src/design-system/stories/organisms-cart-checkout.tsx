// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D41, D44, D45, D49).
// The stories of CartDrawer, QuickCartDropdown, CheckoutSteps, PaymentStep and OrderSummary. Sample
// data is `commerceFixtures[ctx.locale].cartCheckout` (the cart drawer full and empty, the dropdown
// after the socks were added, the three checkout steps, the payment step for a customer with saved
// cards, for a guest and with no provider, the cart's and a placed order's summary), the copy is
// `catalogs[ctx.locale]`, and the locale every `Intl` call uses is the market's `<html lang>`.
// Every link is drawn with `prefetch={false}`: the shop's pages answer 404 until M3. Every form takes
// `action="#"`, which a browser posts to the page itself, and the DS never submits one. `now` is the
// fixtures' fixed time (D50).
//
// The drawer and the dropdown are modal, so their live renders are the closed buttons, which the
// interaction checks press. The open states are drawn inside an `OverlayBox` (D45) with the
// component's own way of starting open (`defaultOpen`, `modal={false}`, so several fit on one page
// and the rest of the frame stays usable), and still (`duration-0`): no state is a picture of an
// animation. The dropdown's popup is capped (`max-h-[26rem]`): Base UI sizes it by the room the
// window leaves under its button (`--available-height`), which is negative for a box below the
// fold (T35's pitfall), so the cap holds it in its box and it scrolls inside the cap.
//
// Landmarks and dialogs are named apart. A page of states has several drawers, dropdowns, steppers
// and summaries, and two named alike confuse a screen-reader user, so a state's names carry its
// label in brackets (`named`), as the headers' and the banners' do; the live renders keep the
// catalog's own names. A state's headings sit under its own `h3`: the checkout's title is an `h4`
// there and an `h3` in the live render (under the section's `h2`). The checkout's step is the page's
// slot: the delivery step holds PaymentStep, and the other two hold a note in the design system's
// own words (English), since their forms are other entries'.
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  CartDrawer as CartDrawerContent,
  CheckoutSteps as CheckoutStepsContent,
  OrderSummary as OrderSummaryContent,
  PaymentStep as PaymentStepContent,
  QuickCart,
} from "@shopblok/registry/contracts";
import { CartDrawer, type CartDrawerProps } from "@shopblok/ui/organisms/cart-drawer";
import { CheckoutSteps, type CheckoutStepsProps } from "@shopblok/ui/organisms/checkout-steps";
import { OrderSummary, type OrderSummaryProps } from "@shopblok/ui/organisms/order-summary";
import { PaymentStep, type PaymentStepProps } from "@shopblok/ui/organisms/payment-step";
import {
  QuickCartDropdown,
  type QuickCartDropdownProps,
} from "@shopblok/ui/organisms/quick-cart-dropdown";
import type { ReactNode } from "react";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const samples = (ctx: DsContext) => commerceFixtures[ctx.locale].cartCheckout;
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;
/** A name with the state's label in brackets, so two states' landmarks are named apart. */
const named = (name: string, state?: string) => (state === undefined ? name : `${name} (${state})`);

/** The sheet in a state: as tall as its box already, and it does not slide in. */
const stillSheet = "duration-0";
/** The popover in a state: capped to its box (the window's room means nothing inside it), still. */
const stillPopover = "max-h-[26rem] duration-0";

// --- CartDrawer ---

type DrawerCopy = CartDrawerProps["copy"];

function drawerCopy(ctx: DsContext, state?: string, words: Partial<DrawerCopy["drawer"]> = {}) {
  const m = messages(ctx);
  const drawer = { ...m.organisms.cartDrawer, ...words };
  return {
    drawer: { ...drawer, title: named(drawer.title, state) },
    line: m.molecules.cartLineItem,
    promo: m.molecules.promoCodeField,
    freeShipping: m.molecules.freeShippingProgress,
    rows: m.molecules.orderSummaryRow,
  } satisfies DrawerCopy;
}

function drawer(
  ctx: DsContext,
  content: CartDrawerContent,
  options: {
    state?: string;
    words?: Partial<DrawerCopy["drawer"]>;
  } & Partial<CartDrawerProps> = {},
) {
  const { state, words, ...rest } = options;
  return (
    <CartDrawer
      {...content}
      copy={drawerCopy(ctx, state, words)}
      locale={lang(ctx)}
      updateAction="#"
      removeAction="#"
      applyCodeAction="#"
      removeCodeAction="#"
      prefetch={false}
      {...rest}
    />
  );
}

function drawerOpen(
  ctx: DsContext,
  spec: {
    label: string;
    height: number;
    content: CartDrawerContent;
    words?: Partial<DrawerCopy["drawer"]>;
  } & Partial<CartDrawerProps>,
) {
  const { label, height, content, words, ...rest } = spec;
  return (
    <OverlayBox name={label} height={height}>
      <div className="flex justify-end p-4">
        {drawer(ctx, content, {
          state: label,
          words,
          defaultOpen: true,
          modal: false,
          popupClassName: stillSheet,
          ...rest,
        })}
      </div>
    </OverlayBox>
  );
}

/** The cart with the locale's longest title on every line. */
function longCart(ctx: DsContext): CartDrawerContent {
  const full = samples(ctx).drawer.full;
  const { productName } = ctx.fixture.long;
  return {
    ...full,
    cart: { ...full.cart, lines: full.cart.lines.map((line) => ({ ...line, title: productName })) },
  };
}

const cartDrawerStates: readonly DsState[] = [
  {
    id: "open",
    label: "Open",
    description:
      "Three lines with their steppers and remove buttons, the bar to free shipping, the applied code, then the foot: the subtotal, the discount with its code, the total, the note, Checkout and View cart.",
    render: (ctx) =>
      drawerOpen(ctx, { label: "Open", height: 900, content: samples(ctx).drawer.full }),
  },
  {
    id: "empty",
    label: "Empty",
    description:
      "No line: the button says “Cart, empty” and has no badge, and the sheet says the cart is empty and links on to the shop. There is no foot, since there is nothing to pay for.",
    render: (ctx) =>
      drawerOpen(ctx, { label: "Empty", height: 480, content: samples(ctx).drawer.empty }),
  },
  {
    id: "line-updating",
    label: "A line updating",
    description:
      "The first line's quantity is on its way to the cart: that line's controls are held until the cart answers, and the others can still be changed.",
    render: (ctx) => {
      const content = samples(ctx).drawer.full;
      return drawerOpen(ctx, {
        label: "A line updating",
        height: 900,
        content,
        pendingLineId: content.cart.lines[0]?.id,
      });
    },
  },
  {
    id: "code-refused",
    label: "Code refused",
    description:
      "A code the cart refused: the field keeps it and says why, beside it, in the promotion field's status region.",
    render: (ctx) =>
      drawerOpen(ctx, {
        label: "Code refused",
        height: 900,
        content: { ...samples(ctx).drawer.full, promoCode: "SPRING" },
        promoError: "expired",
      }),
  },
  {
    id: "many",
    label: "Many items",
    description:
      "The button of a cart with 120 items: the badge says 99+, and the name says 120 items.",
    render: (ctx) => {
      const full = samples(ctx).drawer.full;
      return drawer(
        ctx,
        { ...full, cart: { ...full.cart, itemCount: 120 } },
        { state: "Many items" },
      );
    },
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "The longest title on every line and long words for the title, the note and the two links: they wrap, the links stack when they do not fit side by side, and only a line's title is clamped to two lines (its link's name is whole).",
    render: (ctx) => {
      const { fieldLabel, helpText, action, linkLabel } = ctx.fixture.long;
      return drawerOpen(ctx, {
        label: "Long labels",
        height: 1000,
        content: longCart(ctx),
        words: { title: fieldLabel, note: helpText, checkout: action, viewCart: linkLabel },
      });
    },
  },
];

// --- QuickCartDropdown ---

function quickCopy(
  ctx: DsContext,
  state?: string,
  words: Partial<QuickCartDropdownProps["copy"]> = {},
): QuickCartDropdownProps["copy"] {
  const all = { ...messages(ctx).organisms.quickCartDropdown, ...words };
  return { ...all, title: named(all.title, state) };
}

function quickOpen(
  ctx: DsContext,
  spec: {
    label: string;
    height: number;
    content: QuickCart;
    words?: Partial<QuickCartDropdownProps["copy"]>;
  },
) {
  const { label, height, content, words } = spec;
  return (
    <OverlayBox name={label} height={height}>
      <div className="flex justify-end p-4">
        <QuickCartDropdown
          {...content}
          copy={quickCopy(ctx, label, words)}
          locale={lang(ctx)}
          prefetch={false}
          defaultOpen
          modal={false}
          popupClassName={stillPopover}
        />
      </div>
    </OverlayBox>
  );
}

const quickCartStates: readonly DsState[] = [
  {
    id: "open",
    label: "Just added",
    description:
      "Under the cart button: “Added to your cart” with a check, the socks as the cart now has them (two, with their colour and size and the line's total), the subtotal of all four items, Checkout and View cart.",
    render: (ctx) =>
      quickOpen(ctx, { label: "Just added", height: 520, content: samples(ctx).quickCart }),
  },
  {
    id: "no-picture",
    label: "No picture",
    description:
      "A product with no picture: a box of the same shape with an icon holds its place, so the words do not move.",
    render: (ctx) => {
      const { image: _image, ...added } = samples(ctx).quickCart.added;
      return quickOpen(ctx, {
        label: "No picture",
        height: 520,
        content: { ...samples(ctx).quickCart, added },
      });
    },
  },
  {
    id: "many",
    label: "Many items",
    description:
      "The cart now holds 120 items: the badge says 99+, and the subtotal says 120 items.",
    render: (ctx) =>
      quickOpen(ctx, {
        label: "Many items",
        height: 520,
        content: { ...samples(ctx).quickCart, itemCount: 120 },
      }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "The longest title, a long option, a long heading and long links: they wrap inside the popup, which is never wider than the window, and it scrolls inside its cap when it is taller.",
    render: (ctx) => {
      const { productName, fieldLabel, optionLabel, action, linkLabel, hint } = ctx.fixture.long;
      const content = samples(ctx).quickCart;
      return quickOpen(ctx, {
        label: "Long labels",
        height: 560,
        content: {
          ...content,
          added: {
            ...content.added,
            title: productName,
            options: [{ option: fieldLabel, value: optionLabel }],
          },
        },
        words: { title: hint, checkout: action, viewCart: linkLabel },
      });
    },
  },
];

// --- OrderSummary ---

function summary(
  ctx: DsContext,
  content: OrderSummaryContent,
  options: {
    state?: string;
    words?: Partial<OrderSummaryProps["copy"]>;
  } & Partial<OrderSummaryProps> = {},
) {
  const { state, words, ...rest } = options;
  const copy = { ...messages(ctx).organisms.orderSummary, ...words };
  return (
    <div className="w-full max-w-md">
      <OrderSummary
        {...content}
        copy={{ ...copy, title: named(copy.title, state) }}
        rowCopy={messages(ctx).molecules.orderSummaryRow}
        locale={lang(ctx)}
        headingLevel={state === undefined ? 3 : 4}
        {...rest}
      />
    </div>
  );
}

const orderSummaryStates: readonly DsState[] = [
  {
    id: "collapsed",
    label: "Lines collapsed",
    description:
      "As a phone draws it at first: the toggle “Show order summary, 4 items”, then the rows. From lg the toggle is gone and the lines are always shown.",
    render: (ctx) => summary(ctx, samples(ctx).summary.cart, { state: "Lines collapsed" }),
  },
  {
    id: "open",
    label: "Lines open",
    description:
      "The toggle pressed: it says “Hide order summary” and the lines are shown, each with its picture, options, quantity and total.",
    render: (ctx) =>
      summary(ctx, samples(ctx).summary.cart, { state: "Lines open", defaultOpen: true }),
  },
  {
    id: "order",
    label: "A placed order",
    description:
      "The delivered order as its page shows it: the delivery and the tax are paid amounts, so no row is pending.",
    render: (ctx) =>
      summary(ctx, samples(ctx).summary.order, { state: "A placed order", defaultOpen: true }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "The longest title, a long option and a long heading: they wrap beside the picture, and the line's total keeps its place.",
    render: (ctx) => {
      const { productName, fieldLabel, optionLabel } = ctx.fixture.long;
      const content = samples(ctx).summary.cart;
      return summary(
        ctx,
        {
          ...content,
          items: content.items.map((item) => ({
            ...item,
            title: productName,
            options: [{ option: fieldLabel, value: optionLabel }],
          })),
        },
        { state: "Long labels", defaultOpen: true, words: { title: fieldLabel } },
      );
    },
  },
];

// --- PaymentStep ---

function paymentCopy(ctx: DsContext, words: Partial<PaymentStepProps["copy"]["step"]> = {}) {
  const m = messages(ctx);
  return {
    step: { ...m.organisms.paymentStep, ...words },
    method: m.molecules.paymentMethodCard,
    brands: m.atoms.payment,
  } satisfies PaymentStepProps["copy"];
}

/** Stripe's Payment Element (M6) as the design system draws its place: a box in DS words. */
function paymentElement(): ReactNode {
  return (
    <p lang="en" className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
      Stripe’s Payment Element goes here (M6).
    </p>
  );
}

function payment(
  ctx: DsContext,
  content: PaymentStepContent,
  props: Partial<PaymentStepProps> & { words?: Partial<PaymentStepProps["copy"]["step"]> } = {},
) {
  const { words, ...rest } = props;
  return (
    <div className="w-full max-w-lg">
      <PaymentStep
        {...content}
        copy={paymentCopy(ctx, words)}
        locale={lang(ctx)}
        now={fixtureNow}
        action="#"
        paymentElement={paymentElement()}
        {...rest}
      />
    </div>
  );
}

/** The customer's cards, the second one expired the month before the fixed now. */
function withExpired(ctx: DsContext): PaymentStepContent {
  const content = samples(ctx).payment.saved;
  return {
    ...content,
    saved: content.saved.map((card, index) =>
      index === 1 ? { ...card, expiryMonth: 9, expiryYear: 2026 } : card,
    ),
  };
}

const paymentStepStates: readonly DsState[] = [
  {
    id: "saved",
    label: "Saved cards",
    description:
      "A customer with three saved cards: they come first, the default chosen, then the region's other ways to pay. A saved card needs no card details.",
    render: (ctx) => payment(ctx, samples(ctx).payment.saved),
  },
  {
    id: "card-chosen",
    label: "A new card",
    description:
      "The card method chosen: the box under the group shows the place of Stripe’s Payment Element (M6) and “Save this card for next time”, by CSS, before any script runs.",
    render: (ctx) => {
      const content = samples(ctx).payment.saved;
      const card = content.methods.find((method) => method.kind === "card");
      return payment(ctx, { ...content, ...(card === undefined ? {} : { selected: card.id }) });
    },
  },
  {
    id: "expired",
    label: "An expired card",
    description:
      "The Mastercard expired the month before: it stays in the list, says “Expired 09/2026” in words with an icon, and cannot be chosen.",
    render: (ctx) => payment(ctx, withExpired(ctx)),
  },
  {
    id: "guest",
    label: "A guest",
    description:
      "No saved card: the region's ways to pay alone, none chosen, and no “save for next time”, since a guest has nowhere to keep a card.",
    render: (ctx) => payment(ctx, samples(ctx).payment.guest),
  },
  {
    id: "system",
    label: "No provider",
    description:
      "A region with no payment provider: the system payment (“Pay later”) is offered, chosen, so the shop can still take orders.",
    render: (ctx) => payment(ctx, samples(ctx).payment.system),
  },
  {
    id: "required",
    label: "Nothing chosen",
    description:
      "Sent with no choice: the sentence is in the status region under the group, and the fieldset is invalid and described by it.",
    render: (ctx) => payment(ctx, samples(ctx).payment.guest, { error: "required" }),
  },
  {
    id: "failed",
    label: "Not saved",
    description:
      "The server could not save the choice: the status region says so, and the choice stays.",
    render: (ctx) => payment(ctx, samples(ctx).payment.saved, { error: "failed" }),
  },
  {
    id: "pending",
    label: "Saving",
    description:
      "The choice is on its way: the button says “Saving…” with a spinner, is aria-disabled and stays focusable, and the form cannot be sent again.",
    render: (ctx) => payment(ctx, samples(ctx).payment.saved, { status: "pending" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long words for the legend, the system payment and the submit: they wrap inside the cards and the button, and nothing is cut.",
    render: (ctx) => {
      const { fieldLabel, optionLabel, helpText, action } = ctx.fixture.long;
      return payment(ctx, samples(ctx).payment.system, {
        words: {
          legend: fieldLabel,
          systemName: optionLabel,
          systemText: helpText,
          submit: action,
        },
      });
    },
  },
];

// --- CheckoutSteps ---

type StepCopy = CheckoutStepsProps["copy"];

function stepsCopy(ctx: DsContext, state?: string, title?: string): StepCopy {
  const m = messages(ctx);
  return {
    steps: { title: title ?? m.organisms.checkoutSteps.title },
    stepper: { ...m.molecules.stepper, label: named(m.molecules.stepper.label, state) },
    summary: { ...m.organisms.orderSummary, title: named(m.organisms.orderSummary.title, state) },
    rows: m.molecules.orderSummaryRow,
  };
}

/** The slot of a step whose form is another entry's: a note in the design system's words. */
function slotNote(what: string): ReactNode {
  return (
    <p lang="en" className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {what}
    </p>
  );
}

function checkout(
  ctx: DsContext,
  content: CheckoutStepsContent,
  step: ReactNode,
  options: { state?: string; title?: string; summaryOpen?: boolean } = {},
) {
  return (
    <CheckoutSteps
      {...content}
      copy={stepsCopy(ctx, options.state, options.title)}
      locale={lang(ctx)}
      headingLevel={options.state === undefined ? 3 : 4}
      prefetch={false}
      summaryOpen={options.summaryOpen}
    >
      {step}
    </CheckoutSteps>
  );
}

const checkoutStepsStates: readonly DsState[] = [
  {
    id: "contact",
    label: "Contact and address",
    description:
      "The first step: it is current (“Step 1 of 3”), the others are to come, and its slot holds the address form (AddressForm, a molecule of its own).",
    render: (ctx) =>
      checkout(
        ctx,
        samples(ctx).checkout.contact,
        slotNote("The contact and address form goes here (AddressForm)."),
        { state: "Contact and address" },
      ),
  },
  {
    id: "delivery",
    label: "Delivery and payment",
    description:
      "The second step: the first is done and a link back to it, and the slot holds PaymentStep. The summary's delivery is still to be worked out.",
    render: (ctx) =>
      checkout(ctx, samples(ctx).checkout.delivery, payment(ctx, samples(ctx).payment.saved), {
        state: "Delivery and payment",
      }),
  },
  {
    id: "review",
    label: "Review",
    description:
      "The last step: the first two are links back, and the summary has the standard delivery's price in it.",
    render: (ctx) =>
      checkout(
        ctx,
        samples(ctx).checkout.review,
        slotNote("The review and “Place order” go here (M3)."),
        { state: "Review", summaryOpen: true },
      ),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long step names, a long title and the longest product title: the stepper keeps only the current label drawn below its container's width, the headings wrap, and nothing is cut.",
    render: (ctx) => {
      const { fieldLabel, action, productName } = ctx.fixture.long;
      const content = samples(ctx).checkout.delivery;
      return checkout(
        ctx,
        {
          steps: {
            ...content.steps,
            steps: content.steps.steps.map((step) => ({ ...step, label: fieldLabel })),
          },
          summary: {
            ...content.summary,
            items: content.summary.items.map((item) => ({ ...item, title: productName })),
          },
        },
        slotNote("The step's form goes here."),
        { state: "Long labels", title: action, summaryOpen: true },
      );
    },
  },
];

export const cartCheckoutOrganismStories = {
  "organisms/cart-drawer": {
    summary:
      "The cart in a sheet from the reading end: its lines, the bar to free shipping, a promotion code, the summary and the way to the checkout.",
    a11y: [
      "The button is 44 px and named “Cart” followed by what it holds (“Cart, 4 items”, “Cart, empty”); the badge with the number is for the eye and hidden from assistive technology.",
      "It opens a modal sheet named by its title: the page behind is inert, focus starts on the close button, Tab and Shift+Tab go round the sheet and never leave it, and one Escape closes it with focus back on the button.",
      "The sheet is three boxes in a column: the title with the count beside it and the close button, a body that scrolls between them (the lines as a list named “Items in your cart”, FreeShippingProgress and PromoCodeField), and a foot that stays in view with the summary as one description list, the note, “Checkout” and “View cart”. Both links close the sheet, because the page they open is another route of the same layout.",
      "Each line is CartLineItem: two plain forms that work without JavaScript, the quantity and the removal, and a line being updated holds its own controls until the cart answers. An empty cart has no foot: it says so and links on to the shop.",
      "The sheet is 90 % of the screen wide, up to 28 rem, and nothing slides under prefers-reduced-motion. Every control is at least 44 px, the ring is at full strength, and long words wrap (wrap-anywhere); a line's title alone is clamped to two lines, and its link's name is whole.",
    ],
    live: (ctx) => drawer(ctx, samples(ctx).drawer.full),
    states: cartDrawerStates,
    // The sheet is 90 % of its box up to 28 rem: in a 14 rem card it would be 12 rem wide.
    statesLayout: "stack",
  },
  "organisms/quick-cart-dropdown": {
    summary:
      "What the header's cart button shows after an add: the line just added, the cart's subtotal and the two ways on, in a popover under the button.",
    a11y: [
      "The button is the cart button: 44 px, named “Cart” and what it holds (“Cart, 4 items”), the badge for the eye only. It opens a dialog named “Added to your cart”, focus goes in, Tab stays inside while it is open, and one Escape or the close button closes it with focus back on the button.",
      "One polite status region says “Added to your cart:” and the product's title each time the popover opens. It is in the page from the first render and empty, so a screen reader knows it before it speaks, and a popover drawn open at first render says nothing.",
      "The line is what the cart now has: the picture (decoration, empty alternative text, in a box of a known shape), the title, every chosen option, the quantity in words and the line's total; then the subtotal with the count. There is no quantity or remove control: those are the drawer's and the cart page's.",
      "“Checkout” and “View cart” are 44 px links that close the popover. The popup is never wider than the window allows, is capped to the room under its button and scrolls inside itself, and long words wrap (wrap-anywhere).",
    ],
    live: (ctx) => (
      <QuickCartDropdown
        {...samples(ctx).quickCart}
        copy={quickCopy(ctx)}
        locale={lang(ctx)}
        prefetch={false}
      />
    ),
    states: quickCartStates,
    statesLayout: "stack",
  },
  "organisms/checkout-steps": {
    summary:
      "The checkout's frame: its title, the stepper of the three steps, the current step's form and the order summary beside it.",
    a11y: [
      'The stepper is a navigation named “Checkout steps” around an ordered list; the current step is marked aria-current="step" and reads “Step 2 of 3:” before its name, a step done is a link back that reads “, completed” after it, and a step to come is text. Shape, weight and words tell them apart, never colour alone.',
      "The current step is a section named by its own heading (the step's name), one level under the checkout's title, and its content is the page's: the address form, the delivery and PaymentStep, the review. Each step is its own page, so the browser's back and forward walk the steps.",
      "Below lg the summary comes between the stepper and the step with its lines collapsed, so a phone reaches the form at once; from lg it is the second column and sticks to the top while the step scrolls. The order in the markup is the order on screen and the order of Tab at every width: the links back, the summary's toggle (gone from lg), the step's controls. The whole checkout works by keyboard alone.",
      "Every link and button is at least 44 px and the ring is at full strength; long step names, titles and products wrap (wrap-anywhere) and nothing is cut.",
    ],
    live: (ctx) =>
      checkout(ctx, samples(ctx).checkout.delivery, payment(ctx, samples(ctx).payment.saved)),
    states: checkoutStepsStates,
    statesLayout: "stack",
  },
  "organisms/payment-step": {
    summary:
      "The checkout's payment: the customer's saved cards, the region's ways to pay, the card details' place for Stripe and “save for next time”, in one plain form.",
    a11y: [
      "One form that posts without JavaScript, with a fieldset named “Payment” and one radio group: the saved cards first (“Your saved cards”), then the region's methods (“Other ways to pay”). Tab enters the group once and the arrow keys move the choice; every card is a 44 px label whose ring follows the radio's focus.",
      "A saved card is named in words (“Visa ending in 4242”) and described by its expiry and “Default”. An expired card stays in the list, says “Expired 09/2026” in words with an icon, and cannot be chosen. A redirect method says where it goes before it is chosen.",
      "While a method that takes a card is chosen, a box under the group holds the place of Stripe's Payment Element (M6) and, for a customer who may keep a card, “Save this card for next time”; the box follows the radio by CSS, so it works before any script runs. With no provider the system payment, “Pay later”, is offered and chosen.",
      "An error is a sentence with an icon in a polite status region that is always in the form, and the fieldset is invalid and described by it (WCAG 3.3.1). While the choice is sent the button says “Saving…”, is aria-disabled and stays focusable, and the form cannot be sent twice.",
      "Long words wrap (wrap-anywhere and wrap-break-word) in the legend, the cards and the button, and nothing is cut.",
    ],
    live: (ctx) => payment(ctx, samples(ctx).payment.saved),
    states: paymentStepStates,
    statesLayout: "stack",
  },
  "organisms/order-summary": {
    summary:
      "What an order costs: its lines, then the subtotal, discount, delivery, tax and total, for the checkout's column and the order's pages.",
    a11y: [
      "A section named by its heading (“Order summary”). The rows are one description list, so “Subtotal, $126.00” is read as a pair, and the total is last, in bold.",
      "Each line is what was bought: its picture (decoration, empty alternative text), its title, every chosen option, the quantity in words and its total, which reads “Line total” before the amount. There are no controls: the cart is changed on the cart page.",
      "Below lg the lines are behind a 44 px disclosure button (“Show order summary, 4 items”) with aria-expanded and aria-controls, so the form of the step comes first on a phone. From lg, and without JavaScript, the button is gone and the lines are always shown, because a button that cannot work must not hide anything.",
      "A row that is not known yet says so in words (“Calculated at the next step”), never a blank or a zero. Long titles and options wrap (wrap-anywhere) beside the picture, and the line's total keeps its place.",
    ],
    live: (ctx) => summary(ctx, samples(ctx).summary.cart),
    states: orderSummaryStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
