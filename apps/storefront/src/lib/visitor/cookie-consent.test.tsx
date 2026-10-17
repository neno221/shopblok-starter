// @vitest-environment happy-dom
// Ours (T36, SETUP.md "Footers and site organisms (T36)"). The storefront's tests have no DOM and no
// Testing Library, so the pragma above runs this file in happy-dom (a peer of the installed Vitest;
// the app does not list it itself) and the island is driven with react-dom and `act`.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitorCookieConsent, type VisitorCookieConsentProps } from "./cookie-consent";
import { getSnapshot, resetVisitor, setVisitor } from "./store";

// D44 (T36): the cookie banner as an island. The storefront's tests have no Testing Library, so this
// file runs in happy-dom (the comment above) and drives React with `act` and the DOM by hand. What the
// organism does with the choice it is given (the buttons, the dialog, the focus, the reserved
// space) is the ui package's test; this one is about the store: nothing on the server, the banner
// after hydration when the visitor has not chosen, and each answer recorded and the banner gone.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { site } = commerceFixtures.en;
const props: VisitorCookieConsentProps = {
  ...site.cookieConsent.copy,
  copy: catalogs.en.organisms.cookieConsent,
  locale: "en-US",
  prefetch: false,
};
const island = (more: Partial<VisitorCookieConsentProps> = {}) => (
  <VisitorCookieConsent {...props} {...more} />
);

const roots: { root: Root; container: HTMLElement }[] = [];

/** Mounts the island in the page the way a client render does. */
async function mount(more?: Partial<VisitorCookieConsentProps>) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () => root.render(island(more)));
  return container;
}

beforeEach(() => {
  resetVisitor();
});

