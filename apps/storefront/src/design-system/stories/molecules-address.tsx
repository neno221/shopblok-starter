import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { Address, AddressFormState } from "@shopblok/registry/contracts";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import {
  AddressForm,
  type AddressFormErrors,
  type AddressFormStatus,
} from "@shopblok/ui/molecules/address-form";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of AddressForm and AddressCard (T34, SETUP.md "Cart, checkout and account molecules
// (T34)"). Sample data is `commerceFixtures[ctx.locale]`: the address book (the market's own country
// first), `addressSamples` (the United Kingdom, France, Japan, a country Google's data does not list,
// and a form with mistakes) and `long.address`. Copy is `catalogs[ctx.locale].molecules`, and the
// locale every `Intl` call uses is the market's `<html lang>`.
//
// A story renders on the server (RSC): AddressForm hands its client part plain data (the formats of
// the region's countries, already worded), and no story passes a function. The DS posts nothing, so
// both components take `action="#"`. A link takes `prefetch={false}`: the address pages do not exist
// before M3, and a prefetch in a production build would answer 404 and fail the cell's console check
// (T32's lesson). Every id on a page comes from `useId`, so the states side by side never share one.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

type Values = AddressFormState["values"];

/** The region's countries: the six seeded markets', in the market switcher's order. */
const regionOf = (ctx: DsContext) => fixtures(ctx).markets.map((market) => market.country);

/** The sample address of a country: the book's four, then the samples' four. */
function addressIn(ctx: DsContext, country: string): Address {
  const { addresses, addressSamples } = fixtures(ctx);
  const found = [
    ...addresses,
    addressSamples.gb,
    addressSamples.fr,
    addressSamples.jp,
    addressSamples.generic,
  ].find((address) => address.countryCode === country);
  if (found === undefined) throw new Error(`the fixtures have no address in ${country}`);
  return found;
}

/** An address as a form is filled with it: the fields, not the id or the book's marks. */
function typed(address: Address): Values {
  const values: Values = { ...address };
  delete values.id;
  delete values.isDefaultShipping;
  delete values.isDefaultBilling;
  return values;
}

// --- AddressForm ---

type FormOptions = {
  values: Values;
  /** Countries the region does not have, added to the select (Japan, a country added in settings). */
  extra?: string;
  errors?: AddressFormErrors;
  status?: AddressFormStatus;
  section?: "shipping" | "billing";
  submitLabel?: string;
};

function addressForm(ctx: DsContext, options: FormOptions) {
  const { values, extra, errors, status, section, submitLabel } = options;
  const countries = extra === undefined ? regionOf(ctx) : [...regionOf(ctx), extra];
  return (
    <AddressForm
      countries={countries}
      values={values}
      copy={copy(ctx).addressForm}
      locale={lang(ctx)}
      action="#"
      {...(errors === undefined ? {} : { errors })}
      {...(status === undefined ? {} : { status })}
      {...(section === undefined ? {} : { section })}
      {...(submitLabel === undefined ? {} : { submitLabel })}
      className="max-w-xl"
    />
  );
}

/** The market's own country, nothing typed. */
const empty = (ctx: DsContext): Values => ({ countryCode: ctx.fixture.market.country });

/** One state that shows a country's own format with an address typed in it. */
function country(code: string, label: string, description: string, extra?: string): DsState {
  return {
    id: code,
    label,
    description,
    render: (ctx) =>
      addressForm(ctx, {
        values: typed(addressIn(ctx, code)),
        ...(extra === undefined ? {} : { extra }),
      }),
  };
}

const addressFormStates: readonly DsState[] = [
  {
    id: "empty",
    label: "Empty",
    description:
      "The market's own country with nothing typed: its required fields have no mark, the optional ones say “(optional)”, and a note says that the others are required.",
    render: (ctx) => addressForm(ctx, { values: empty(ctx) }),
  },
  {
    id: "edit",
    label: "Editing a saved address",
    description:
      "A saved address of another country than the market's: the form starts with that country's fields, and a hidden `addressId` goes with the submit.",
    render: (ctx) => {
      const [, second] = fixtures(ctx).addresses;
      if (second === undefined) throw new Error("the address book has one address");
      return addressForm(ctx, { values: { ...second } });
    },
  },
  country(
    "cy",
    "Cyprus",
    "Name, street, then postal code and city on one line; no province; a four-digit postal code, which is optional in the data.",
  ),
  country(
    "us",
    "United States",
    "Company and a second street line, then city, state and ZIP code on one row: the state is required, and the ZIP code is five digits or ZIP+4.",
  ),
  country(
    "gb",
    "United Kingdom",
    "Post town and postcode: the postcode is required and takes the Royal Mail shapes (M2 5BQ).",
  ),
  country("de", "Germany", "Postal code before the city, five digits; no province."),
  country("fr", "France", "Company and second line, then the five-digit code before the city."),
  country(
    "ch",
    "Switzerland",
    "The postal code takes four digits and `CH-` is drawn before the field (hidden from assistive technology, never typed).",
  ),
  country(
    "jp",
    "Japan (not seeded)",
    "A country no market seeds, added to the select: prefecture, then the postal code (107-0061, the hyphen optional). It has no city field, as in Google's data; no code was written for it.",
    "jp",
  ),
  country(
    "ic",
    "Country without a format",
    "The Canary Islands (`ic`) are not in Google's data: the generic form (name, street and city required; province and postal code optional, with no pattern), never an error.",
    "ic",
  ),
  {
    id: "errors",
    label: "Errors",
    description:
      "A state left out and a four-digit ZIP code: each error is text beside its field (the ZIP code's says what one looks like), the values are kept, and the status line counts the fields.",
    render: (ctx) =>
      addressForm(ctx, {
        values: fixtures(ctx).addressSamples.mistaken,
        errors: { province: "required", postalCode: "pattern" },
      }),
  },
  {
    id: "errors-empty",
    label: "Submitted empty",
    description:
      "Four required fields are empty: “… is required.” under each, and the status line says four fields need attention.",
    render: (ctx) =>
      addressForm(ctx, {
        values: empty(ctx),
        errors: {
          firstName: "required",
          lastName: "required",
          address1: "required",
          city: "required",
        },
      }),
  },
  {
    id: "pending",
    label: "Saving",
    description:
      "The button keeps its place and says what is happening, and cannot submit again: not by a click, not by Enter. The fields are read-only and keep the address.",
    render: (ctx) =>
      addressForm(ctx, {
        values: typed(addressIn(ctx, ctx.fixture.market.country)),
        status: "pending",
      }),
  },
  {
    id: "save-failed",
    label: "Could not be saved",
    description:
      "No field is to blame (the server refused the address): the status line says so, with an icon, and nothing typed is lost.",
    render: (ctx) =>
      addressForm(ctx, {
        values: typed(addressIn(ctx, ctx.fixture.market.country)),
        status: "error",
      }),
  },
  {
    id: "billing",
    label: "Billing address",
    description:
      '`section="billing"`: the form is named “Billing address” and every `autocomplete` token starts with `billing`, so a browser fills the right address.',
    render: (ctx) =>
      addressForm(ctx, {
        values: typed(addressIn(ctx, ctx.fixture.market.country)),
        section: "billing",
      }),
  },
  {
    id: "long",
    label: "Long values and button",
    description:
      "A 90-character company and street (German, Greek) scroll inside their fields; the button's long label wraps instead of widening the form; the errors wrap.",
    render: (ctx) =>
      addressForm(ctx, {
        values: typed({ ...fixtures(ctx).long.address, countryCode: ctx.fixture.market.country }),
        errors: { address1: "invalid", phone: "invalid" },
        submitLabel: ctx.fixture.long.action,
      }),
  },
];

// --- AddressCard ---

type CardOptions = {
  address: Address;
  /** The edit link and the remove button; both by default. */
  actions?: "both" | "edit" | "none";
  removing?: boolean;
};

function addressCard(ctx: DsContext, options: CardOptions) {
  const { address, actions = "both", removing } = options;
  return (
    <AddressCard
      address={address}
      copy={copy(ctx).addressCard}
      locale={lang(ctx)}
      className="max-w-sm"
      prefetch={false}
      {...(actions === "none" ? {} : { editHref: "#" })}
      {...(actions === "both" ? { removeAction: "#" } : {})}
      {...(removing === undefined ? {} : { removing })}
    />
  );
}

/** A book address with neither default mark. */
const plain = (address: Address): Address => ({
  ...address,
  isDefaultShipping: false,
  isDefaultBilling: false,
});

function cardIn(code: string, label: string, description: string): DsState {
  return {
    id: code,
    label,
    description,
    render: (ctx) => addressCard(ctx, { address: plain(addressIn(ctx, code)) }),
  };
}

const addressCardStates: readonly DsState[] = [
  {
    id: "default",
    label: "Default shipping and billing",
    description:
      "The market's own address, with both marks as words in badges, the edit link and the remove button, each named for this address.",
    render: (ctx) => addressCard(ctx, { address: addressIn(ctx, ctx.fixture.market.country) }),
  },
  cardIn(
    "cy",
    "Cyprus",
    "Name, street, then postal code and city (“1065 Λευκωσία”), the country's name in the page's language, and the phone.",
  ),
  cardIn(
    "us",
    "United States, with company",
    "Company and second street line; “Brooklyn, NY 11215” in the US order.",
  ),
  cardIn("de", "Germany", "Postal code before the city: “10969 Berlin”."),
  cardIn("ch", "Switzerland", "The country's code before the postal code: “CH-8001 Zürich”."),
  {
    id: "gb",
    label: "United Kingdom, default billing",
    description: "Post town and postcode on their own lines; only the billing mark.",
    render: (ctx) =>
      addressCard(ctx, {
        address: { ...addressIn(ctx, "gb"), isDefaultShipping: false, isDefaultBilling: true },
      }),
  },
  {
    id: "fr",
    label: "France, default shipping",
    description: "Company and second line; only the shipping mark.",
    render: (ctx) =>
      addressCard(ctx, {
        address: { ...addressIn(ctx, "fr"), isDefaultShipping: true, isDefaultBilling: false },
      }),
  },
  cardIn(
    "jp",
    "Japan (not seeded)",
    "A country no market seeds: the street line, then the prefecture, then the postal code on its own line, as its format has them; the city is part of the street line.",
  ),
  cardIn(
    "ic",
    "Country without a format",
    "The generic order for a country Google's data does not list: street, city, then province and postal code.",
  ),
  {
    id: "long",
    label: "Long values",
    description:
      "A company, a street and two names that run past the card's width wrap onto more lines; the buttons wrap with them. Both marks are on.",
    render: (ctx) =>
      addressCard(ctx, {
        address: {
          ...fixtures(ctx).long.address,
          countryCode: ctx.fixture.market.country,
          isDefaultShipping: true,
          isDefaultBilling: true,
        },
      }),
  },
  {
    id: "edit-only",
    label: "Edit only",
    description: "No `removeAction`: no remove button, and no status region for it.",
    render: (ctx) => addressCard(ctx, { address: plain(addressIn(ctx, "us")), actions: "edit" }),
  },
  {
    id: "read-only",
    label: "No actions",
    description:
      "As an order or the checkout shows an address: the `<address>` and its marks, no buttons.",
    render: (ctx) =>
      addressCard(ctx, { address: addressIn(ctx, ctx.fixture.market.country), actions: "none" }),
  },
  {
    id: "removing",
    label: "Removing",
    description:
      "The button keeps its place, says what is happening and cannot submit again; a status line says it too.",
    render: (ctx) => addressCard(ctx, { address: plain(addressIn(ctx, "de")), removing: true }),
  },
];

export const addressMoleculeStories = {
  "molecules/address-form": {
    summary:
      "An address as a plain form: a country select, then the chosen country's fields in its order, labels and required marks, with the postal code's pattern, the phone, and a submit button.",
    a11y: [
      "A native <form> that posts without JavaScript, named “Shipping address”, “Billing address” or “Address”. Every field has a real <label> and its `autocomplete` token (WCAG 1.3.5: `given-name`, `address-line1`, `address-level2`, `postal-code`, `country`, `tel`…), prefixed `shipping` or `billing` when the caller says which. The names are the contract's (`firstName`, `postalCode`, `countryCode`…).",
      "Required fields have `required` and no mark; a field that may stay empty says “(optional)” in its label, and a note above the form says that the others are required (WCAG 3.3.2). A country calls its fields what its people do: ZIP code, postcode, Eircode, State, Prefecture, Post town.",
      "A wrong value is text beside its field with an icon (`aria-invalid`, `aria-describedby`; the postal code's says what one looks like, “Enter a postal code like 2008”), the typed values are kept, and a status line in a `role=status` region that is always in the page says how many fields need attention (WCAG 3.3.1, 3.3.3, 4.1.3).",
      "Choosing another country swaps the fields at once and keeps what was typed (a field that two countries share keeps its place, its focus and its value); a polite status line says “The address fields now follow Germany”. Without JavaScript the form shows the first country's fields and submits the chosen one, and the server draws the right form. A country with no data gets the generic form.",
      "While saving, the button keeps its place and its name, is `aria-disabled` and focusable, and cannot submit again (`type=button`, and a hidden disabled submit button stands first so Enter does nothing); the fields are read-only. The fields share a grid that follows the form's own width (a container query): two or three to a row from 28 rem, one below it; every control is 44 px tall.",
    ],
    live: (ctx) => addressForm(ctx, { values: empty(ctx), section: "shipping" }),
    states: addressFormStates,
  },
  "molecules/address-card": {
    summary:
      "A saved address as an <address> in its country's order and wording, with default marks as words, an edit link and a remove button that name the address they belong to.",
    a11y: [
      "An <article> named by its name line, holding an <address>: the lines follow the country's own format (postal code before the city in Germany, “CH-” before it in Switzerland, state and ZIP code after it in the US), then the country's name in the page's language, then the phone.",
      "“Default shipping” and “Default billing” are words in badges inside a list, never colour alone.",
      "The edit link and the remove button are named for their address (“Edit the address of Jordan Ellis, Brooklyn”, “Remove the address of Jordan Ellis, Brooklyn”), so a list of cards has no two controls with one name, and the visible word comes first in the name (WCAG 2.5.3). Both are 44 px tall; the link is a link (it goes to the edit page), the remove is a button in a form of its own that posts without JavaScript.",
      "While a remove is on its way, the button keeps its place and says so, is `aria-disabled` and cannot submit again; a polite `role=status` region, there from the start, announces it. Long names, companies and streets wrap inside the card.",
    ],
    live: (ctx) => addressCard(ctx, { address: addressIn(ctx, ctx.fixture.market.country) }),
    states: addressCardStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
