import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { addressLines, catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { SavedPaymentMethodRemove } from "@shopblok/ui/molecules/saved-payment-method-remove";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { paymentMoleculeStories } from "./molecules-payment";

// The stories of the shipping and payment cards (T34; D40): the states are there and show what
// their descriptions say in every locale, the radios of the states side by side are not one
// group, the ids and the references between them stay unique and resolve, the saved card's live
// render has exactly one button to press, and what the server half hands to the client part
// serializes.

type Id = keyof typeof paymentMoleculeStories;

const story = (id: Id) => paymentMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (value: string) => value.replace(/\s/g, " ");
const decode = (value: string) =>
  value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const text = (markup: string) =>
  plain(decode(markup.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ")).trim();
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixtures = (locale: Locale) => commerceFixtures[locale];
const catalog = (locale: Locale) => catalogs[locale].molecules;
const radios = (markup: string) => markup.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];

const shippingId: Id = "molecules/shipping-option-card";
const paymentId: Id = "molecules/payment-method-card";
const savedId: Id = "molecules/saved-payment-method-card";

/**
 * What a server component returns, called as React would: inside a render, since it uses hooks.
 */
function returnedBy(node: ReactNode): ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node) || typeof node.type !== "function")
    throw new Error("not a component element");
  const component = node.type as (props: Record<string, unknown>) => ReactNode;
  const props = node.props;
  let returned: ReactNode = null;
  function Probe() {
    returned = component(props);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!isValidElement<Record<string, unknown>>(returned)) throw new Error("not an element");
  return returned;
}

/** The elements inside an element, depth first. */
function descendants(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...descendants(node.props["children"] as ReactNode)];
}

/** The saved card's element, whether the state draws it bare, in a list or in an overlay box. */
function savedCardsOf(node: ReactNode) {
  return descendants(node).filter(
    (element) =>
      typeof element.type === "function" && element.type.name === "SavedPaymentMethodCard",
  );
}

describe("the payment molecules' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(paymentMoleculeStories).sort()).toEqual(
      [shippingId, paymentId, savedId].sort(),
    );
    for (const [id, each] of Object.entries(paymentMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states each card needs", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(shippingId)).toEqual([
      "default",
      "chosen",
      "free",
      "pickup",
      "same-number-of-days",
      "no-estimate",
      "unavailable",
      "required",
      "long",
      "long-pickup",
    ]);
    expect(ids(paymentId)).toEqual([
      "card",
      "chosen",
      "wallet",
      "redirect",
      "no-marks",
      "disabled",
      "long",
    ]);
    expect(ids(savedId)).toEqual([
      "default",
      "other",
      "list",
      "expires-this-month",
      "expired",
      "no-holder",
      "long-holder",
      "confirmation",
      "confirmation-removing",
      "confirmation-error",
      "confirmation-page",
    ]);
  });

  it("name the selectors of the saved card's button and popup, which the interaction check presses", () => {
    const notes = story(savedId).a11y.join(" ");
    expect(notes).toContain('[data-slot="saved-payment-method-remove"]');
    expect(notes).toContain('[data-slot="saved-payment-method-confirm"]');
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(paymentMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it.each(LOCALES)(
    "keep every id unique and every reference resolving when the states sit together, in %s",
    (locale) => {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(
        <>
          {Object.values(paymentMoleculeStories).map((each, index) => (
            <div key={index}>
              {each.live(ctx)}
              {(each.states ?? []).map((part) => (
                <div key={part.id}>{part.render(ctx)}</div>
              ))}
            </div>
          ))}
        </>,
      );
      const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(ids.length).toBeGreaterThan(60);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
      for (const match of markup.matchAll(/ for="([^"]+)"/g)) expect(ids).toContain(match[1]);
      for (const match of markup.matchAll(/ aria-(?:labelledby|describedby)="([^"]+)"/g))
        for (const target of (match[1] ?? "").split(" ")) expect(ids).toContain(target);
    },
  );

  it.each(LOCALES)(
    "give every radio of a state a group of its own, so the states do not uncheck each other, in %s",
    (locale) => {
      const ctx = createContext(locale);
      for (const id of [shippingId, paymentId] as const) {
        const names = (story(id).states ?? []).flatMap((part) =>
          radios(renderToStaticMarkup(part.render(ctx))).map(
            (input) => input.match(/name="([^"]+)"/)?.[1],
          ),
        );
        expect(names, id).toHaveLength(story(id).states?.length ?? 0);
        expect(new Set(names).size, id).toBe(names.length);
      }
    },
  );
});

