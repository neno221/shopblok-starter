import { catalogs } from "@shopblok/i18n";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VisitorCartButton } from "./cart-button";
import {
  getServerSnapshot,
  getSnapshot,
  resetVisitor,
  setCartCount,
  setConsent,
  setVisitor,
  subscribe,
} from "./store";

// D44 (T35, T36): the store, and the island's server render. That the number arrives after hydration is
// the design-system job's to check, in a browser (e2e/design-system.spec.ts, "the cart count").

const copy = catalogs.en.organisms.header;
const island = () => <VisitorCartButton href="/us/cart" copy={copy} locale="en-US" />;

afterEach(() => {
  resetVisitor();
});

describe("the visitor store", () => {
  it("starts unknown, and its server snapshot is unknown whatever it holds", () => {
    expect(getSnapshot()).toBe("unknown");
    setVisitor({ cartCount: 3, consent: null });
    expect(getSnapshot()).toMatchObject({ cartCount: 3, consent: null });
    expect(getServerSnapshot()).toBe("unknown");
  });

  it("tells its listeners about a change, and only about a change", () => {
    const listener = vi.fn();
    const stop = subscribe(listener);
    setVisitor({ cartCount: 2, consent: null });
    setVisitor({ cartCount: 2, consent: null });
    expect(listener).toHaveBeenCalledTimes(1);
    setVisitor({ cartCount: 5, consent: null });
    resetVisitor();
    resetVisitor();
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    setVisitor({ cartCount: 1, consent: null });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("keeps the same snapshot between changes (useSyncExternalStore compares with Object.is)", () => {
    setVisitor({ cartCount: 4, consent: null });
    const first = getSnapshot();
    expect(getSnapshot()).toBe(first);
    setVisitor({ cartCount: 4, consent: null });
    expect(getSnapshot()).toBe(first);
  });

  it("copies what it is given, so a caller cannot change it behind the listeners' backs", () => {
    const value = { cartCount: 1, consent: { analytics: true, marketing: false } };
    setVisitor(value);
    value.cartCount = 9;
    value.consent.marketing = true;
    expect(getSnapshot()).toMatchObject({
      cartCount: 1,
      consent: { analytics: true, marketing: false },
    });
  });

  it("records a choice about cookies for a known visitor, and tells its listeners once (T36)", () => {
    const listener = vi.fn();
    subscribe(listener);
    setConsent({ analytics: true, marketing: true });
    expect(getSnapshot()).toBe("unknown");
    expect(listener).not.toHaveBeenCalled();
    setVisitor({ cartCount: 2, consent: null });
    setConsent({ analytics: false, marketing: false });
    setConsent({ analytics: false, marketing: false });
    expect(getSnapshot()).toMatchObject({
      cartCount: 2,
      consent: { analytics: false, marketing: false },
    });
    expect(listener).toHaveBeenCalledTimes(2);
    setVisitor({ cartCount: 2, consent: { analytics: false, marketing: false } });
    expect(listener).toHaveBeenCalledTimes(2);
    setConsent({ analytics: true, marketing: false });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("changes the cart count and keeps the cookie choice (PR 58 review)", () => {
    setVisitor({ cartCount: 1, consent: null });
    setConsent({ analytics: true, marketing: false });
    setCartCount(5);
    expect(getSnapshot()).toMatchObject({
      cartCount: 5,
      consent: { analytics: true, marketing: false },
    });
  });
});

it("makes an unknown visitor known with the count of an add, so the badge shows it (PR 73 review)", () => {
  resetVisitor();
  setCartCount(4);
  expect(getSnapshot()).toMatchObject({ cartCount: 4, consent: null, customer: null });
});

describe("the cart island's server render", () => {
  it("has no number, even when the store holds one: a prerendered page is the same for everyone", () => {
    setVisitor({ cartCount: 3, consent: null });
    const html = renderToString(island());
    expect(html).toContain('data-slot="cart-count"');
    expect(html).not.toContain('data-slot="cart-badge"');
    expect(html.replace(/<[^>]*>/g, "")).toBe("Cart");
  });
});
