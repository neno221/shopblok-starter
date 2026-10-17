import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import { CartLineItem } from "@shopblok/ui/molecules/cart-line-item";
import type * as QuantityModule from "@shopblok/ui/molecules/cart-line-quantity";
import { FreeShippingProgress, shareReached } from "@shopblok/ui/molecules/free-shipping-progress";
import type * as DisclosureModule from "@shopblok/ui/molecules/promo-code-disclosure";
import { PromoCodeField } from "@shopblok/ui/molecules/promo-code-field";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createContext } from "../context";
import { cartMoleculeStories } from "./molecules-cart";

// What the two client parts are handed while a story renders: the mocks below call the real
// component and keep its props, because a story renders on the server and a prop that does not
// serialize (a function, a Date, a class) fails there and nowhere else.
const handed = vi.hoisted(() => ({
  quantity: [] as Record<string, unknown>[],
  disclosure: [] as Record<string, unknown>[],
}));
vi.mock("@shopblok/ui/molecules/cart-line-quantity", async (importOriginal) => {
  const original = await importOriginal<typeof QuantityModule>();
  return {
    ...original,
    CartLineQuantity: (props: Parameters<typeof original.CartLineQuantity>[0]) => {
      handed.quantity.push(props);
      return original.CartLineQuantity(props);
    },
  };
});
vi.mock("@shopblok/ui/molecules/promo-code-disclosure", async (importOriginal) => {
  const original = await importOriginal<typeof DisclosureModule>();
  return {
    ...original,
    PromoCodeDisclosure: (props: Parameters<typeof original.PromoCodeDisclosure>[0]) => {
      handed.disclosure.push(props);
      return original.PromoCodeDisclosure(props);
    },
  };
});

// The three cart molecules' stories (T34; D40): the states the plan lists are there, each one shows
// what its description says in every locale, the client parts get props that serialize, every link
// is told not to prefetch, and the ids of the states side by side never collide.

type Id = keyof typeof cartMoleculeStories;

const lineItem: Id = "molecules/cart-line-item";
const promoField: Id = "molecules/promo-code-field";
const freeShipping: Id = "molecules/free-shipping-progress";

const story = (id: Id) => cartMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
/** Text as `renderToStaticMarkup` writes it. */
const escaped = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string) => text.replace(/\s/g, " ");
const text = (markup: string) => plain(markup.replace(/<[^>]*>/g, "").replace(/\s+/g, " "));
const says = (markup: string, sentence: string) =>
  expect(text(markup)).toContain(plain(escaped(sentence)));
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixture = (locale: Locale) => commerceFixtures[locale];
const copy = (locale: Locale) => catalogs[locale].molecules;
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;

/** The elements of `type` in a story's node, found in the children the story wrote. */
function elementsOf(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap((child) => elementsOf(child, type));
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  const own = node.type === type ? [node] : [];
  return [...own, ...elementsOf(node.props["children"] as ReactNode, type)];
}
/** Every node a story renders: its live render and each state. */
function nodesOf(id: Id, locale: Locale): ReactNode[] {
  const ctx = createContext(locale);
  const { live, states = [] } = story(id);
  return [live(ctx), ...states.map((each) => each.render(ctx))];
}

