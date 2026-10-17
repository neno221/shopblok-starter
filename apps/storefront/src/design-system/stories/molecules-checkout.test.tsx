import { commerceFixtures } from "@shopblok/fixtures";
import {
  catalogs,
  countryName,
  formatMessage,
  formatMoney,
  LOCALES,
  type Locale,
} from "@shopblok/i18n";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { checkoutMoleculeStories } from "./molecules-checkout";

// The four checkout molecules' stories (T34; D40): the states the plan lists are there, each one
// shows what its description says in every locale, the one client part gets props that serialize (a
// story renders on the server), the steppers' links do not prefetch, and the ids of the states side
// by side never collide.

type Id = keyof typeof checkoutMoleculeStories;

const story = (id: Id) => checkoutMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string) => text.replace(/\s/g, " ");
/**
 * React escapes `'` and the others in text, and Intl writes `'` between thousands in fr-CH where
 * its ICU data says so (Node 22's on the CI runner), so the text is decoded before it is compared.
 */
const entities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
};
const decode = (text: string) =>
  text.replace(/&(?:amp|lt|gt|quot|#x27);/g, (all) => entities[all] ?? all);
const text = (markup: string) =>
  plain(decode(markup.replace(/<[^>]*>/g, "").replace(/\s+/g, " ")));
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const flow = (locale: Locale) => commerceFixtures[locale].checkoutFlow;
const catalog = (locale: Locale) => catalogs[locale].molecules;
const MINUS = "−";
const SECOND_UNIT = (locale: Locale, count: number) =>
  new Intl.NumberFormat(htmlLang(locale), {
    style: "unit",
    unit: "second",
    unitDisplay: "short",
  }).format(count);

const ids = [
  "molecules/order-summary-row",
  "molecules/shipping-estimator",
  "molecules/stepper",
  "molecules/verification-notice",
] as const;

/** Every element below `node`, depth first, as the story built it (no component is called). */
function descendants(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...descendants(node.props["children"] as ReactNode)];
}

/**
 * What a server component returns, with its elements below it. It is called inside a component's
 * render, as React would, because it uses hooks (`useId`).
 */
function rendered(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(node) || typeof node.type !== "function")
    throw new Error("not a component element");
  const component = node.type as (props: Record<string, unknown>) => ReactNode;
  const { props } = node;
  let found: ReactElement<Record<string, unknown>>[] = [];
  function Probe() {
    found = descendants(component(props));
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return found;
}

describe("the checkout molecules' stories", () => {
  it("are one for each of the four entries, each with a summary and a11y notes", () => {
    expect(Object.keys(checkoutMoleculeStories).sort()).toEqual([...ids]);
    for (const [id, each] of Object.entries(checkoutMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const stateIds = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(stateIds("molecules/order-summary-row")).toEqual([
      "subtotal",
      "discount",
      "shipping-pending",
      "shipping-paid",
      "shipping-free",
      "tax",
      "total",
      "long-detail",
      "large",
      "narrow",
    ]);
    expect(stateIds("molecules/stepper")).toEqual([
      "first-step",
      "second-step",
      "last-step",
      "five-steps",
      "long-labels",
      "narrow",
    ]);
    expect(stateIds("molecules/shipping-estimator")).toEqual([
      "empty",
      "one-country",
      "answered",
      "none",
      "postal-code-error",
      "lookup-failed",
      "long",
    ]);
    expect(stateIds("molecules/verification-notice")).toEqual([
      "waiting",
      "ready",
      "sending",
      "resent",
      "error",
      "long",
    ]);
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(checkoutMoleculeStories)) {
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
    "keep every id on a page unique when the states sit together, in %s",
    (locale) => {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(
        <>
          {Object.values(checkoutMoleculeStories).map((each, index) => (
            <div key={index}>
              {each.live(ctx)}
              {(each.states ?? []).map((part) => (
                <div key={part.id}>{part.render(ctx)}</div>
              ))}
            </div>
          ))}
        </>,
      );
      const found = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(found.length).toBeGreaterThan(20);
      expect(found.filter((id, index) => found.indexOf(id) !== index)).toEqual([]);
      // Each label's `for` and each reference points at an id that is there.
      for (const match of markup.matchAll(/ for="([^"]+)"/g)) expect(found).toContain(match[1]);
      for (const match of markup.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g))
        for (const reference of (match[1] ?? "").split(" ")) expect(found).toContain(reference);
    },
  );

  it("give the one client part props that serialize, and the stepper's links a prefetch of false", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      const notice = story("molecules/verification-notice");
      for (const node of [
        notice.live(ctx),
        ...(notice.states ?? []).map((each) => each.render(ctx)),
      ]) {
        // The server component's own props, then what it hands to the client component.
        const server = node as ReactElement<Record<string, unknown>>;
        expect(server.props["action"], `${locale}`).toBe("#");
        const client = rendered(node).filter((element) => typeof element.type === "function");
        expect(client, `${locale}`).toHaveLength(1);
        for (const props of [client[0]?.props ?? {}]) {
          expect(
            Object.values(props).filter((value) => typeof value === "function"),
            `${locale}`,
          ).toEqual([]);
          expect(JSON.parse(JSON.stringify(props)), `${locale}`).toEqual(props);
        }
      }
      const steps = story("molecules/stepper");
      for (const node of [steps.live(ctx), ...(steps.states ?? []).map((each) => each.render(ctx))])
        expect((node as ReactElement<Record<string, unknown>>).props["prefetch"], locale).toBe(
          false,
        );
    }
  });
});

describe("OrderSummaryRow's states", () => {
  const id = "molecules/order-summary-row";

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).orderSummaryRow;
    const { summary } = flow(locale);
    const money = (amount: number | undefined, currency: string | undefined) =>
      plain(formatMoney(amount ?? 0, currency ?? "", htmlLang(locale)));
    const code = summary.discount.detail ?? "";

    const subtotal = html(id, "subtotal", locale);
    expect(subtotal).toContain('data-kind="subtotal"');
    expect(text(subtotal)).toContain(copy.subtotal);
    expect(text(subtotal)).toContain(
      money(summary.subtotal.amount?.amount, summary.subtotal.amount?.currencyCode),
    );

    // The code beside the label, and the amount taken off with the real minus sign.
    const discount = html(id, "discount", locale);
    expect(discount).toContain('data-kind="discount"');
    expect(text(discount)).toContain(
      plain(
        formatMessage(copy.withDetail, { label: copy.discount, detail: code }, htmlLang(locale)),
      ),
    );
    expect(discount).toContain(`>${MINUS}`);
    expect(discount).toContain("text-success");
    expect(discount).not.toMatch(/>-[^<]*\d/);

    const pending = html(id, "shipping-pending", locale);
    expect(text(pending)).toContain(copy.pending);
    expect(pending).toContain("order-summary-row-pending");

    const paid = html(id, "shipping-paid", locale);
    expect(text(paid)).toContain(
      money(summary.shippingPaid.amount?.amount, summary.shippingPaid.amount?.currencyCode),
    );
    expect(text(paid)).not.toContain(copy.free);

    const free = html(id, "shipping-free", locale);
    expect(text(free)).toContain(copy.free);

    const tax = html(id, "tax", locale);
    expect(tax).toContain('data-kind="tax"');
    if (summary.tax.amount === undefined) expect(text(tax)).toContain(copy.pending);
    else
      expect(text(tax)).toContain(
        money(summary.tax.amount.amount, summary.tax.amount.currencyCode),
      );

    // The total is emphasised by a rule, a size and a weight.
    const total = html(id, "total", locale);
    expect(total).toContain("border-t");
    expect(total).toContain("text-xl");
    expect(total).toContain("font-semibold");
    expect(text(total)).toContain(
      money(summary.total.amount?.amount, summary.total.amount?.currencyCode),
    );

    const long = html(id, "long-detail", locale);
    expect(long).toContain(`>${summary.longDetail.detail}</span>`);
    expect(long).toContain("wrap-anywhere");

    const large = html(id, "large", locale);
    expect(text(large)).toContain(money(1234567.89, summary.large.amount?.currencyCode));

    const narrow = html(id, "narrow", locale);
    expect(narrow).toContain("w-44");
    expect(narrow).toContain(`>${summary.longDetail.detail}</span>`);
  });

  it("puts every row in a description list, as the organism will", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(story(id).live(ctx));
      expect(markup.startsWith("<dl"), locale).toBe(true);
      for (const part of story(id).states ?? [])
        expect(
          renderToStaticMarkup(part.render(ctx)).startsWith("<dl"),
          `${locale} ${part.id}`,
        ).toBe(true);
    }
  });

  it("shows a whole summary in the live render: subtotal, discount, shipping, tax, total", () => {
    const markup = renderToStaticMarkup(story(id).live(createContext("en")));
    expect([...markup.matchAll(/data-kind="([a-z]+)"/g)].map((match) => match[1])).toEqual([
      "subtotal",
      "discount",
      "shipping",
      "tax",
      "total",
    ]);
    // Shipping is not chosen, so its amount is not known, and the total is the cart's own.
    expect(text(markup)).toContain("Calculated at the next step");
    expect(text(markup)).toContain(`Discount (WELCOME10)${MINUS}$`);
  });
});

