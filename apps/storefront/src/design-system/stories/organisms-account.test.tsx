// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)").
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { LOCALES, type Locale } from "@shopblok/i18n";
import { AccountNav } from "@shopblok/ui/organisms/account-nav";
import { AddressBook } from "@shopblok/ui/organisms/address-book";
import { OrderTable } from "@shopblok/ui/organisms/order-table";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import { PaymentMethodsManager } from "@shopblok/ui/organisms/payment-methods-manager";
import { ReturnRequestForm } from "@shopblok/ui/organisms/return-request-form";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { accountOrganismStories } from "./organisms-account";

// The stories of AccountNav, OrderTimeline, OrderTable, AddressBook, PaymentMethodsManager and
// ReturnRequestForm (T39; D40, D41): the states the task lists are there, each gives its component
// what its description says in every locale, every link is told not to prefetch, every form posts to
// `#`, and the states' landmarks are named apart. What the components do is the ui package's tests.

const EM_DASH = String.fromCharCode(0x2014);
type Id = keyof typeof accountOrganismStories;

const navId = "organisms/account-nav" as const;
const timelineId = "organisms/order-timeline" as const;
const tableId = "organisms/order-table" as const;
const bookId = "organisms/address-book" as const;
const walletId = "organisms/payment-methods-manager" as const;
const returnId = "organisms/return-request-form" as const;

const story = (id: Id) => accountOrganismStories[id];
const nodeOf = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  if (stateId === undefined) return story(id).live(ctx);
  const found = story(id).states.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found.render(ctx);
};
const html = (id: Id, stateId: string | undefined, locale: Locale) =>
  renderToStaticMarkup(nodeOf(id, stateId, locale));
const account = (locale: Locale) => commerceFixtures[locale].account;

function find<Props>(node: ReactNode, type: unknown): ReactElement<Props> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === type) return node as ReactElement<Props>;
  for (const child of Children.toArray(node.props.children)) {
    const found = find<Props>(child, type);
    if (found !== undefined) return found;
  }
  return undefined;
}
function propsOf<Props>(node: ReactNode, type: unknown): Props {
  const found = find<Props>(node, type);
  if (found === undefined) throw new Error("the story does not draw the component");
  return found.props;
}

const components = {
  [navId]: AccountNav,
  [timelineId]: OrderTimeline,
  [tableId]: OrderTable,
  [bookId]: AddressBook,
  [walletId]: PaymentMethodsManager,
  [returnId]: ReturnRequestForm,
} as const;
const stateIds = {
  [navId]: ["orders", "overview", "no-sign-out", "long"],
  [timelineId]: ["delivered", "paid", "canceled", "long"],
  [tableId]: ["orders", "many", "empty", "long"],
  [bookId]: ["full", "saving", "removing", "empty", "long"],
  [walletId]: ["cards", "expired", "saving", "no-add", "empty", "long"],
  [returnId]: ["blank", "filled", "returned", "errors", "failed", "sending", "long"],
} as const;
const ids = Object.keys(stateIds) as Id[];
const every = (id: Id) => [undefined, ...stateIds[id]];