describe("the cart molecules' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(cartMoleculeStories).sort()).toEqual([
      "molecules/cart-line-item",
      "molecules/free-shipping-progress",
      "molecules/promo-code-field",
    ]);
    for (const [id, each] of Object.entries(cartMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) expect(note.trim(), id).not.toBe("");
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(lineItem)).toEqual([
      "quantity-two",
      "sale",
      "low-stock",
      "at-limit",
      "out-of-stock",
      "pending",
      "no-image",
      "no-options",
      "long",
      "long-pending",
    ]);
    expect(ids(promoField)).toEqual([
      "closed",
      "code-typed",
      "applied",
      "two-applied",
      "error-invalid",
      "error-expired",
      "error-not-applicable",
      "error-already-applied",
      "error-failed",
      "applying",
      "removing",
      "long",
    ]);
    expect(ids(freeShipping)).toEqual(["empty", "partway", "almost", "reached", "large"]);
  });

  it("gives every state a label and a description of its own", () => {
    for (const id of Object.keys(cartMoleculeStories) as Id[]) {
      const states = story(id).states ?? [];
      expect(new Set(states.map((each) => each.label)).size, id).toBe(states.length);
      for (const each of states) {
        expect(each.label.trim(), `${id} ${each.id}`).not.toBe("");
        expect((each.description ?? "").trim(), `${id} ${each.id}`).not.toBe("");
      }
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(cartMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        // No English sentence in a locale that is not English (the catalog is the only source).
        if (locale !== "en") {
          expect(text(markup), `${id} ${part.id}`).not.toMatch(
            /Add a promotion code|Remove promotion|Free shipping|Quantity,|Out of stock/,
          );
        }
      }
    }
  });

  it.each(LOCALES)(
    "keep every id on a page unique when the states sit together, in %s",
    (locale) => {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(
        <>
          {Object.values(cartMoleculeStories).map((each, index) => (
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
      // Each label's `for`, and each name and description, points at an id that is there.
      for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls"])
        for (const match of markup.matchAll(new RegExp(` ${attribute}="([^"]+)"`, "g")))
          for (const target of (match[1] ?? "").split(" "))
            expect(ids, attribute).toContain(target);
    },
  );

  it("give the client parts props that serialize, and every link and form what the DS needs", () => {
    for (const locale of LOCALES) {
      handed.quantity.length = 0;
      handed.disclosure.length = 0;
      for (const id of [lineItem, promoField, freeShipping] as const) {
        for (const node of nodesOf(id, locale)) {
          renderToStaticMarkup(node as ReactElement);
          const server = [CartLineItem, PromoCodeField, FreeShippingProgress].flatMap((type) =>
            elementsOf(node, type),
          );
          expect(server.length, `${id} ${locale}`).toBeGreaterThan(0);
          for (const element of server) {
            const props = element.props;
            expect(
              Object.values(props).filter((value) => typeof value === "function"),
              `${id} ${locale}`,
            ).toEqual([]);
            expect(JSON.parse(JSON.stringify(props)), `${id} ${locale}`).toEqual(props);
            // The forms post to the page itself and the DS never submits one.
            for (const action of [
              props["updateAction"],
              props["removeAction"],
              props["applyAction"],
            ])
              if (action !== undefined) expect(action).toBe("#");
            // The product pages do not exist before M3: a prefetch of one would 404.
            if (element.type === CartLineItem) expect(props["prefetch"], locale).toBe(false);
          }
        }
      }
      expect(handed.quantity.length, locale).toBeGreaterThan(10);
      for (const props of handed.quantity) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
        expect(Object.keys(props).sort()).toEqual(
          [
            "decrementLabel",
            "disabled",
            "incrementLabel",
            "label",
            "locale",
            "max",
            "name",
            "pending",
            "quantity",
          ].filter((key) => key in props || key === "name"),
        );
      }
      expect(handed.disclosure.length, locale).toBeGreaterThan(10);
      for (const { children: _children, ...props } of handed.disclosure) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
        expect(typeof props["summary"]).toBe("string");
        expect(typeof props["needsOpen"]).toBe("boolean");
      }
    }
  });
});