describe("ShippingOptionCard's live render and states", () => {
  it.each(LOCALES)("draws a fieldset of the five options, one chosen, in %s", (locale) => {
    const markup = renderToStaticMarkup(story(shippingId).live(createContext(locale)));
    expect(markup).toContain("<fieldset");
    expect(markup).toContain("<legend");
    const inputs = radios(markup);
    expect(inputs).toHaveLength(5);
    expect(inputs.filter((input) => input.includes('checked=""'))).toHaveLength(1);
    expect(inputs.filter((input) => input.includes('disabled=""'))).toHaveLength(1);
    expect(new Set(inputs.map((input) => input.match(/name="([^"]+)"/)?.[1]))).toEqual(
      new Set(["shipping"]),
    );
    for (const option of fixtures(locale).shippingOptions)
      expect(markup).toContain(`value="${option.id}"`);
  });

  it.each(LOCALES)("show what each state claims, in %s", (locale) => {
    const copy = catalog(locale).shippingOptionCard;
    const lang = htmlLang(locale);
    const { shippingOptions, long } = fixtures(locale);
    const option = (id: string) => shippingOptions.find((candidate) => candidate.id === id);

    const idle = html(shippingId, "default", locale);
    expect(idle).not.toContain('checked=""');
    expect(idle).not.toContain('disabled=""');
    expect(text(idle)).toContain(option("so_standard")?.name);
    expect(text(idle)).toContain(
      plain(formatMessage(copy.estimate, { minDays: 3, maxDays: 5 }, lang)),
    );

    expect(html(shippingId, "chosen", locale)).toContain('checked=""');

    const free = html(shippingId, "free", locale);
    expect(free).toContain('data-slot="shipping-option-free"');
    expect(text(free)).toContain(copy.free);
    expect(free).not.toContain('data-slot="price"');

    const pickup = html(shippingId, "pickup", locale);
    const place = option("so_pickup")?.pickup;
    expect(text(pickup)).toContain(
      plain(formatMessage(copy.pickup, { location: place?.locationName ?? "" }, lang)),
    );
    const address = place?.address;
    expect(address).toBeDefined();
    if (address !== undefined)
      expect(text(pickup)).toContain(
        plain(
          addressLines(address, lang)
            .map((line) => line.text)
            .join(", "),
        ),
      );

    const exact = html(shippingId, "same-number-of-days", locale);
    expect(text(exact)).toContain(plain(formatMessage(copy.estimateExact, { days: 2 }, lang)));
    expect(text(exact)).not.toContain(
      plain(formatMessage(copy.estimate, { minDays: 3, maxDays: 5 }, lang)),
    );

    const none = html(shippingId, "no-estimate", locale);
    expect(none).not.toMatch(/id="[^"]*-estimate"/);
    expect(text(none)).not.toContain(
      plain(formatMessage(copy.estimate, { minDays: 3, maxDays: 5 }, lang)),
    );

    const unavailable = html(shippingId, "unavailable", locale);
    expect(unavailable).toContain('disabled=""');
    expect(unavailable).toContain('data-available="false"');
    expect(text(unavailable)).toContain(copy.unavailable);
    expect(text(unavailable)).toContain(copy.sameDay);

    expect(html(shippingId, "required", locale)).toContain('required=""');

    const longMarkup = html(shippingId, "long", locale);
    expect(text(longMarkup)).toContain(plain(long.shippingOption.name));
    expect(longMarkup).toContain("wrap-break-word");
    expect(longMarkup).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);

    const longPickup = html(shippingId, "long-pickup", locale);
    expect(text(longPickup)).toContain(plain(createContext(locale).fixture.long.storeName));
    expect(longPickup).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);
  });
});

