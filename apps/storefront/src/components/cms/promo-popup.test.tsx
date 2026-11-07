// @vitest-environment happy-dom
// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D44; WCAG 2.1.2,
// 2.4.3, 2.4.11). The promo popup's island in the browser: nothing before the cookie choice, then
// the card once per offer at the window's corner (portalled to `<body>`), named by its heading,
// taking no focus, keeping its height clear at the page's end, and gone with its button or Escape
// (not an Escape a modal dialog takes) and on the next page.
import { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPromoPopups } from "../../lib/visitor/promo-popups";
import { resetVisitor, setVisitor } from "../../lib/visitor/store";
import { PromoPopup } from "./promo-popup";

// `next/dynamic` is Next's bundler's; here the card's module is loaded the way React loads one.
vi.mock("next/dynamic", async () => {
  const { lazy } = await import("react");
  return { default: (load: Parameters<typeof lazy>[0]) => lazy(load) };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
const card = () => document.querySelector<HTMLElement>("[data-slot=promo-popup]");
const answered = { cartCount: 0, consent: { analytics: false, marketing: false } };

async function mount(offer = "offer-1") {
  if (document.getElementById("before") === null)
    document.body.insertAdjacentHTML("afterbegin", '<a href="/x" id="before">Before</a>');
  const holder = document.body.appendChild(document.createElement("div"));
  const root = createRoot(holder);
  roots.push(root);
  await act(async () =>
    root.render(
      <Suspense>
        <PromoPopup offer={offer} labelledBy="offer-heading" closeLabel="Close">
          <h2 id="offer-heading">Ten off</h2>
          <button type="button">Copy the code</button>
        </PromoPopup>
      </Suspense>,
    ),
  );
  // The card's module, loaded by the lazy component.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return root;
}

/** Waits for the card's module and its first render. */
async function shows() {
  for (let tries = 0; tries < 100 && card() === null; tries += 1)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  expect(card()).not.toBeNull();
}

const unmountAll = () => {
  for (const root of roots.splice(0)) act(() => root.unmount());
};

beforeEach(() => {
  window.localStorage.clear();
  resetPromoPopups();
});

afterEach(() => {
  unmountAll();
  document.body.replaceChildren();
  document.documentElement.removeAttribute("style");
  resetVisitor();
});

describe("the promo popup's island (T82)", () => {
  it("shows nothing while the visitor is unknown or the cookie banner is unanswered", async () => {
    await mount();
    expect(card()).toBeNull();
    await act(async () => setVisitor({ cartCount: 0, consent: null }));
    expect(card()).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("after the cookie choice: the card at the end of <body>, named by its heading, taking no focus", async () => {
    await mount();
    const before = document.getElementById("before") as HTMLElement;
    before.focus();
    await act(async () => setVisitor(answered));
    await shows();
    const shown = card();
    expect(shown).not.toBeNull();
    expect(shown?.parentElement).toBe(document.body);
    expect(shown?.getAttribute("aria-labelledby")).toBe("offer-heading");
    expect(shown?.className).toContain("fixed");
    expect(document.activeElement).toBe(before);
    // Its height is kept clear at the page's end (WCAG 2.4.11).
    expect(document.documentElement.style.getPropertyValue("scroll-padding-block-end")).not.toBe(
      "",
    );
  });

  it("goes with its close button, giving focus back to where it came from", async () => {
    await mount();
    await act(async () => setVisitor(answered));
    await shows();
    const before = document.getElementById("before") as HTMLElement;
    before.focus();
    const close = card()?.querySelector<HTMLButtonElement>("[data-slot=promo-popup-close]");
    expect(close?.getAttribute("aria-label")).toBe("Close");
    close?.focus();
    // happy-dom's focus() does not say where focus came from; the card reads it from `focusin`.
    close?.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: before }));
    await act(async () => close?.click());
    expect(card()).toBeNull();
    expect(document.activeElement).toBe(before);
    expect(document.documentElement.style.getPropertyValue("scroll-padding-block-end")).toBe("");
  });

  it("goes with Escape, but not an Escape a modal dialog takes", async () => {
    await mount();
    await act(async () => setVisitor(answered));
    await shows();
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("aria-modal", "true");
    await act(async () =>
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(card()).not.toBeNull();
    await act(async () =>
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(card()).toBeNull();
  });

  it("shows an offer once: not on the next page, nor after a reload, even if never closed", async () => {
    await mount();
    await act(async () => setVisitor(answered));
    await shows();
    expect(card()).not.toBeNull();
    // The next page: this popup goes, another mounts for the same offer.
    unmountAll();
    await mount();
    expect(card()).toBeNull();
    // A reload: what this module read is gone, the storage is not.
    unmountAll();
    resetPromoPopups();
    await mount();
    expect(card()).toBeNull();
    // Another offer still shows.
    await mount("offer-2");
    await shows();
  });

  it("shows nothing when storage cannot be read", async () => {
    const getItem = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    await mount();
    await act(async () => setVisitor(answered));
    expect(card()).toBeNull();
    getItem.mockRestore();
  });
});