describe("CartLineItem's states", () => {
  const id = lineItem;
  const lines = (locale: Locale) => fixture(locale).cart.lines;

  it("shows the cart's three lines in the live render, each its own article", () => {
    for (const locale of LOCALES) {
      const markup = renderToStaticMarkup(story(id).live(createContext(locale)));
      expect(count(markup, /<article /g)).toBe(3);
      for (const line of lines(locale)) says(markup, line.title);
      expect(count(markup, /<li /g)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const c = copy(locale).cartLineItem;
    const lang = htmlLang(locale);
    const { cartSamples, long } = fixture(locale);
    const money = (amount: number, currency: string) => formatMoney(amount, currency, lang);

    const two = html(id, "quantity-two", locale);
    expect(two).toContain('data-stock="in-stock"');
    expect(two).toContain('name="quantity" value="2"');
    expect(two).not.toContain('aria-busy="true"');
    expect(two).not.toContain('data-slot="stock-indicator"');
    says(two, money(lines(locale)[0]!.total.amount, lines(locale)[0]!.total.currencyCode));

    // A sale: the unit price and the one it replaces, each with its label.
    const sale = html(id, "sale", locale);
    const onSale = lines(locale)[1]!;
    expect(sale).toContain('data-slot="price-original"');
    says(sale, money(onSale.compareAtUnitPrice!.amount, onSale.compareAtUnitPrice!.currencyCode));
    says(sale, c.sale);
    says(sale, c.original);

    const low = html(id, "low-stock", locale);
    expect(low).toContain('data-stock="low"');
    says(low, formatMessage(c.stock.low, { count: 3 }, lang));

    // At the limit: the quantity is the stock and the stepper's plus is off.
    const limit = html(id, "at-limit", locale);
    expect(limit).toContain('name="quantity" value="3"');
    expect(limit).toMatch(/data-slot="quantity-stepper-increment"/);
    expect(limit).toMatch(
      /aria-disabled="true"[^>]*data-slot="quantity-stepper-increment"|data-slot="quantity-stepper-increment"[^>]*aria-disabled="true"/,
    );
    says(limit, formatMessage(c.stock.low, { count: 3 }, lang));

    // Out of stock: words and an icon, the field cannot change, removing still works.
    const out = html(id, "out-of-stock", locale);
    expect(out).toContain('data-stock="out"');
    says(out, c.stock.out);
    expect(out).toMatch(/<input[^>]*disabled=""[^>]*data-slot="quantity-stepper-input"/);
    expect(out).toContain('data-slot="cart-line-item-remove"');
    expect(out).toMatch(/<button type="submit"[^>]*data-slot="icon-button"/);

    // Updating: busy, the status line says so, the remove button is inert.
    const pending = html(id, "pending", locale);
    expect(pending).toContain('aria-busy="true"');
    expect(pending).toContain("data-pending");
    expect(text(pending)).toContain(plain(escaped(c.updating)));
    expect(pending).toMatch(
      /<button type="button"[^>]*aria-disabled="true"[^>]*data-slot="icon-button"/,
    );
    expect(pending).toMatch(/readOnly=""[^>]*data-slot="quantity-stepper-input"/);
    expect(html(id, "quantity-two", locale)).not.toContain(escaped(c.updating));

    // No picture: a frame, no image.
    const noImage = html(id, "no-image", locale);
    expect(noImage).not.toContain("<img");
    expect(noImage).toContain('data-slot="cart-line-item-no-image"');
    says(noImage, cartSamples.lines.noImage.title);
    expect(two).toContain("<img");

    // No options: no list, and the controls are named by the title alone.
    const none = html(id, "no-options", locale);
    expect(none).not.toContain('data-slot="cart-line-item-options"');
    expect(none).toContain(
      `aria-label="${escaped(formatMessage(c.remove, { line: cartSamples.lines.noOptions.title }, lang))}"`,
    );

    // The longest strings: the whole title in the link, clamped to two lines, and the options.
    const longMarkup = html(id, "long", locale);
    says(longMarkup, long.cartLine.title);
    expect(longMarkup).toContain("line-clamp-2");
    for (const option of long.cartLine.options) says(longMarkup, option.value);
    expect(longMarkup).not.toContain('aria-busy="true"');
    const longPending = html(id, "long-pending", locale);
    says(longPending, long.cartLine.title);
    expect(longPending).toContain('aria-busy="true"');
    expect(text(longPending)).toContain(plain(escaped(c.updating)));
  });

  it("posts both forms to the page itself, and puts the line's id in each", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(count(markup, /action="#"/g), part.id).toBe(3);
      expect(count(markup, /method="post"/g), part.id).toBe(3);
      expect(count(markup, /name="lineId"/g), part.id).toBe(3);
    }
  });

  it("shows the hoodie twice as two lines when the cart's own are rendered together", () => {
    const markup = renderToStaticMarkup(story(id).live(createContext("en")));
    expect(count(markup, /data-slot="cart-line-item-remove"/g)).toBe(3);
  });
});