describe("PaymentMethodCard's live render and states", () => {
  it.each(LOCALES)("draws a fieldset of the six methods, one chosen, in %s", (locale) => {
    const markup = renderToStaticMarkup(story(paymentId).live(createContext(locale)));
    expect(markup).toContain("<fieldset");
    const inputs = radios(markup);
    expect(inputs).toHaveLength(6);
    expect(inputs.filter((input) => input.includes('checked=""'))).toHaveLength(1);
    for (const method of fixtures(locale).paymentMethods)
      expect(markup).toContain(`value="${method.id}"`);
  });

  it.each(LOCALES)("show what each state claims, in %s", (locale) => {
    const copy = catalog(locale).paymentMethodCard;
    const brands = catalogs[locale].atoms.payment;
    const lang = htmlLang(locale);
    const { paymentMethods, paymentSamples } = fixtures(locale);
    const named = (id: string) => paymentMethods.find((method) => method.id === id)?.name ?? "";
    const list = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format([
      brands.visa,
      brands.mastercard,
      brands.americanexpress,
    ]);

    const card = html(paymentId, "card", locale);
    expect(text(card)).toContain(plain(formatMessage(copy.accepts, { brands: list }, lang)));
    expect(card).toContain('data-slot="visually-hidden"');
    expect(card.match(/data-slot="payment-icon"/g)).toHaveLength(3);
    expect(card.match(/data-slot="payment-icon"[^>]*aria-hidden="true"/g)).toHaveLength(3);

    expect(html(paymentId, "chosen", locale)).toContain('checked=""');

    // The name says the brand: nothing is added.
    const wallet = html(paymentId, "wallet", locale);
    expect(text(wallet)).toContain(named("pp_stripe-applepay_stripe"));
    expect(wallet).not.toContain("aria-describedby");
    expect(wallet).not.toContain('data-slot="visually-hidden"');

    const redirect = html(paymentId, "redirect", locale);
    expect(text(redirect)).toContain(
      plain(formatMessage(copy.redirect, { name: named("pp_stripe-paypal_stripe") }, lang)),
    );
    expect(redirect).toContain('data-kind="redirect"');

    const none = html(paymentId, "no-marks", locale);
    expect(none).not.toContain('data-slot="payment-icon"');
    expect(none).not.toContain("aria-describedby");

    expect(html(paymentId, "disabled", locale)).toContain('disabled=""');

    const long = html(paymentId, "long", locale);
    expect(text(long)).toContain(plain(paymentSamples.longMethod.name));
    expect(long).toContain("wrap-break-word");
    expect(long).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);
  });
});

