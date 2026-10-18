// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)").
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { CartDrawer } from "@shopblok/ui/organisms/cart-drawer";
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { PaymentStep } from "@shopblok/ui/organisms/payment-step";
import { QuickCartDropdown } from "@shopblok/ui/organisms/quick-cart-dropdown";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverlayBox } from "../components/overlay-box";
import { createContext } from "../context";
import { cartCheckoutOrganismStories } from "./organisms-cart-checkout";

// The stories of CartDrawer, QuickCartDropdown, CheckoutSteps, PaymentStep and OrderSummary (T39;
// D40, D41, D45): the states the task lists are there, each gives its component what its
// description says in every locale, the drawn-open overlays are in boxes of their own with the page
// behind usable, every link is told not to prefetch, every form posts to `#`, and the names of the
// states' landmarks and dialogs are apart. A story renders to static markup here (the storefront's
// tests have no DOM), so the open popups, which a server does not draw, are read in
// `organisms-cart-checkout.dom.test.tsx`, and what the components do is the ui package's tests.

const EM_DASH = String.fromCharCode(0x2014);
type Id = keyof typeof cartCheckoutOrganismStories;

const drawerId = "organisms/cart-drawer" as const;
const quickId = "organisms/quick-cart-dropdown" as const;
const stepsId = "organisms/checkout-steps" as const;
const paymentId = "organisms/payment-step" as const;
const summaryId = "organisms/order-summary" as const;

const story = (id: Id) => cartCheckoutOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const nodeOf = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
};
const html = (id: Id, stateId: string | undefined, locale: Locale) =>
  renderToStaticMarkup(nodeOf(id, stateId, locale));
const samples = (locale: Locale) => commerceFixtures[locale].cartCheckout;

/** Every element of this type that a story's node holds, however deep. */
function findAll<Props>(node: ReactNode, type: unknown): ReactElement<Props>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const here = node.type === type ? [node as ReactElement<Props>] : [];
  return [
    ...here,
    ...Children.toArray(node.props.children).flatMap((child) => findAll<Props>(child, type)),
  ];
}
function propsOf<Props>(node: ReactNode, type: unknown): Props {
  const [found] = findAll<Props>(node, type);
  if (found === undefined) throw new Error("the story does not draw the component");
  return found.props;
}

const stateIds = {
  [drawerId]: ["open", "empty", "line-updating", "code-refused", "many", "long"],
  [quickId]: ["open", "no-picture", "many", "long"],
  [stepsId]: ["contact", "delivery", "review", "long"],
  [paymentId]: [
    "saved",
    "card-chosen",
    "expired",
    "guest",
    "system",
    "required",
    "failed",
    "pending",
    "long",
  ],
  [summaryId]: ["collapsed", "open", "order", "long"],
} as const;
const ids = Object.keys(stateIds) as Id[];

