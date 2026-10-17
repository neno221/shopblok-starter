import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  Address,
  LocationAddress,
  PaymentMethod,
  SavedPaymentMethod,
  ShippingOption,
} from "@shopblok/registry/contracts";
import { PaymentMethodCard } from "@shopblok/ui/molecules/payment-method-card";
import { SavedPaymentMethodCard } from "@shopblok/ui/molecules/saved-payment-method-card";
import type { RemoveStatus } from "@shopblok/ui/molecules/saved-payment-method-remove";
import { ShippingOptionCard } from "@shopblok/ui/molecules/shipping-option-card";
import type { ReactNode } from "react";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of ShippingOptionCard, PaymentMethodCard and SavedPaymentMethodCard (T34, SETUP.md
// "Cart, checkout and account molecules (T34)"). Sample data is `commerceFixtures[ctx.locale]`
// (its shipping options, payment methods, saved cards and `paymentSamples`), the copy is
// `catalogs[ctx.locale]` and the locale every `Intl` call uses is the market's `<html lang>`.
//
// The two radio cards are one choice of a group the caller draws, so the live renders draw the
// group: a `<fieldset>` with its `<legend>` (DS chrome, English). A state draws one card, and every
// state gives its radio a `name` of its own: radios with one name are one group to the browser, so
// two states that shared a name would uncheck each other. The saved card's live render draws one
// card, so there is one remove button to open on the preview page (the lead's interaction check
// presses it); the three cards of the account are a state. Its confirmation is drawn open in an
// `OverlayBox` (D45) with `defaultOpen` and `modal={false}`, and the box is taller than the
// popup. `now` is the fixtures' fixed time (D50). The stories pass `action="#"`: the DS posts
// nothing. No story draws a link, so nothing is prefetched (T32's lesson).

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

/** A group of cards as the checkout draws it: a fieldset named by its legend (DS chrome). */
function group(legend: string, children: ReactNode) {
  return (
    <fieldset className="grid max-w-lg min-w-0 gap-3">
      <legend lang="en" className="mb-3 text-base font-semibold">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

// --- ShippingOptionCard ---

const shippingOf = (ctx: DsContext, id: string): ShippingOption =>
  required(
    fixtures(ctx).shippingOptions.find((option) => option.id === id),
    `shipping option ${id}`,
  );

/** The pickup's address is a place's: an address without the person's names and the flags. */
function asLocation(address: Address): LocationAddress {
  const { address1, address2, city, province, postalCode, countryCode } = address;
  return {
    address1,
    ...(address2 !== undefined && { address2 }),
    city,
    ...(province !== undefined && { province }),
    ...(postalCode !== undefined && { postalCode }),
    countryCode,
  };
}

function shippingCard(
  ctx: DsContext,
  option: ShippingOption,
  name: string,
  props: { defaultChecked?: boolean; required?: boolean } = {},
) {
  return (
    <ShippingOptionCard
      option={option}
      copy={copy(ctx).shippingOptionCard}
      locale={lang(ctx)}
      name={name}
      className="max-w-lg"
      {...props}
    />
  );
}

const shippingOptionCardStates: readonly DsState[] = [
  {
    id: "default",
    label: "Not chosen",
    description: "The name, the price and the time in business days; the mark is an empty ring.",
    render: (ctx) => shippingCard(ctx, shippingOf(ctx, "so_standard"), "shipping-default"),
  },
  {
    id: "chosen",
    label: "Chosen",
    description:
      "Chosen when the page loads (`defaultChecked`): a filled ring and a heavier border, not a colour alone.",
    render: (ctx) =>
      shippingCard(ctx, shippingOf(ctx, "so_express"), "shipping-chosen", { defaultChecked: true }),
  },
  {
    id: "free",
    label: "Free",
    description: "A 0 amount is the word “Free”, not a price of zero.",
    render: (ctx) => shippingCard(ctx, shippingOf(ctx, "so_free"), "shipping-free"),
  },
  {
    id: "pickup",
    label: "Pickup",
    description:
      "The location's name and its address on one line, in the country's own order (`addressLines`).",
    render: (ctx) => shippingCard(ctx, shippingOf(ctx, "so_pickup"), "shipping-pickup"),
  },
  {
    id: "same-number-of-days",
    label: "Exact days",
    description: "The two ends are the same, so it is one number: “2 business days”.",
    render: (ctx) =>
      shippingCard(
        ctx,
        { ...shippingOf(ctx, "so_standard"), estimate: { minDays: 2, maxDays: 2 } },
        "shipping-exact",
      ),
  },
  {
    id: "no-estimate",
    label: "No estimate",
    description: "The contract's `estimate` is optional: the card shows the name and the price.",
    render: (ctx) => {
      const { estimate: _estimate, ...option } = shippingOf(ctx, "so_standard");
      return shippingCard(ctx, option, "shipping-no-estimate");
    },
  },
  {
    id: "unavailable",
    label: "Not available",
    description:
      "`available: false`: the radio is disabled and the card says why in text, with an icon. Its price and time are still read.",
    render: (ctx) => shippingCard(ctx, shippingOf(ctx, "so_same_day"), "shipping-unavailable"),
  },
  {
    id: "required",
    label: "Required",
    description:
      "`required` makes the browser ask for a choice before the form is sent, in any card of the group.",
    render: (ctx) =>
      shippingCard(ctx, shippingOf(ctx, "so_standard"), "shipping-required", { required: true }),
  },
  {
    id: "long",
    label: "Long name",
    description:
      "The longest name (German, Greek) wraps beside the price, which keeps its width; nothing is cut.",
    render: (ctx) => shippingCard(ctx, fixtures(ctx).long.shippingOption, "shipping-long"),
  },
  {
    id: "long-pickup",
    label: "Long pickup",
    description: "A long location name and a long, two-line street wrap inside the card.",
    render: (ctx) =>
      shippingCard(
        ctx,
        {
          ...shippingOf(ctx, "so_pickup"),
          name: fixtures(ctx).long.shippingOption.name,
          pickup: {
            locationName: ctx.fixture.long.storeName,
            address: asLocation(fixtures(ctx).long.address),
          },
        },
        "shipping-long-pickup",
      ),
  },
];

// --- PaymentMethodCard ---

const methodOf = (ctx: DsContext, id: string): PaymentMethod =>
  required(
    fixtures(ctx).paymentMethods.find((method) => method.id === id),
    `payment method ${id}`,
  );

function paymentCard(
  ctx: DsContext,
  method: PaymentMethod,
  name: string,
  props: { defaultChecked?: boolean; disabled?: boolean } = {},
) {
  return (
    <PaymentMethodCard
      method={method}
      copy={{ card: copy(ctx).paymentMethodCard, brands: catalogs[ctx.locale].atoms.payment }}
      locale={lang(ctx)}
      name={name}
      className="max-w-lg"
      {...props}
    />
  );
}

const paymentMethodCardStates: readonly DsState[] = [
  {
    id: "card",
    label: "Card",
    description:
      "The name does not say which cards it takes, so the marks are decoration and a hidden sentence says “Accepts Visa, Mastercard and American Express”.",
    render: (ctx) => paymentCard(ctx, methodOf(ctx, "pp_stripe_stripe"), "payment-card"),
  },
  {
    id: "chosen",
    label: "Chosen",
    description: "Chosen when the page loads: the same filled ring and heavier border.",
    render: (ctx) =>
      paymentCard(ctx, methodOf(ctx, "pp_stripe_stripe"), "payment-chosen", {
        defaultChecked: true,
      }),
  },
  {
    id: "wallet",
    label: "Wallet",
    description:
      "“Apple Pay” already says the brand, so the mark is decoration and nothing is added to the description.",
    render: (ctx) => paymentCard(ctx, methodOf(ctx, "pp_stripe-applepay_stripe"), "payment-wallet"),
  },
  {
    id: "redirect",
    label: "Redirect",
    description:
      "A method that leaves the shop says so under its name, in text, before it is chosen.",
    render: (ctx) => paymentCard(ctx, methodOf(ctx, "pp_stripe-paypal_stripe"), "payment-redirect"),
  },
  {
    id: "no-marks",
    label: "No marks",
    description: "A method with no brand (a manual payment) is its name alone.",
    render: (ctx) =>
      paymentCard(
        ctx,
        {
          id: "pp_system_default",
          kind: "manual",
          name: methodOf(ctx, "pp_stripe_stripe").name,
          brands: [],
        },
        "payment-no-marks",
      ),
  },
  {
    id: "disabled",
    label: "Disabled",
    description:
      "A card the caller has switched off (`disabled`): muted, not focusable, not sent with the form.",
    render: (ctx) =>
      paymentCard(ctx, methodOf(ctx, "pp_stripe-klarna_stripe"), "payment-disabled", {
        disabled: true,
      }),
  },
  {
    id: "long",
    label: "Long name",
    description:
      "The longest name wraps beside its three marks, and the marks drop below it when there is no room.",
    render: (ctx) => paymentCard(ctx, fixtures(ctx).paymentSamples.longMethod, "payment-long"),
  },
];

// --- SavedPaymentMethodCard ---

const savedCard = (
  ctx: DsContext,
  card: SavedPaymentMethod,
  props: {
    status?: RemoveStatus;
    open?: boolean;
    confirmHref?: string;
  } = {},
) => (
  <SavedPaymentMethodCard
    card={card}
    copy={{ card: copy(ctx).savedPaymentMethodCard, brands: catalogs[ctx.locale].atoms.payment }}
    locale={lang(ctx)}
    now={fixtureNow}
    action="#"
    status={props.status}
    confirmHref={props.confirmHref}
    defaultOpen={props.open}
    modal={props.open === true ? false : undefined}
    className="max-w-xl"
  />
);

/** The card with its confirmation drawn open, in a box taller than the popup (D45). */
function confirming(ctx: DsContext, card: SavedPaymentMethod, status?: RemoveStatus) {
  return (
    <OverlayBox name="Alert dialog, drawn open" height={520}>
      <div className="p-4">{savedCard(ctx, card, { open: true, status })}</div>
    </OverlayBox>
  );
}

const savedPaymentMethodCardStates: readonly DsState[] = [
  {
    id: "default",
    label: "Default card",
    description:
      "The brand's mark, the card in words, a “Default” mark, the expiry and the holder, and a Remove button named for the card.",
    render: (ctx) => savedCard(ctx, required(fixtures(ctx).savedPaymentMethods[0], "saved card")),
  },
  {
    id: "other",
    label: "Another card",
    description: "Not the default: no mark.",
    render: (ctx) => savedCard(ctx, required(fixtures(ctx).savedPaymentMethods[1], "saved card")),
  },
  {
    id: "list",
    label: "In a list",
    description: "The account's three cards, one under the other; each Remove names its card.",
    render: (ctx) => (
      <ul className="grid max-w-xl gap-3">
        {fixtures(ctx).savedPaymentMethods.map((card) => (
          <li key={card.id}>{savedCard(ctx, card)}</li>
        ))}
      </ul>
    ),
  },
  {
    id: "expires-this-month",
    label: "Expires this month",
    description:
      "A card works through its last day: this one expires in the fixed now's month, so it is not expired yet.",
    render: (ctx) => savedCard(ctx, fixtures(ctx).paymentSamples.expiringCard),
  },
  {
    id: "expired",
    label: "Expired",
    description:
      "Expired the month before the fixed now: the line says so in words, with an icon, and the card can still be removed.",
    render: (ctx) => savedCard(ctx, fixtures(ctx).paymentSamples.expiredCard),
  },
  {
    id: "no-holder",
    label: "No holder",
    description: "The holder's name is optional.",
    render: (ctx) => savedCard(ctx, fixtures(ctx).paymentSamples.anonymousCard),
  },
  {
    id: "long-holder",
    label: "Long holder name",
    description:
      "The longest name wraps; the button drops below the details when the card is narrow.",
    render: (ctx) => savedCard(ctx, fixtures(ctx).paymentSamples.longHolderCard),
  },
  {
    id: "confirmation",
    label: "Confirmation",
    description:
      "Remove opens an alert dialog: the title, the card in words, Cancel and Remove. Focus starts on Cancel. Drawn open here, non-modal, in its box.",
    render: (ctx) => confirming(ctx, required(fixtures(ctx).savedPaymentMethods[0], "saved card")),
  },
  {
    id: "confirmation-removing",
    label: "Confirmation, removing",
    description:
      "Remove keeps its place, says “Removing…” and cannot be pressed twice; the status line says so.",
    render: (ctx) =>
      confirming(ctx, required(fixtures(ctx).savedPaymentMethods[0], "saved card"), "removing"),
  },
  {
    id: "confirmation-error",
    label: "Confirmation, error",
    description: "The dialog stays open and says what went wrong in its status line.",
    render: (ctx) =>
      confirming(ctx, required(fixtures(ctx).savedPaymentMethods[1], "saved card"), "error"),
  },
  {
    id: "confirmation-page",
    label: "With a confirmation page",
    description:
      "With a `confirmHref` the button is a GET form's submit button: without JavaScript it goes to that page, which asks the same question; with it, the dialog opens and the click is not submitted.",
    render: (ctx) =>
      savedCard(ctx, required(fixtures(ctx).savedPaymentMethods[2], "saved card"), {
        confirmHref: `${fixtures(ctx).prefix}/account/payment-methods/spm_03/remove`,
      }),
  },
];

export const paymentMoleculeStories = {
  "molecules/shipping-option-card": {
    summary:
      "One shipping option as a radio card: its name, its price or “Free”, the time in business days and, for a pickup, the location and its address; an option that is not available says why.",
    a11y: [
      "A native radio in a label that is the whole card, so it works before any JavaScript and the form sends the group's `name` with the option's id. The caller draws the group in a `<fieldset>` with a `<legend>`; the arrow keys move between the cards and Tab enters and leaves the group, as for any radio group.",
      "The radio is named by the option's name alone, and described by the price, the time, the pickup point and the reason, in that order: a screen reader says “Standard shipping, radio button, 1 of 5, $5.50, 3–5 business days”. The mark beside it is hidden from assistive technology.",
      "The chosen card is a filled ring and a heavier border (not colour alone, and it survives forced colors); focus is a ring round the whole card, drawn from the input's `:focus-visible`. The whole card is the target, at least 44 px tall.",
      "An option with `available: false` is disabled and says why in visible text with an icon (“Not available for this order”), included in its description. “Free” is the word, in the success colour (7.6:1 on the card) and not only the colour.",
    ],
    live: (ctx) =>
      group(
        "Delivery",
        <>
          {fixtures(ctx).shippingOptions.map((option, index) => (
            <ShippingOptionCard
              key={option.id}
              option={option}
              copy={copy(ctx).shippingOptionCard}
              locale={lang(ctx)}
              name="shipping"
              defaultChecked={index === 0}
            />
          ))}
        </>,
      ),
    states: shippingOptionCardStates,
  },
  "molecules/payment-method-card": {
    summary:
      "One way to pay as a radio card: the method's name and its marks; a method that leaves the shop says so before it is chosen.",
    a11y: [
      "A native radio in a label that is the whole card, so it works before any JavaScript: the form sends the group's `name` with the method's provider id. The caller draws the group in a `<fieldset>` with a `<legend>`.",
      "The radio is named by the method's name. The marks are always hidden from assistive technology: when the name already says the brand (“PayPal”, “Apple Pay”) they are decoration; when it does not (“Credit or debit card”) a hidden sentence in the description says “Accepts Visa, Mastercard, and American Express”, joined by the market's list format.",
      "A redirect method says “You will be redirected to PayPal to complete your payment.” in visible text, in the description, so a shopper knows before choosing. The card's details are asked after the choice, and are not part of this component.",
      "The chosen card is a filled ring and a heavier border, and focus is a ring round the whole card; the card is at least 44 px tall and the whole card is the target.",
    ],
    live: (ctx) =>
      group(
        "Payment method",
        <>
          {fixtures(ctx).paymentMethods.map((method, index) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              copy={{
                card: copy(ctx).paymentMethodCard,
                brands: catalogs[ctx.locale].atoms.payment,
              }}
              locale={lang(ctx)}
              name="payment"
              defaultChecked={index === 0}
            />
          ))}
        </>,
      ),
    states: paymentMethodCardStates,
  },
  "molecules/saved-payment-method-card": {
    summary:
      "A saved card: its mark, “Visa ending in 4242”, the expiry (and “Expired”), the holder and a default mark, with a Remove button that asks first.",
    a11y: [
      "The card is an article named by its heading, “Visa ending in 4242”; the mark beside it is decoration. The expiry is words (“Expires 08/2028”, “Expired 09/2026” with an icon), judged against the `now` the caller gives, never the server's clock, and a card works through its last day.",
      'Remove is named for its card (“Remove Visa ending in 4242”, with the visible word in the name). It opens an alert dialog: `role=alertdialog`, focus starts on Cancel (the least destructive choice), Tab and Shift+Tab stay inside, a press outside does not close it, and Escape or Cancel close it with focus back on Remove. Selectors for the interaction check: the button is `[data-slot="saved-payment-method-remove"]`, the popup `[data-slot="saved-payment-method-confirm"]`.',
      "While it removes, the confirming button keeps its place, says “Removing…”, is `aria-disabled` and cannot submit twice; a status line that is always in the dialog says so, and says what went wrong if it fails. Remove sends `paymentMethodId` to the form's `action`.",
      "Without JavaScript the dialog cannot open. With a `confirmHref`, Remove is the submit button of a GET form to that page, which asks the same question and posts the same form; without one it does nothing until the page is interactive, and nothing is removed.",
    ],
    live: (ctx) => savedCard(ctx, required(fixtures(ctx).savedPaymentMethods[0], "saved card")),
    states: savedPaymentMethodCardStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