describe("Stepper's states", () => {
  const id = "molecules/stepper";
  const current = (markup: string) =>
    [...markup.matchAll(/<li[^>]*aria-current="step"[^>]*data-step="([^"]+)"/g)].map(
      (match) => match[1],
    );
  const items = (markup: string) => [...markup.matchAll(/<li /g)].length;
  const links = (markup: string) =>
    [...markup.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).stepper;
    const { steps } = flow(locale);
    const prefix = commerceFixtures[locale].prefix;

    const first = html(id, "first-step", locale);
    expect(first).toContain(`aria-label="${copy.label}"`);
    expect(first).toContain("<ol");
    expect(items(first)).toBe(3);
    expect(current(first)).toEqual(["contact"]);
    expect(links(first)).toEqual([]);
    expect(text(first)).toContain(
      plain(formatMessage(copy.position, { step: 1, count: 3 }, htmlLang(locale))),
    );

    const second = html(id, "second-step", locale);
    expect(current(second)).toEqual(["delivery"]);
    expect(links(second)).toEqual([`${prefix}/checkout/contact`]);
    expect(text(second)).toContain(plain(copy.completed));
    expect(text(second)).toContain(
      plain(formatMessage(copy.position, { step: 2, count: 3 }, htmlLang(locale))),
    );

    const last = html(id, "last-step", locale);
    expect(current(last)).toEqual(["review"]);
    expect(links(last)).toEqual([`${prefix}/checkout/contact`, `${prefix}/checkout/delivery`]);

    const five = html(id, "five-steps", locale);
    expect(items(five)).toBe(5);
    expect(current(five)).toEqual(["payment"]);
    expect(links(five)).toHaveLength(3);
    expect(five).toContain("@3xl:not-sr-only");

    const long = html(id, "long-labels", locale);
    expect(items(long)).toBe(4);
    for (const step of steps.long.steps) expect(text(long)).toContain(plain(step.label));
    expect(long).toContain("wrap-anywhere");

    const narrow = html(id, "narrow", locale);
    expect(narrow).toContain("w-48");
    expect(current(narrow)).toEqual(["delivery"]);
  });

  it("is a navigation of an ordered list and no set of tabs, in every state", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(markup, part.id).toContain("<nav");
      expect(markup, part.id).not.toContain('role="tablist"');
      expect(markup, part.id).not.toContain('role="tab"');
    }
  });

  it("names the steps in the language of the page, SPEC 8.4's three in the live render", () => {
    expect(text(renderToStaticMarkup(story(id).live(createContext("en"))))).toContain(
      "Contact and address, completed",
    );
    expect(text(renderToStaticMarkup(story(id).live(createContext("de"))))).toContain(
      "Kontakt und Adresse, abgeschlossen",
    );
  });
});