describe("the cart and checkout organisms' stories", () => {
  it("are one for each of the five entries, each with a summary and a11y notes in sentences", () => {
    expect(Object.keys(cartCheckoutOrganismStories).sort()).toEqual([...ids].sort());
    for (const [id, each] of Object.entries(cartCheckoutOrganismStories)) {
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(2);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
        expect(note.trim().split(/\s+/).length, `${id}: ${note.slice(0, 30)}`).toBeGreaterThan(8);
      }
    }
  });

  it("have the states the task lists, each with a distinct id, label and description", () => {
    for (const id of ids) {
      const states = story(id).states;
      expect(states.map((each) => each.id)).toEqual(stateIds[id]);
      expect(new Set(states.map((each) => each.label)).size, id).toBe(states.length);
      for (const part of states) {
        expect(part.description?.trim().endsWith("."), `${id} ${part.id}`).toBe(true);
        // A label goes into an ICU message (a dialog's or a landmark's name).
        expect(part.label, `${id} ${part.id}`).not.toMatch(/['{}#]/);
      }
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(cartCheckoutOrganismStories)) {
      for (const text of [
        each.summary,
        ...each.a11y,
        ...each.states.flatMap((part) => [part.label, part.description ?? ""]),
      ])
        expect(text, id).not.toContain(EM_DASH);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    for (const id of ids) {
      for (const stateId of [undefined, ...stateIds[id]]) {
        const markup = html(id, stateId, locale);
        expect(markup.length, `${id} ${stateId}`).toBeGreaterThan(200);
        expect(markup, `${id} ${stateId}`).not.toContain("undefined");
        expect(markup, `${id} ${stateId}`).not.toContain("NaN");
        expect(markup, `${id} ${stateId}`).not.toContain(EM_DASH);
      }
    }
  });

  it("tell every link not to prefetch and post every form to #", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        for (const stateId of [undefined, ...stateIds[id]]) {
          const node = nodeOf(id, stateId, locale);
          for (const type of [CartDrawer, QuickCartDropdown, CheckoutSteps]) {
            for (const each of findAll<{ prefetch?: boolean | null }>(node, type))
              expect(each.props.prefetch, `${id} ${stateId}`).toBe(false);
          }
          for (const each of findAll<{ action?: unknown }>(node, PaymentStep))
            expect(each.props.action, `${id} ${stateId}`).toBe("#");
          for (const each of findAll<Record<string, unknown>>(node, CartDrawer)) {
            for (const key of [
              "updateAction",
              "removeAction",
              "applyCodeAction",
              "removeCodeAction",
            ])
              expect(each.props[key], `${id} ${stateId} ${key}`).toBe("#");
          }
        }
      }
    }
  });

  it("draw every open overlay in a box of its own, not modal and still, and the live renders closed", () => {
    for (const locale of LOCALES) {
      for (const [id, type] of [
        [drawerId, CartDrawer],
        [quickId, QuickCartDropdown],
      ] as const) {
        expect(
          propsOf<{ defaultOpen?: boolean }>(nodeOf(id, undefined, locale), type).defaultOpen,
        ).toBeUndefined();
        for (const stateId of stateIds[id]) {
          const node = nodeOf(id, stateId, locale);
          const props = propsOf<{
            defaultOpen?: boolean;
            modal?: boolean;
            popupClassName?: string;
          }>(node, type);
          if (props.defaultOpen !== true) continue;
          expect(findAll(node, OverlayBox), `${id} ${stateId}`).toHaveLength(1);
          expect(props.modal, `${id} ${stateId}`).toBe(false);
          expect(props.popupClassName, `${id} ${stateId}`).toContain("duration-0");
        }
      }
    }
  });

  it("cap the dropdown's popup in its box: the window's room means nothing below the fold", () => {
    for (const stateId of stateIds[quickId]) {
      const props = propsOf<{ popupClassName?: string }>(
        nodeOf(quickId, stateId, "en"),
        QuickCartDropdown,
      );
      expect(props.popupClassName).toMatch(/max-h-\[\d+rem\]/);
    }
  });

  it.each(LOCALES)(
    "name the states' dialogs and landmarks apart from each other, in %s",
    (locale) => {
      const names = (id: Id, pattern: RegExp) =>
        [undefined, ...stateIds[id]].flatMap((stateId) =>
          [...html(id, stateId, locale).matchAll(pattern)].map((match) => match[1]),
        );
      const steppers = names(stepsId, /<nav[^>]*aria-label="([^"]+)"/g);
      expect(new Set(steppers).size).toBe(steppers.length);
      const titles = [drawerId, quickId].flatMap((id) =>
        [undefined, ...stateIds[id]].map((stateId) => {
          const node = nodeOf(id, stateId, locale);
          const props = propsOf<{ copy: { title?: string; drawer?: { title: string } } }>(
            node,
            id === drawerId ? CartDrawer : QuickCartDropdown,
          );
          return props.copy.drawer?.title ?? props.copy.title;
        }),
      );
      expect(new Set(titles).size).toBe(titles.length);
      const summaries = [undefined, ...stateIds[summaryId]].map(
        (stateId) =>
          propsOf<{ copy: { title: string } }>(nodeOf(summaryId, stateId, locale), OrderSummary)
            .copy.title,
      );
      expect(new Set(summaries).size).toBe(summaries.length);
    },
  );
});

