// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remembered = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock("../../lib/actions/market", () => ({
  rememberMarket: vi.fn(async (input: unknown) => {
    remembered.calls.push(input);
    return { ok: true };
  }),
}));

import { resetVisitor, setVisitor, type VisitorSuggestion } from "../../lib/visitor/store";
import { MarketChoiceIsland, samePageIn } from "./market-choice-island";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const at = (href: string) => new URL(href);

describe("samePageIn (D66)", () => {
  it("keeps the path inside the market and the query, under the other market's home", () => {
    expect(samePageIn("/us", "/ch/fr", at("https://shop.test/ch/fr/products/tee?size=m"))).toBe(
      "/us/products/tee?size=m",
    );
    expect(samePageIn("/ch/fr", "/", at("https://shop.test/products/tee"))).toBe(
      "/ch/fr/products/tee",
    );
    expect(samePageIn("/", "/us", at("https://shop.test/us/cart"))).toBe("/cart");
  });

  it("goes to the other market's home from a home", () => {
    expect(samePageIn("/us", "/ch", at("https://shop.test/ch"))).toBe("/us");
    expect(samePageIn("/", "/us", at("https://shop.test/us/"))).toBe("/");
  });

  it("does not take a longer prefix for the market's own", () => {
    // `/ch` is not the start of `/christmas`'s path segment.
    expect(samePageIn("/us", "/ch", at("https://shop.test/christmas"))).toBe("/us");
  });

  it("gives the full URL of a market on another domain", () => {
    expect(samePageIn("https://shop.ch/", "/", at("https://shop.test/products/tee?x=1"))).toBe(
      "https://shop.ch/products/tee?x=1",
    );
  });
});

const markets = [
  { key: "el-cy", home: "/" },
  { key: "en-us", home: "/us" },
  { key: "fr-ch", home: "/ch/fr" },
];

let root: Root;
let container: HTMLElement;
const navigate = vi.fn();

function link(slot: string, href: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.dataset["slot"] = slot;
  anchor.setAttribute("href", href);
  anchor.append(document.createElement("span"));
  document.body.append(anchor);
  return anchor;
}

function click(element: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  element.dispatchEvent(event);
  return event;
}

const settle = () => act(async () => void (await Promise.resolve()));

beforeEach(async () => {
  // happy-dom follows a link when the click reaches it, before the click reaches the document; a
  // browser follows it after the dispatch, and only without `preventDefault`. The page stays put.
  const parent = Object.getPrototypeOf(HTMLAnchorElement.prototype) as HTMLElement;
  vi.spyOn(HTMLAnchorElement.prototype, "dispatchEvent").mockImplementation(function (
    this: HTMLAnchorElement,
    event: Event,
  ) {
    return parent.dispatchEvent.call(this, event);
  });
  remembered.calls = [];
  navigate.mockReset();
  resetVisitor();
  window.history.replaceState(null, "", "/ch/fr/products/tee?utm=1");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <MarketChoiceIsland
        current={{ key: "fr-ch", home: "/ch/fr" }}
        markets={markets}
        navigate={navigate}
      />,
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
  resetVisitor();
  vi.restoreAllMocks();
});

describe("MarketChoiceIsland (D66)", () => {
  it("records a switcher choice, then goes to the same page in that market", async () => {
    // The click lands on the link's child, as a click on its text does.
    const event = click(link("market-switcher-link", "/us").firstElementChild!);
    expect(event.defaultPrevented).toBe(true);
    await settle();
    expect(remembered.calls).toEqual([{ market: "en-us" }]);
    expect(navigate).toHaveBeenCalledWith("/us/products/tee?utm=1");
  });

  it("leaves a modified click to the browser, and a link to no known market", async () => {
    expect(click(link("market-switcher-link", "/us"), { metaKey: true }).defaultPrevented).toBe(
      false,
    );
    expect(click(link("market-switcher-link", "/xx")).defaultPrevented).toBe(false);
    expect(click(link("something-else", "/us")).defaultPrevented).toBe(false);
    await settle();
    expect(remembered.calls).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("records the suggested market when the visitor follows the banner", async () => {
    setVisitor({
      cartCount: 0,
      consent: null,
      suggestion: { market: "en-us" } as VisitorSuggestion,
    });
    const event = click(link("market-suggestion-go", "/us"));
    expect(event.defaultPrevented).toBe(true);
    await settle();
    expect(remembered.calls).toEqual([{ market: "en-us" }]);
    expect(navigate).toHaveBeenCalledWith("/us");
  });

  it("records the current market when the visitor stays", async () => {
    const stay = document.createElement("button");
    stay.dataset["slot"] = "market-suggestion-stay";
    document.body.append(stay);
    click(stay);
    await settle();
    expect(remembered.calls).toEqual([{ market: "fr-ch" }]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("stops listening when it unmounts", async () => {
    await act(async () => root.unmount());
    expect(click(link("market-switcher-link", "/us")).defaultPrevented).toBe(false);
    root = createRoot(container);
  });
});