describe("ShippingEstimator's states", () => {
  const id = "molecules/shipping-estimator";

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).shippingEstimator;
    const { estimator } = flow(locale);
    const place = (code: string, postalCode: string) => ({
      country: countryName(code, htmlLang(locale)),
      postalCode,
    });

    const empty = html(id, "empty", locale);
    expect(empty).toContain('method="get"');
    expect(empty).toContain(`action="${commerceFixtures[locale].prefix}/cart"`);
    expect(empty).toContain('autoComplete="country"');
    expect(empty).toContain('autoComplete="postal-code"');
    expect(empty).toContain(">" + copy.countryPlaceholder + "</option>");
    expect(empty).toContain('value=""');
    // The region's countries, named by Intl, in the order given.
    for (const code of estimator.empty.countries)
      expect(empty).toContain(`>${countryName(code, htmlLang(locale))}</option>`);
    expect(text(empty)).not.toContain(plain(copy.free));

    const single = html(id, "one-country", locale);
    expect(single).not.toContain(copy.countryPlaceholder);
    expect([...single.matchAll(/<option /g)]).toHaveLength(1);

    const answered = html(id, "answered", locale);
    expect(answered).toContain(`value="${estimator.answered.postalCode}"`);
    expect(text(answered)).toContain(
      plain(
        formatMessage(
          copy.results,
          place(estimator.answered.countryCode ?? "", estimator.answered.postalCode),
          htmlLang(locale),
        ),
      ),
    );
    const available = (estimator.answered.options ?? []).filter((option) => option.available);
    expect([...answered.matchAll(/data-slot="shipping-estimator-option"/g)]).toHaveLength(
      available.length,
    );
    for (const option of available) expect(text(answered)).toContain(plain(option.name));
    const unavailable = (estimator.answered.options ?? []).find((option) => !option.available);
    expect(unavailable).toBeDefined();
    expect(text(answered)).not.toContain(plain(unavailable?.name ?? ""));
    expect(text(answered)).toContain(plain(copy.free));

    const none = html(id, "none", locale);
    expect(text(none)).toContain(
      plain(formatMessage(copy.none, place("gb", "M2 5BQ"), htmlLang(locale))),
    );
    expect(none).not.toContain("<ul");

    const refused = html(id, "postal-code-error", locale);
    expect(refused).toContain('aria-invalid="true"');
    expect(text(refused)).toContain(plain(copy.errors.postalCode));
    expect(refused).toContain(`value="${estimator.mistaken.postalCode}"`);
    const described = refused.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(described).toBeTruthy();
    expect(refused).toContain(`id="${described}"`);

    const failed = html(id, "lookup-failed", locale);
    expect(text(failed)).toContain(plain(copy.errors.failed));
    expect(failed).not.toContain("<ul");
    expect(failed).not.toContain('aria-invalid="true"');

    const long = html(id, "long", locale);
    expect(text(long)).toContain(plain(commerceFixtures[locale].long.shippingOption.name));
  });

  it("is a status region in every state, polite, that is in the page from the start", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(markup, part.id).toContain('role="status"');
      expect(markup, part.id).toContain('aria-live="polite"');
    }
  });
});