afterEach(async () => {
  for (const { root, container } of roots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  resetVisitor();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
  vi.restoreAllMocks();
});

const slot = (name: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const banner = () => slot("cookie-consent");
const click = async (element: HTMLElement | null) => {
  if (element === null) throw new Error("nothing to click");
  await act(async () => element.click());
};

/** Lets the dialog finish opening or closing: Base UI waits for the popup's animations. */
async function settle(until: () => boolean) {
  for (let attempt = 0; attempt < 50 && !until(); attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  expect(until()).toBe(true);
}

/** Opens the dialog from the banner's "choose" button. */
async function openDialog() {
  await click(slot("cookie-consent-choose"));
  await settle(() => slot("cookie-consent-dialog") !== null);
}

const switchOf = (category: "analytics" | "marketing") =>
  document.querySelector<HTMLElement>(
    `[data-slot="cookie-consent-category"][data-category="${category}"] [data-slot="cookie-consent-switch"]`,
  );
/**
 * A press on a category's label, which is around its switch and toggles it. The switch itself is
 * not clicked with `element.click()`: happy-dom answers a click that reaches a label from inside it
 * with a second click on the control, so the switch toggles twice, which a browser does not do
 * (checked in Chromium). The ui package's tests press the switch with user-event.
 */
const toggle = (category: "analytics" | "marketing") =>
  switchOf(category)?.closest<HTMLElement>("label") ?? null;

describe("VisitorCookieConsent", () => {
  describe("before the browser knows the visitor", () => {
    it("draws nothing on the server, even when the store holds a visitor who has not chosen", () => {
      setVisitor({ cartCount: 0, consent: null });
      expect(getSnapshot()).toEqual({ cartCount: 0, consent: null });
      expect(renderToString(island())).toBe("");
    });

    it("draws nothing in the browser while the store does not know the visitor", async () => {
      expect(getSnapshot()).toBe("unknown");
      const container = await mount();
      expect(container.innerHTML).toBe("");
      expect(banner()).toBeNull();
    });

    it("hydrates the server's empty markup with no mismatch, then shows the banner", async () => {
      // The store holds the visitor when the page is hydrated: the first render still draws nothing.
      setVisitor({ cartCount: 0, consent: null });
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(island());
      expect(container.innerHTML).toBe("");
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      let root!: Root;
      await act(async () => {
        root = hydrateRoot(container, island(), { onRecoverableError });
      });
      roots.push({ root, container });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      // `useSyncExternalStore` renders the client snapshot straight after hydration.
      expect(banner()).not.toBeNull();
      expect(banner()?.getAttribute("aria-label")).toBe(catalogs.en.organisms.cookieConsent.region);
    });
  });

  describe("once the browser knows the visitor", () => {
    it("draws the banner when the visitor has not chosen", async () => {
      await mount();
      expect(banner()).toBeNull();
      await act(async () => setVisitor({ cartCount: 0, consent: null }));
      expect(banner()).not.toBeNull();
      expect(slot("cookie-consent-accept")).not.toBeNull();
      expect(slot("cookie-consent-reject")).not.toBeNull();
      expect(slot("cookie-consent-choose")).not.toBeNull();
    });

    it.each([
      ["accepted", { analytics: true, marketing: true }],
      ["rejected", { analytics: false, marketing: false }],
      ["partly", { analytics: true, marketing: false }],
    ])("draws nothing for a visitor who has chosen (%s)", async (_name, consent) => {
      await mount();
      await act(async () => setVisitor({ cartCount: 2, consent }));
      expect(banner()).toBeNull();
    });

    it("goes when the visitor is forgotten, and comes back with the next one", async () => {
      await mount();
      await act(async () => setVisitor({ cartCount: 0, consent: null }));
      expect(banner()).not.toBeNull();
      await act(async () => resetVisitor());
      expect(banner()).toBeNull();
      await act(async () => setVisitor({ cartCount: 0, consent: null }));
      expect(banner()).not.toBeNull();
    });

    it("hands its props on: the policy link and the shop's own sentence", async () => {
      await mount({ ...site.cookieConsent.message });
      await act(async () => setVisitor({ cartCount: 0, consent: null }));
      const message = slot("cookie-consent-message");
      expect(message?.textContent).toContain(site.cookieConsent.message.message);
      const link = message?.querySelector("a");
      expect(link?.getAttribute("href")).toBe(site.cookieConsent.message.policyHref);
    });
  });

  describe("recording what the visitor chose", () => {
    const visit = async () => {
      await mount();
      await act(async () => setVisitor({ cartCount: 4, consent: null }));
      expect(banner()).not.toBeNull();
    };

    it("accept all records both and the banner goes", async () => {
      await visit();
      await click(slot("cookie-consent-accept"));
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: true, marketing: true },
      });
      expect(banner()).toBeNull();
    });

    it("reject all records neither and the banner goes", async () => {
      await visit();
      await click(slot("cookie-consent-reject"));
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: false, marketing: false },
      });
      expect(banner()).toBeNull();
    });

    it("save records the switches as the visitor left them, and the banner goes", async () => {
      await visit();
      await openDialog();
      await click(toggle("analytics"));
      expect(switchOf("analytics")?.getAttribute("aria-checked")).toBe("true");
      expect(switchOf("marketing")?.getAttribute("aria-checked")).toBe("false");
      await click(slot("cookie-consent-dialog-save"));
      await settle(() => banner() === null);
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: true, marketing: false },
      });
      expect(slot("cookie-consent-dialog")).toBeNull();
    });

    it("save with the switches as they were records a rejection (nothing is on until the visitor says so)", async () => {
      await visit();
      await openDialog();
      expect(switchOf("analytics")?.getAttribute("aria-checked")).toBe("false");
      expect(switchOf("marketing")?.getAttribute("aria-checked")).toBe("false");
      await click(slot("cookie-consent-dialog-save"));
      await settle(() => banner() === null);
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: false, marketing: false },
      });
    });

    it("saves the marketing switch alone, and both together", async () => {
      await visit();
      await openDialog();
      await click(toggle("marketing"));
      await click(slot("cookie-consent-dialog-save"));
      await settle(() => banner() === null);
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: false, marketing: true },
      });
    });

    it("the dialog's accept all and reject all record what the banner's do", async () => {
      await visit();
      await openDialog();
      await click(slot("cookie-consent-dialog-accept"));
      await settle(() => banner() === null);
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: true, marketing: true },
      });
      await act(async () => setVisitor({ cartCount: 4, consent: null }));
      await openDialog();
      await click(slot("cookie-consent-dialog-reject"));
      await settle(() => banner() === null);
      expect(getSnapshot()).toEqual({
        cartCount: 4,
        consent: { analytics: false, marketing: false },
      });
    });

    it("closing the dialog without an answer records nothing, and the banner stays", async () => {
      await visit();
      await openDialog();
      await click(toggle("analytics"));
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      await settle(() => slot("cookie-consent-dialog") === null);
      expect(getSnapshot()).toEqual({ cartCount: 4, consent: null });
      expect(banner()).not.toBeNull();
    });

    it("keeps the cart's count, which is not the banner's to change", async () => {
      await visit();
      await click(slot("cookie-consent-accept"));
      const visitor = getSnapshot();
      expect(visitor === "unknown" ? undefined : visitor.cartCount).toBe(4);
    });

    it("takes the banner away from every island on the page, not only the one that was used", async () => {
      await mount();
      await mount();
      await act(async () => setVisitor({ cartCount: 0, consent: null }));
      expect(document.querySelectorAll('[data-slot="cookie-consent"]')).toHaveLength(2);
      await click(document.querySelector<HTMLElement>('[data-slot="cookie-consent-reject"]'));
      expect(document.querySelectorAll('[data-slot="cookie-consent"]')).toHaveLength(0);
    });
  });
});

describe("the file", () => {
  const source = readFileSync(path.join(import.meta.dirname, "cookie-consent.tsx"), "utf8");

  it("is a client module (it reads a store with a hook)", () => {
    expect(source).toMatch(/^"use client";?$/m);
  });

  it("wraps the ui organism and the store, and nothing else of ours", () => {
    expect(source).toContain('from "@shopblok/ui/organisms/cookie-consent"');
    expect(source).toContain('from "./store"');
    expect(source).toContain('from "./use-visitor"');
    expect(source).not.toMatch(
      /@shopblok\/(?:fixtures|registry\/(?!contracts)|i18n["'/](?!format))/,
    );
  });

  it("uses no em dash", () => {
    expect(source).not.toContain(String.fromCharCode(0x2014));
  });
});