describe("the states give their components what their descriptions say", () => {
  it.each(LOCALES)(
    "the drawer: full, empty, a line held, a code refused, 120 items, in %s",
    (locale) => {
      type P = {
        cart: { itemCount: number; lines: unknown[] };
        pendingLineId?: string;
        promoError?: string;
      };
      const props = (stateId: string) => propsOf<P>(nodeOf(drawerId, stateId, locale), CartDrawer);
      expect(props("open").cart).toEqual(samples(locale).drawer.full.cart);
      expect(props("empty").cart.lines).toEqual([]);
      expect(props("line-updating").pendingLineId).toBe(
        samples(locale).drawer.full.cart.lines[0]?.id,
      );
      expect(props("code-refused").promoError).toBe("expired");
      expect(props("many").cart.itemCount).toBe(120);
      expect(html(drawerId, "many", locale)).toContain(">99+<");
    },
  );

  it.each(LOCALES)("the checkout: each step current in its state, in %s", (locale) => {
    for (const step of ["contact", "delivery", "review"] as const) {
      const props = propsOf<{ steps: { current: string }; headingLevel?: number }>(
        nodeOf(stepsId, step, locale),
        CheckoutSteps,
      );
      expect(props.steps.current).toBe(step);
      expect(props.headingLevel).toBe(4);
      expect(html(stepsId, step, locale)).toContain('aria-current="step"');
    }
    expect(
      propsOf<{ headingLevel?: number }>(nodeOf(stepsId, undefined, locale), CheckoutSteps)
        .headingLevel,
    ).toBe(3);
    // The delivery step holds the payment.
    expect(findAll(nodeOf(stepsId, "delivery", locale), PaymentStep)).toHaveLength(1);
  });

  it.each(LOCALES)(
    "the payment: saved, a card, expired, guest, none, errors, pending, in %s",
    (locale) => {
      type P = {
        saved: { expiryYear: number }[];
        methods: { id: string; kind: string }[];
        selected?: string;
        error?: string;
        status?: string;
        now: string;
      };
      const props = (stateId: string) =>
        propsOf<P>(nodeOf(paymentId, stateId, locale), PaymentStep);
      expect(props("saved").now).toBe(fixtureNow);
      expect(props("saved").selected).toBe(samples(locale).payment.saved.selected);
      expect(
        props("card-chosen").methods.find((each) => each.id === props("card-chosen").selected)
          ?.kind,
      ).toBe("card");
      expect(props("expired").saved[1]?.expiryYear).toBe(2026);
      expect(html(paymentId, "expired", locale)).toContain("09/2026");
      expect(props("guest").saved).toEqual([]);
      expect(props("system").methods).toEqual([]);
      expect(html(paymentId, "system", locale)).toContain('value="pp_system_default"');
      expect(props("required").error).toBe("required");
      expect(html(paymentId, "required", locale)).toContain(
        catalogs[locale].organisms.paymentStep.errors.required.replaceAll("'", "&#x27;"),
      );
      expect(props("failed").error).toBe("failed");
      expect(props("pending").status).toBe("pending");
    },
  );

  it.each(LOCALES)("the summary: collapsed, open, a placed order, in %s", (locale) => {
    type P = { defaultOpen?: boolean; rows: unknown[] };
    const props = (stateId: string) => propsOf<P>(nodeOf(summaryId, stateId, locale), OrderSummary);
    expect(props("collapsed").defaultOpen).toBeUndefined();
    expect(html(summaryId, "collapsed", locale)).toContain('aria-expanded="false"');
    expect(props("open").defaultOpen).toBe(true);
    expect(props("order").rows).toEqual(samples(locale).summary.order.rows);
  });
});
