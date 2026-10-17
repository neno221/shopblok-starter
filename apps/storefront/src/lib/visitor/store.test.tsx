import { catalogs } from "@shopblok/i18n";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VisitorCartButton } from "./cart-button";
import { getServerSnapshot, getSnapshot, resetVisitor, setVisitor, subscribe } from "./store";

// D44 (T35): the store, and the island's server render. That the number arrives after hydration is
// the design-system job's to check, in a browser (e2e/design-system.spec.ts, "the cart count").

const copy = catalogs.en.organisms.header;
const island = () => <VisitorCartButton href="/us/cart" copy={copy} locale="en-US" />;

afterEach(() => {
  resetVisitor();
});

describe("the visitor store", () => {
  it("starts unknown, and its server snapshot is unknown whatever it holds", () => {
    expect(getSnapshot()).toBe("unknown");
    setVisitor({ cartCount: 3 });
    expect(getSnapshot()).toEqual({ cartCount: 3 });
    expect(getServerSnapshot()).toBe("unknown");
  });

  it("tells its listeners about a change, and only about a change", () => {
    const listener = vi.fn();
    const stop = subscribe(listener);
    setVisitor({ cartCount: 2 });
    setVisitor({ cartCount: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    setVisitor({ cartCount: 5 });
    resetVisitor();
    resetVisitor();
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    setVisitor({ cartCount: 1 });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("keeps the same snapshot between changes (useSyncExternalStore compares with Object.is)", () => {
    setVisitor({ cartCount: 4 });
    const first = getSnapshot();
    expect(getSnapshot()).toBe(first);
    setVisitor({ cartCount: 4 });
    expect(getSnapshot()).toBe(first);
  });

  it("copies what it is given, so a caller cannot change it behind the listeners' backs", () => {
    const value = { cartCount: 1 };
    setVisitor(value);
    value.cartCount = 9;
    expect(getSnapshot()).toEqual({ cartCount: 1 });
  });
});

describe("the cart island's server render", () => {
  it("has no number, even when the store holds one: a prerendered page is the same for everyone", () => {
    setVisitor({ cartCount: 3 });
    const html = renderToString(island());
    expect(html).toContain('data-slot="cart-count"');
    expect(html).not.toContain('data-slot="cart-badge"');
    expect(html.replace(/<[^>]*>/g, "")).toBe("Cart");
  });
});