describe("SavedPaymentMethodCard's live render and states", () => {
  it.each(LOCALES)("draws one card with exactly one button to press, in %s", (locale) => {
    const markup = renderToStaticMarkup(story(savedId).live(createContext(locale)));
    expect(markup.match(/data-slot="saved-payment-method-card"/g)).toHaveLength(1);
    expect(markup.match(/data-slot="saved-payment-method-remove"/g)).toHaveLength(1);
    expect(markup.match(/<button/g)).toHaveLength(1);
  });

  it.each(LOCALES)("show what each state claims, in %s", (locale) => {
    const copy = catalog(locale).savedPaymentMethodCard;
    const brands = catalogs[locale].atoms.payment;
    const lang = htmlLang(locale);
    const { savedPaymentMethods, paymentSamples } = fixtures(locale);
    const words = (brand: keyof typeof brands, last4: string) =>
      plain(formatMessage(copy.card, { brand: brands[brand], last4 }, lang));

    const first = html(savedId, "default", locale);
    expect(text(first)).toContain(words("visa", "4242"));
    expect(text(first)).toContain(copy.default);
    expect(text(first)).toContain(plain(formatMessage(copy.expires, { date: "08/2028" }, lang)));
    expect(first).toContain("data-default");
    expect(text(first)).toContain(
      plain(formatMessage(copy.holder, { name: savedPaymentMethods[0]?.holderName ?? "" }, lang)),
    );
    const removeName = formatMessage(copy.removeNamed, { card: words("visa", "4242") }, lang);
    expect(plain(decode(first))).toContain(`aria-label="${plain(removeName)}"`);

    const other = html(savedId, "other", locale);
    expect(text(other)).toContain(words("mastercard", "4444"));
    expect(other).not.toContain("data-default");
    expect(other).not.toContain('data-slot="saved-payment-method-default"');

    const list = html(savedId, "list", locale);
    expect(list.match(/data-slot="saved-payment-method-card"/g)).toHaveLength(3);
    expect(list.match(/data-slot="saved-payment-method-remove"/g)).toHaveLength(3);
    expect(list.match(/<li>/g)).toHaveLength(3);

    const expiring = html(savedId, "expires-this-month", locale);
    expect(text(expiring)).toContain(plain(formatMessage(copy.expires, { date: "10/2026" }, lang)));
    expect(expiring).not.toContain("data-expired");

    const expired = html(savedId, "expired", locale);
    expect(text(expired)).toContain(plain(formatMessage(copy.expired, { date: "09/2026" }, lang)));
    expect(expired).toContain("data-expired");
    expect(expired).toContain("text-destructive");

    const anonymous = html(savedId, "no-holder", locale);
    expect(anonymous).not.toContain('data-slot="saved-payment-method-holder"');

    const long = html(savedId, "long-holder", locale);
    expect(text(long)).toContain(plain(paymentSamples.longHolderCard.holderName ?? ""));
    expect(long).toContain("wrap-break-word");
    expect(long).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);
  });

  it("judges the expiry by the fixtures' fixed now, in every locale", () => {
    for (const locale of LOCALES) {
      const { paymentSamples } = fixtures(locale);
      expect(paymentSamples.expiredCard.expiryYear).toBe(2026);
      expect(paymentSamples.expiredCard.expiryMonth).toBe(9);
      expect(paymentSamples.expiringCard.expiryMonth).toBe(10);
    }
    expect(fixtureNow.startsWith("2026-10")).toBe(true);
    for (const locale of LOCALES) {
      for (const part of story(savedId).states ?? []) {
        for (const card of savedCardsOf(part.render(createContext(locale)))) {
          expect(card.props["now"], `${locale} ${part.id}`).toBe(fixtureNow);
        }
      }
    }
  });

  it.each(LOCALES)("draw the confirmations open in an overlay box, non-modal, in %s", (locale) => {
    const ctx = createContext(locale);
    const wanted = {
      confirmation: undefined,
      "confirmation-removing": "removing",
      "confirmation-error": "error",
    } as const;
    for (const [stateId, status] of Object.entries(wanted)) {
      const node = state(savedId, stateId).render(ctx);
      const markup = renderToStaticMarkup(node);
      expect(markup, stateId).toContain("data-overlay-box");
      const [card, ...rest] = savedCardsOf(node);
      expect(rest, stateId).toHaveLength(0);
      expect(card?.props["defaultOpen"], stateId).toBe(true);
      expect(card?.props["modal"], stateId).toBe(false);
      expect(card?.props["status"], stateId).toBe(status);
    }
  });

  it.each(LOCALES)("leave the other states closed and modal, in %s", (locale) => {
    const ctx = createContext(locale);
    for (const part of story(savedId).states ?? []) {
      if (part.id.startsWith("confirmation") && part.id !== "confirmation-page") continue;
      for (const card of savedCardsOf(part.render(ctx))) {
        expect(card.props["defaultOpen"], part.id).toBeUndefined();
        expect(card.props["modal"], part.id).toBeUndefined();
      }
    }
  });

  it.each(LOCALES)("send the page without JavaScript to its confirmation, in %s", (locale) => {
    const markup = html(savedId, "confirmation-page", locale);
    const href = `${fixtures(locale).prefix}/account/payment-methods/spm_03/remove`;
    expect(markup).toContain(`action="${href}"`);
    expect(markup).toContain('method="get"');
    expect(markup).toMatch(/type="submit"[^>]*data-slot="saved-payment-method-remove"/);
    // The other states have no page to go to.
    expect(html(savedId, "default", locale)).not.toContain("<form");
  });

  it("hand the client part props that serialize, the DS posting nothing", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      for (const part of story(savedId).states ?? []) {
        for (const card of savedCardsOf(part.render(ctx))) {
          const remove = descendants(returnedBy(card)).find(
            (element) => element.type === SavedPaymentMethodRemove,
          );
          expect(remove, `${locale} ${part.id}`).toBeDefined();
          const props = remove?.props ?? {};
          expect(
            Object.values(props).filter((value) => typeof value === "function"),
            `${locale} ${part.id}`,
          ).toEqual([]);
          expect(JSON.parse(JSON.stringify(props)), `${locale} ${part.id}`).toEqual(props);
          expect(props["action"], `${locale} ${part.id}`).toBe("#");
          expect(props["paymentMethodId"], `${locale} ${part.id}`).toMatch(/^spm_/);
          // Every string the dialog says is the server's, formatted: nothing is left to format.
          const strings = props["copy"] as Record<string, string>;
          for (const [key, value] of Object.entries(strings))
            expect(value, `${locale} ${part.id} ${key}`).not.toMatch(/[{}]/);
        }
      }
    }
  });
});