describe("VerificationNotice's states", () => {
  const id = "molecules/verification-notice";

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).verificationNotice;
    const { verification } = flow(locale);
    const sentence = (email: string) =>
      plain(formatMessage(copy.sent, { email }, htmlLang(locale)));
    const wait = (count: number) =>
      plain(formatMessage(copy.cooldown, { time: SECOND_UNIT(locale, count) }, htmlLang(locale)));

    const waiting = html(id, "waiting", locale);
    expect(waiting).toContain('data-status="sent"');
    expect(waiting).toContain('method="post"');
    expect(waiting).toContain('action="#"');
    expect(waiting).toContain(
      `<input type="hidden" name="email" value="${verification.waiting.email}"/>`,
    );
    expect(text(waiting)).toContain(sentence(verification.waiting.email));
    expect(text(waiting)).toContain(plain(copy.spam));
    expect(text(waiting)).toContain(wait(42));
    // Unavailable but findable: aria-disabled, not disabled, and a button that submits nothing.
    expect(waiting).toContain('aria-disabled="true"');
    expect(waiting).toContain('type="button"');
    expect(waiting).not.toContain('type="submit"');
    expect(waiting).toContain(">" + copy.resend + "</span>");

    const ready = html(id, "ready", locale);
    expect(ready).toContain('type="submit"');
    expect(ready).not.toContain('aria-disabled="true"');
    expect(text(ready)).not.toContain(wait(0));
    expect(ready).not.toContain("verification-notice-cooldown");

    const sending = html(id, "sending", locale);
    expect(sending).toContain('data-status="sending"');
    expect(sending).toContain('aria-busy="true"');
    expect(sending).toContain('aria-disabled="true"');
    expect(sending).toContain(`>${copy.sending}</span>`);

    const resent = html(id, "resent", locale);
    expect(resent).toContain('data-status="resent"');
    expect(text(resent)).toContain(plain(copy.resent));
    expect(text(resent)).toContain(wait(42));

    const error = html(id, "error", locale);
    expect(error).toContain('data-status="error"');
    expect(text(error)).toContain(plain(copy.error));
    // The resend is still offered.
    expect(error).toContain('type="submit"');

    const long = html(id, "long", locale);
    expect(long).toContain(`>${verification.long.email}</span>`);
    expect(long).toContain("wrap-anywhere");
    expect(text(long)).toContain(plain(copy.error));
    expect(text(long)).toContain(sentence(verification.long.email));
  });

  it("is a status region in every state, polite, that is in the page from the start", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(markup, part.id).toContain('role="status"');
      expect(markup, part.id).toContain('aria-live="polite"');
    }
  });

  it("counts from the server's number: the markup has the wait the data gives, not the clock's", () => {
    // Rendering twice gives the same markup: nothing in it comes from the time.
    expect(html(id, "waiting", "en")).toBe(html(id, "waiting", "en"));
    expect(text(html(id, "waiting", "en"))).toContain(`in ${SECOND_UNIT("en", 42)}`);
  });
});
