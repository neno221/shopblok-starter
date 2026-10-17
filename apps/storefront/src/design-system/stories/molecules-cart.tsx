import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { CartLine, FreeShipping, PromoCodeEntry } from "@shopblok/registry/contracts";
import { CartLineItem } from "@shopblok/ui/molecules/cart-line-item";
import { FreeShippingProgress } from "@shopblok/ui/molecules/free-shipping-progress";
import {
  PromoCodeField,
  type PromoCodeError,
  type PromoCodePending,
} from "@shopblok/ui/molecules/promo-code-field";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of CartLineItem, PromoCodeField and FreeShippingProgress (T34, SETUP.md "Cart, checkout
// and account molecules (T34)"). Sample data is `commerceFixtures[ctx.locale]` (the cart's three
// lines and `cartSamples` for the states the cart does not hold), copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// A story renders on the server (RSC), so the client parts (the quantity stepper, the promo
// disclosure) get props that serialize and no function: the forms take `action="#"`, which a browser
// posts to the page itself, and the DS never submits one. `prefetch={false}` on every line: the
// product pages do not exist before M3, and each prefetch of one in a production build answers 404
// and fails the cell's console check (T32's lesson). Every id on a page comes from `useId`, so the
// states side by side never share one.

const cart = (ctx: DsContext) => commerceFixtures[ctx.locale].cart;
const samples = (ctx: DsContext) => commerceFixtures[ctx.locale].cartSamples;
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The cart's line `index`: the fixtures always hold three. */
function lineOf(ctx: DsContext, index: number): CartLine {
  const line = cart(ctx).lines[index];
  if (line === undefined) throw new Error(`The cart has no line ${index}`);
  return line;
}

// --- CartLineItem ---

function lineItem(ctx: DsContext, line: CartLine, pending = false) {
  return (
    <CartLineItem
      line={line}
      copy={copy(ctx).cartLineItem}
      locale={lang(ctx)}
      updateAction="#"
      removeAction="#"
      pending={pending}
      prefetch={false}
    />
  );
}

const cartLineItemStates: readonly DsState[] = [
  {
    id: "quantity-two",
    label: "Two of one product",
    description:
      "The stepper holds 2; the unit price is beside the line total, and both are announced by name.",
    render: (ctx) => lineItem(ctx, lineOf(ctx, 0)),
  },
  {
    id: "sale",
    label: "On sale",
    description:
      "The unit price shows the one it replaces, struck through, each with a hidden label.",
    render: (ctx) => lineItem(ctx, lineOf(ctx, 1)),
  },
  {
    id: "low-stock",
    label: "Low stock",
    description: "“Only 3 left”, with the icon's shape and its words; the stepper stops at 3.",
    render: (ctx) => lineItem(ctx, lineOf(ctx, 2)),
  },
  {
    id: "at-limit",
    label: "At the stock limit",
    description: "The quantity is the most the stock allows: “+” is disabled.",
    render: (ctx) => lineItem(ctx, samples(ctx).lines.atLimit),
  },
  {
    id: "out-of-stock",
    label: "Out of stock",
    description:
      "The quantity cannot change, and the line says why. Removing it still works, and is the way on.",
    render: (ctx) => lineItem(ctx, samples(ctx).lines.outOfStock),
  },
  {
    id: "pending",
    label: "Updating",
    description:
      "`aria-busy`, a spinner and “Updating…” in the status region. The quantity is read-only and the remove button `aria-disabled`: both keep focus and send nothing.",
    render: (ctx) => lineItem(ctx, lineOf(ctx, 0), true),
  },
  {
    id: "no-image",
    label: "No picture",
    description: "A muted frame of the same size, so the columns do not move.",
    render: (ctx) => lineItem(ctx, samples(ctx).lines.noImage),
  },
  {
    id: "no-options",
    label: "No options",
    description:
      "A product with one variant: no option list, and the controls are named by the title.",
    render: (ctx) => lineItem(ctx, samples(ctx).lines.noOptions),
  },
  {
    id: "long",
    label: "Long title and options",
    description:
      "The title is clamped to two lines (its link's name is all of it); the options wrap and none is cut. On sale, with low stock.",
    render: (ctx) => lineItem(ctx, commerceFixtures[ctx.locale].long.cartLine),
  },
  {
    id: "long-pending",
    label: "Long, updating",
    description: "The longest strings with the status line showing.",
    render: (ctx) => lineItem(ctx, commerceFixtures[ctx.locale].long.cartLine, true),
  },
];

// --- PromoCodeField ---

function promoField(
  ctx: DsContext,
  entry: PromoCodeEntry,
  options: { error?: PromoCodeError; pending?: PromoCodePending } = {},
) {
  return (
    <PromoCodeField
      entry={entry}
      copy={copy(ctx).promoCodeField}
      locale={lang(ctx)}
      applyAction="#"
      removeAction="#"
      error={options.error}
      pending={options.pending}
    />
  );
}

const promoErrors: readonly [PromoCodeError, string, string][] = [
  ["invalid", "Invalid code", "The code is kept for the shopper to correct."],
  [
    "expired",
    "Expired code",
    "The same: the field is open, marked invalid and described by the error.",
  ],
  ["not-applicable", "Code that does not apply", "A code that is real but not for this cart."],
  ["already-applied", "Code already applied", "The applied code stays in its chip above."],
  ["failed", "Something went wrong", "Neither the code's fault nor the shopper's: try again."],
];

const promoCodeFieldStates: readonly DsState[] = [
  {
    id: "closed",
    label: "Closed",
    description:
      "Nothing applied and nothing typed: the disclosure is closed (a native <details>).",
    render: (ctx) => promoField(ctx, samples(ctx).promo.empty),
  },
  {
    id: "code-typed",
    label: "Code typed",
    description: "Open from the start, with the code in the field.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.typed),
  },
  {
    id: "applied",
    label: "Code applied",
    description: "The code as a chip with what it takes off, and a button to take it off.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.applied),
  },
  {
    id: "two-applied",
    label: "Two codes applied",
    description: "The second takes nothing off the goods, so its chip is the code alone.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.two),
  },
  ...promoErrors.map(([error, label, description]): DsState => ({
    id: `error-${error}`,
    label,
    description,
    render: (ctx) =>
      promoField(
        ctx,
        error === "already-applied" ? samples(ctx).promo.applied : samples(ctx).promo.typed,
        { error },
      ),
  })),
  {
    id: "applying",
    label: "Applying",
    description:
      "The button keeps its place as “Applying…”, `aria-disabled` and `type=button`; the field is read-only; a hidden disabled submit button stands first so Enter does nothing either.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.typed, { pending: "apply" }),
  },
  {
    id: "removing",
    label: "Removing",
    description: "The remove buttons are inert and a status line says what is happening.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.applied, { pending: "remove" }),
  },
  {
    id: "long",
    label: "Long code and error",
    description:
      "A 40-character code with nowhere to break wraps inside its chip and scrolls inside the field; the longest error under it.",
    render: (ctx) => promoField(ctx, samples(ctx).promo.long, { error: "not-applicable" }),
  },
];

// --- FreeShippingProgress ---

function progress(ctx: DsContext, freeShipping: FreeShipping) {
  return (
    <FreeShippingProgress
      freeShipping={freeShipping}
      copy={copy(ctx).freeShippingProgress}
      locale={lang(ctx)}
    />
  );
}

const freeShippingProgressStates: readonly DsState[] = [
  {
    id: "empty",
    label: "Nothing in the cart",
    description: "The whole threshold is left, and the bar is empty.",
    render: (ctx) => progress(ctx, samples(ctx).freeShipping.empty),
  },
  {
    id: "partway",
    label: "Part of the way",
    description: "The cart's own: what is left, and the share reached.",
    render: (ctx) => progress(ctx, cart(ctx).freeShipping!),
  },
  {
    id: "almost",
    label: "Almost there",
    description: "Under one unit left: the bar is under 100 until nothing is left.",
    render: (ctx) => progress(ctx, samples(ctx).freeShipping.almost),
  },
  {
    id: "reached",
    label: "Reached",
    description: "“You get free shipping”, a check, and a full bar in the success colour.",
    render: (ctx) => progress(ctx, samples(ctx).freeShipping.reached),
  },
  {
    id: "large",
    label: "Seven-digit amount",
    description: "The longest amount the sentence has to carry.",
    render: (ctx) => progress(ctx, samples(ctx).freeShipping.large),
  },
];

export const cartMoleculeStories = {
  "molecules/cart-line-item": {
    summary:
      "One line of the cart: the picture, the product as a link, its options, a stock warning, the quantity, a remove button, and the unit price and line total.",
    a11y: [
      'The line is an <article> named by its title. The title is the only link; the picture is decoration (`alt=""`). Every chosen option is shown as text (“Color: Oatmeal”), and the quantity and remove controls are named for the product and its options (“Quantity, Heritage Hoodie (Color: Black, Size: L)”), because a cart can hold one product twice.',
      "Two plain forms (D48): the quantity form posts `lineId` and `quantity`, the remove form posts `lineId`, each to its own action, with no script. With JavaScript the stepper sends its form half a second after the last change, or at once on Enter; without it the stepper is hidden (`@media (scripting: none)`) and a native number field with an “Update” button takes its place. Enter in the quantity never removes the line: the forms are separate.",
      "The stepper stops at the stock limit and is disabled when the line is out of stock; “Only 3 left” and “Out of stock” are words with an icon, never colour alone (WCAG 1.4.1). The unit price and the line total each have a hidden label, and a sale price and its original are labelled.",
      "While updating, `aria-busy` is set and “Updating…” appears in a status region that is always in the page, so it is announced politely. The quantity field is read-only (it keeps focus) and the remove button is `aria-disabled` and `type=button`: nothing is sent twice. Every control is 44 px or more; the stepper's and the remove button's rings are full strength.",
    ],
    live: (ctx) => (
      <ul className="m-0 flex max-w-2xl list-none flex-col divide-y p-0">
        {cart(ctx).lines.map((line) => (
          <li key={line.id} className="py-4 first:pt-0 last:pb-0">
            {lineItem(ctx, line)}
          </li>
        ))}
      </ul>
    ),
    states: cartLineItemStates,
  },
  "molecules/promo-code-field": {
    summary:
      "The cart's promotion codes: the codes applied as chips with what each takes off, and a disclosure that opens a form to add one, with its errors.",
    a11y: [
      "A native <details> and not the Collapsible primitive, which needs JavaScript to open: the summary is a 44 px target that opens with Enter or Space, and the form is open in the markup when a code is typed or the last try failed. A small client part keeps the open state so that applying a code does not close the form under a focused button.",
      "The field has a visible label (“Promotion code”), `autocomplete=off` and `required`, and posts `code` to `applyAction`. An error is text with an icon in a polite status region that is always in the form, and is tied to the field with `aria-invalid` and `aria-describedby`; the typed code is kept (WCAG 3.3.1 to 3.3.3).",
      "Each applied code is a chip with its amount (“Saves $12.60”) and a remove button named for the code (“Remove promotion code WELCOME10”), a submit button of a plain form (`name=code`, `value`), so a code can be taken off without a script. The list is a polite live region that reports additions only, so a code that was just applied is announced once.",
      "While applying, the button keeps its place as “Applying…”, `aria-disabled` and `type=button`, the field is read-only and a hidden disabled submit button stands first, so neither a click nor Enter sends twice. While removing, the remove buttons are inert the same way.",
    ],
    live: (ctx) => <div className="max-w-md">{promoField(ctx, samples(ctx).promo.applied)}</div>,
    states: promoCodeFieldStates,
  },
  "molecules/free-shipping-progress": {
    summary:
      "How far the cart is from free shipping: “Add $39.00 more for free shipping” over a bar, or “You get free shipping” with the bar full.",
    a11y: [
      "The sentence is in a polite status region that is always in the page, so when the cart changes and the text with it, a screen reader says it once; the first render is not announced. The bar is a `role=progressbar` named by that sentence, with `aria-valuenow` as the share of the threshold reached (whole numbers, 100 only when nothing is left).",
      "The amount left is formatted by `formatMoney` in the market's currency and sits in an ICU message, so a language puts it where its sentence needs it. An icon (a truck, or a check) goes with the words; colour is never the only sign (WCAG 1.4.1).",
      "The bar is not interactive, so the 44 px rule does not apply to it. The indicator is black (or the success green once reached) on the muted track: 19.3:1 and 7.0:1, over the 3:1 that WCAG 1.4.11 asks.",
    ],
    live: (ctx) => <div className="max-w-md">{progress(ctx, cart(ctx).freeShipping!)}</div>,
    states: freeShippingProgressStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
