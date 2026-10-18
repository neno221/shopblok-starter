// @vitest-environment happy-dom
// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). The stories of CartDrawer,
// QuickCartDropdown, CheckoutSteps, PaymentStep, OrderSummary and the account's six, rendered the
// way the design-system page renders them: in a browser DOM (happy-dom, driven with react-dom and
// `act`, as `organisms-product-page.dom.test.tsx` does). `organisms-cart-checkout.test.tsx` and
// `organisms-account.test.tsx` read what each story gives the component; this file checks what
// comes out: that the drawn-open sheets and popovers really are open, each in its own box (a portal
// that `renderToStaticMarkup` does not draw) and taking no focus, that their dialogs are named
// apart, that a page with the live render and every state has no id twice, and that nothing is
// logged. Pixels and axe are the design-system job's browser check.
import { LOCALES, type Locale } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContext } from "../context";
import type { DsStory } from "../types";
import { accountOrganismStories } from "./organisms-account";
import { cartCheckoutOrganismStories } from "./organisms-cart-checkout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const all: Record<string, DsStory> = { ...cartCheckoutOrganismStories, ...accountOrganismStories };

const roots: { root: Root; container: HTMLElement }[] = [];
const logged: string[] = [];

beforeEach(() => {
  logged.length = 0;
  for (const kind of ["error", "warn"] as const) {
    vi.spyOn(console, kind).mockImplementation((...args: unknown[]) => {
      const text = args.map(String).join(" ");
      // next/image's development check of a `fill` picture reads its parent's computed style, and
      // this DOM has no stylesheet (T38's note).
      if (/has "fill" and (parent element with invalid "position"|a height value of 0)/.test(text))
        return;
      logged.push(`${kind}: ${text.slice(0, 300)}`);
    });
  }
});

/** Lets Base UI open a popup: it waits for animation frames. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

async function mount(id: string, locale: Locale) {
  const ctx = createContext(locale);
  const story = all[id] as DsStory;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () =>
    root.render(
      <div>
        <section data-live="">{story.live(ctx)}</section>
        {(story.states ?? []).map((part) => (
          <section key={part.id} data-state={part.id}>
            {part.render(ctx)}
          </section>
        ))}
      </div>,
    ),
  );
  await settle();
  return container;
}

afterEach(async () => {
  for (const { root, container } of roots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
  const messages = [...logged];
  vi.restoreAllMocks();
  expect(messages).toEqual([]);
});

const stateOf = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-state="${id}"]`) as HTMLElement;
const slot = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const box = (root: ParentNode) => root.querySelector<HTMLElement>("[data-overlay-box]");
const duplicateIds = (root: ParentNode) => {
  const seen = new Map<string, number>();
  for (const element of root.querySelectorAll("[id]"))
    seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
  return [...seen].filter(([, times]) => times > 1).map(([id]) => id);
};
const nameOf = (element: HTMLElement) =>
  (element.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();

describe.each([
  ["organisms/cart-drawer", "cart-drawer", "cart-drawer-trigger"],
  ["organisms/quick-cart-dropdown", "quick-cart", "quick-cart-trigger"],
])("%s's stories, rendered", (id, popupSlot, triggerSlot) => {
  it.each(LOCALES)(
    "draw each open state in its own box, taking no focus, and the live render closed, in %s",
    async (locale) => {
      const container = await mount(id, locale);
      const live = container.querySelector<HTMLElement>("[data-live]") as HTMLElement;
      expect(slot(live, triggerSlot)).not.toBeNull();
      expect(slot(live, popupSlot)).toBeNull();
      const names: string[] = [];
      for (const part of (all[id] as DsStory).states ?? []) {
        const section = stateOf(container, part.id);
        const overlay = box(section);
        if (overlay === null) continue;
        const popup = slot(section, popupSlot);
        expect(popup, part.id).not.toBeNull();
        expect(overlay.contains(popup), part.id).toBe(true);
        expect(popup?.getAttribute("role"), part.id).toBe("dialog");
        expect(popup?.getAttribute("aria-modal"), part.id).not.toBe("true");
        expect(popup?.contains(document.activeElement), part.id).toBe(false);
        names.push(nameOf(popup as HTMLElement));
      }
      expect(names.length).toBeGreaterThan(2);
      expect(new Set(names).size).toBe(names.length);
      expect(duplicateIds(document)).toEqual([]);
    },
  );
});

describe("the polite region of the dropdown's states", () => {
  it("is in every state and empty: a popover drawn open says nothing", async () => {
    const container = await mount("organisms/quick-cart-dropdown", "en");
    const regions = [...container.querySelectorAll<HTMLElement>('[data-slot="quick-cart-status"]')];
    expect(regions.length).toBe((all["organisms/quick-cart-dropdown"]?.states ?? []).length + 1);
    for (const region of regions) expect(region.textContent).toBe("");
  });
});

describe("every T39 story, rendered with all its states", () => {
  const ids = [
    "organisms/checkout-steps",
    "organisms/payment-step",
    "organisms/order-summary",
    "organisms/account-nav",
    "organisms/order-timeline",
    "organisms/order-table",
    "organisms/address-book",
    "organisms/payment-methods-manager",
    "organisms/return-request-form",
  ];
  it.each(ids)(
    "has no id twice and logs nothing: %s",
    async (id) => {
      for (const locale of LOCALES) {
        await mount(id, locale);
        expect(duplicateIds(document), `${id} ${locale}`).toEqual([]);
        for (const { root, container } of roots.splice(0)) {
          await act(async () => root.unmount());
          container.remove();
        }
      }
    },
    30_000,
  );

  it("names the radios of the payment states apart: each state is a group of its own", async () => {
    const container = await mount("organisms/payment-step", "en");
    const forms = [...container.querySelectorAll("form")];
    const checked = forms.map(
      (form) => form.querySelectorAll('input[type="radio"]:checked').length,
    );
    // Radios of one name in different forms are different groups: each form keeps its own choice.
    expect(checked.filter((count) => count > 1)).toEqual([]);
    const saved = stateOf(container, "saved").querySelector<HTMLInputElement>(
      'input[type="radio"]:checked',
    );
    expect(saved?.value).toBe("spm_01");
  });
});