describe("the account organisms' stories", () => {
  it("are one for each of the six entries, each with a summary and a11y notes in sentences", () => {
    expect(Object.keys(accountOrganismStories).sort()).toEqual([...ids].sort());
    for (const [id, each] of Object.entries(accountOrganismStories)) {
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
        expect(part.label, `${id} ${part.id}`).not.toMatch(/['{}#]/);
      }
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(accountOrganismStories)) {
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
      for (const stateId of every(id)) {
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
        for (const stateId of every(id)) {
          const props = propsOf<Record<string, unknown>>(
            nodeOf(id, stateId, locale),
            components[id],
          );
          if (id !== timelineId && id !== returnId)
            expect(props.prefetch, `${id} ${stateId}`).toBe(false);
          for (const key of ["action", "removeAction", "defaultAction", "signOutAction"])
            if (key in props) expect(props[key], `${id} ${stateId} ${key}`).toBe("#");
          const markup = html(id, stateId, locale);
          for (const match of markup.matchAll(/<form[^>]*>/g))
            expect(match[0], `${id} ${stateId}`).toContain('action="#"');
        }
      }
    }
  });

  it.each(LOCALES)("name each state's landmarks and lists apart, in %s", (locale) => {
    for (const id of ids) {
      const labels = every(id).map((stateId) =>
        propsOf<{ label?: string; copy?: { label?: string } }>(
          nodeOf(id, stateId, locale),
          components[id],
        ),
      );
      const names = labels.map((props) => props.label ?? props.copy?.label);
      expect(new Set(names).size, id).toBe(names.length);
    }
  });

  it("judge the cards' expiry by the fixtures' fixed now", () => {
    for (const stateId of every(walletId)) {
      expect(
        propsOf<{ now: string }>(nodeOf(walletId, stateId, "en"), PaymentMethodsManager).now,
      ).toBe(fixtureNow);
    }
  });
});

describe("the states give their components what their descriptions say", () => {
  it.each(LOCALES)("the navigation: orders, overview, no sign-out, in %s", (locale) => {
    expect(html(navId, "orders", locale)).toContain('aria-current="page"');
    expect(
      propsOf<{ current: string }>(nodeOf(navId, "overview", locale), AccountNav).current,
    ).toBe("overview");
    expect(html(navId, "no-sign-out", locale)).not.toContain("<form");
    expect(html(navId, undefined, locale)).toContain('method="post"');
  });

  it.each(LOCALES)("the timeline: delivered, paid, canceled, in %s", (locale) => {
    type P = { events: { kind: string }[] };
    const last = (stateId: string) =>
      propsOf<P>(nodeOf(timelineId, stateId, locale), OrderTimeline).events.at(-1)?.kind;
    expect(last("delivered")).toBe("delivered");
    expect(last("paid")).toBe("paid");
    expect(last("canceled")).toBe("canceled");
    expect(html(timelineId, "delivered", locale)).toContain('target="_blank"');
  });

  it.each(LOCALES)("the orders: two, six in every state, none, in %s", (locale) => {
    type P = { orders: { status: string; displayId: number }[] };
    const props = (stateId: string) => propsOf<P>(nodeOf(tableId, stateId, locale), OrderTable);
    expect(props("orders").orders).toEqual(account(locale).orders.list.orders);
    expect(props("many").orders.map((each) => each.status)).toEqual([
      "shipped",
      "fulfilled",
      "return-requested",
      "returned",
      "canceled",
      "placed",
    ]);
    expect(new Set(props("many").orders.map((each) => each.displayId)).size).toBe(6);
    expect(props("empty").orders).toEqual([]);
    expect(html(tableId, "orders", locale)).toContain("<table");
  });

  it.each(LOCALES)("the address book and the wallet: in flight and empty, in %s", (locale) => {
    type B = { pending?: { action: string }; entries: unknown[] };
    const book = (stateId: string) => propsOf<B>(nodeOf(bookId, stateId, locale), AddressBook);
    expect(book("saving").pending?.action).toBe("default");
    expect(book("removing").pending?.action).toBe("remove");
    expect(book("empty").entries).toEqual([]);
    type W = { pending?: { action: string }; cards: { expiryYear: number }[]; addHref?: string };
    const wallet = (stateId: string) =>
      propsOf<W>(nodeOf(walletId, stateId, locale), PaymentMethodsManager);
    expect(wallet("saving").pending?.action).toBe("default");
    expect(wallet("expired").cards[1]?.expiryYear).toBe(2026);
    expect(wallet("no-add").addHref).toBeUndefined();
    expect(wallet("empty").cards).toEqual([]);
  });

  it.each(LOCALES)(
    "the return: blank, filled, a line returned, errors, failed, sending, in %s",
    (locale) => {
      type P = {
        items: { returnable: number; quantityChosen: number }[];
        errors?: object;
        status?: string;
        reason?: string;
      };
      const props = (stateId: string) =>
        propsOf<P>(nodeOf(returnId, stateId, locale), ReturnRequestForm);
      expect(props("blank").items.every((item) => item.quantityChosen === 0)).toBe(true);
      expect(props("filled").reason).toBe("rr_too_small");
      expect(props("returned").items[0]?.returnable).toBe(0);
      expect(props("errors").errors).toEqual({ items: "required", reason: "required" });
      expect(props("failed").status).toBe("error");
      expect(props("sending").status).toBe("pending");
    },
  );
});