describe("PromoCodeField's states", () => {
  const id = promoField;
  const open = (markup: string) => /<details[^>]* open=""/.test(markup);

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const c = copy(locale).promoCodeField;
    const lang = htmlLang(locale);
    const { promo } = fixture(locale).cartSamples;

    const closed = html(id, "closed", locale);
    expect(open(closed)).toBe(false);
    says(closed, c.toggle);
    expect(closed).not.toContain("<ul");
    expect(closed).toContain('data-slot="promo-code-field"');

    const typed = html(id, "code-typed", locale);
    expect(open(typed)).toBe(true);
    expect(typed).toContain(`value="${promo.typed.code}"`);
    expect(typed).not.toContain('aria-invalid="true"');

    // Applied: the code as a chip, what it takes off, a button to take it off.
    const applied = html(id, "applied", locale);
    expect(open(applied)).toBe(false);
    const first = promo.applied.applied[0]!;
    expect(applied).toContain(`>${first.code}</span>`);
    says(
      applied,
      formatMessage(
        c.saves,
        { amount: formatMoney(first.discount!.amount, first.discount!.currencyCode, lang) },
        lang,
      ),
    );
    expect(applied).toContain(
      `aria-label="${escaped(formatMessage(c.remove, { code: first.code }, lang))}"`,
    );
    expect(applied).toContain(`name="code"`);

    // Two applied: the second has no amount.
    const two = html(id, "two-applied", locale);
    expect(count(two, /data-slot="promo-code-chip"/g)).toBe(2);
    expect(count(two, /data-slot="promo-code-saves"/g)).toBe(1);
    expect(two).toContain(">FREESHIP</span>");

    // Each error: the message, the field invalid and described by it, the code kept.
    for (const [state, key] of [
      ["error-invalid", "invalid"],
      ["error-expired", "expired"],
      ["error-not-applicable", "notApplicable"],
      ["error-already-applied", "alreadyApplied"],
      ["error-failed", "failed"],
    ] as const) {
      const markup = html(id, state, locale);
      expect(open(markup), state).toBe(true);
      says(markup, c.errors[key]);
      expect(markup, state).toContain('aria-invalid="true"');
      const described = markup.match(/aria-describedby="([^"]+)"/)?.[1];
      expect(described, state).toBeTruthy();
      expect(markup, state).toContain(`id="${described}"`);
      expect(markup, state).toContain(
        state === "error-already-applied" ? 'value=""' : `value="${promo.typed.code}"`,
      );
    }
    // A code that is already applied is in its chip above the error.
    expect(count(html(id, "error-already-applied", locale), /data-slot="promo-code-chip"/g)).toBe(
      1,
    );

    // Applying: the button holds its place, the field is read-only, a hidden submit stands first.
    const applying = html(id, "applying", locale);
    expect(applying).toContain('data-pending="apply"');
    expect(applying).toMatch(/<button type="submit" disabled="" hidden=""/);
    expect(applying).toMatch(/<button type="button"[^>]*aria-disabled="true"/);
    expect(applying).toMatch(/readOnly=""/);
    expect(text(applying)).toContain(plain(escaped(c.applying)));
    expect(applying).toContain(`value="${promo.typed.code}"`);

    // Removing: the remove buttons are inert and the line says so.
    const removing = html(id, "removing", locale);
    expect(removing).toContain('data-pending="remove"');
    expect(removing).toMatch(
      /<button type="button"[^>]*aria-disabled="true"[^>]*data-slot="promo-code-remove-button"/,
    );
    expect(text(removing)).toContain(plain(escaped(c.removing)));
    expect(text(applying)).not.toContain(plain(escaped(c.removing)));

    // The longest code, applied and typed, with the longest error.
    const long = html(id, "long", locale);
    expect(long).toContain(`>${promo.long.code}</span>`);
    expect(long).toContain(`value="${promo.long.code}"`);
    expect(long).toContain("wrap-anywhere");
    says(long, c.errors.notApplicable);
    expect(open(long)).toBe(true);
  });

  it("shows the cart's own code in the live render", () => {
    const markup = renderToStaticMarkup(story(id).live(createContext("en")));
    expect(markup).toContain(">WELCOME10</span>");
    expect(text(markup)).toContain("Saves $12.60");
  });

  it("posts both forms to the page itself", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(count(markup, /action="#"/g), part.id).toBe(
        /data-slot="promo-code-remove"/.test(markup) ? 2 : 1,
      );
    }
  });

  it("has one apply form and at most one remove form in each state", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(count(markup, /data-slot="promo-code-apply"/g), part.id).toBe(1);
      expect(count(markup, /data-slot="promo-code-remove"/g), part.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("FreeShippingProgress's states", () => {
  const id = freeShipping;
  const value = (markup: string) => markup.match(/aria-valuenow="(\d+)"/)?.[1];

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const c = copy(locale).freeShippingProgress;
    const lang = htmlLang(locale);
    const { cart, cartSamples } = fixture(locale);
    const { freeShipping: samples } = cartSamples;
    const remaining = (amount: number, currency: string) =>
      formatMessage(c.remaining, { amount: formatMoney(amount, currency, lang) }, lang);

    // Nothing in the cart: the whole threshold is left, and the bar is empty.
    const empty = html(id, "empty", locale);
    says(empty, remaining(samples.empty.threshold.amount, samples.empty.threshold.currencyCode));
    expect(value(empty)).toBe("0");

    // The cart's own: what is left, and the share reached.
    const partway = html(id, "partway", locale);
    const own = cart.freeShipping!;
    says(partway, remaining(own.remaining.amount, own.remaining.currencyCode));
    expect(value(partway)).toBe(String(shareReached(own)));
    expect(Number(value(partway))).toBeGreaterThan(50);
    expect(Number(value(partway))).toBeLessThan(100);

    // Almost: under 100 until nothing is left.
    const almost = html(id, "almost", locale);
    says(almost, remaining(samples.almost.remaining.amount, samples.almost.remaining.currencyCode));
    expect(value(almost)).toBe("99");

    // Reached: the sentence, a full bar in the success colour, a check.
    const reached = html(id, "reached", locale);
    says(reached, c.reached);
    expect(value(reached)).toBe("100");
    expect(reached).toContain("data-reached");
    expect(reached).toContain("bg-success");
    expect(reached).toContain("lucide-circle-check");
    expect(text(reached)).not.toMatch(/\d/);
    for (const other of [empty, partway, almost]) {
      expect(other).not.toContain("data-reached");
      expect(other).toContain("lucide-truck");
    }

    // Seven digits: the amount in the sentence in full.
    const large = html(id, "large", locale);
    says(large, remaining(samples.large.remaining.amount, samples.large.remaining.currencyCode));
    expect(text(large)).toMatch(/987\D?654/);
  });

  it("keeps a status region in each state, for the sentence to change in", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(markup, part.id).toContain('role="status"');
      expect(markup, part.id).toContain('role="progressbar"');
      expect(markup, part.id).toContain("aria-labelledby=");
    }
  });

  it("shows the cart's own in the live render", () => {
    const markup = renderToStaticMarkup(story(id).live(createContext("en")));
    expect(text(markup)).toContain("Add $39.00 more for free shipping");
    expect(value(markup)).toBe("76");
  });
});
