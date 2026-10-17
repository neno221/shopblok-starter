// @vitest-environment happy-dom
import { catalogs } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { VisitorCartButton } from "./cart-button";
import { resetVisitor, setVisitor } from "./store";

// D44 (T35) and the PR 57 review: the island's live region is quiet when the number first arrives
// (a page load is not news) and speaks once it changes.

const copy = catalogs.en.organisms.header;
const region = () => document.querySelector('[data-slot="cart-count"]');

// React warns about act() unless the environment says it is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.replaceChildren();
  resetVisitor();
});

describe("the cart island in the browser", () => {
  it("shows the first number without announcing it, and announces each change after it", () => {
    const holder = document.body.appendChild(document.createElement("div"));
    root = createRoot(holder);
    act(() => root?.render(<VisitorCartButton href="/us/cart" copy={copy} locale="en-US" />));
    expect(region()?.textContent).toBe("");
    act(() => setVisitor({ cartCount: 3 }));
    expect(document.querySelector('[data-slot="cart-badge"]')?.textContent).toBe("3");
    expect(region()?.textContent).toBe("");
    act(() => setVisitor({ cartCount: 4 }));
    expect(region()?.textContent).toBe("Cart 4 items");
    act(() => setVisitor({ cartCount: 3 }));
    expect(region()?.textContent).toBe("Cart 3 items");
  });
});
