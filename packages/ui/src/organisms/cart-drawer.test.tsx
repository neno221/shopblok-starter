// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). CartDrawer's tests, in Testing
// Library and happy-dom: the cart button (its name with the count, the badge for the eye, 99+), the
// sheet (a modal dialog named by its title, focus on the close button, the lines, the free-shipping
// bar, the promotion field, the summary, the note and the two links that close it), the empty cart,
// the keyboard (Enter and Space open it, ONE Escape closes it and gives the focus back, Tab stays
// inside), the sheet drawn open for the design system, a long German and Greek label, and the four
// catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { CartDrawer as CartDrawerContent } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { CartDrawer, type CartDrawerProps } from "./cart-drawer";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale): CartDrawerProps["copy"] => ({
  drawer: catalogs[locale].organisms.cartDrawer,
  line: catalogs[locale].molecules.cartLineItem,
  promo: catalogs[locale].molecules.promoCodeField,
  freeShipping: catalogs[locale].molecules.freeShippingProgress,
  rows: catalogs[locale].molecules.orderSummaryRow,
});
const drawerOf = (locale: Locale, which: "full" | "empty" = "full"): CartDrawerContent =>
  commerceFixtures[locale].cartCheckout.drawer[which];
/** A name matcher that ignores the space happy-dom's name computation puts before a comma. */
const named = (expected: string) => (name: string) => name.replace(/\s+,/g, ",") === expected;
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

function element(
  locale: Locale = "en",
  which: "full" | "empty" = "full",
  props: Partial<CartDrawerProps> = {},
) {
  return (
    <>
      <button type="button">Before</button>
      <CartDrawer
        {...drawerOf(locale, which)}
        copy={copyOf(locale)}
        locale={htmlLang[locale]}
        prefetch={false}
        {...props}
      />
      <button type="button">After</button>
    </>
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const trigger = () => slot("cart-drawer-trigger") as HTMLButtonElement;
const sheet = () => slot("cart-drawer");
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

async function openSheet(
  locale: Locale = "en",
  which: "full" | "empty" = "full",
  props: Partial<CartDrawerProps> = {},
) {
  render(element(locale, which, props));
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(sheet()).not.toBeNull());
  return { user, opener };
}

const followed: string[] = [];
function follow(event: Event) {
  const anchor = (event.target as Element).closest("a");
  if (anchor === null) return;
  followed.push(anchor.getAttribute("href") ?? "");
  event.preventDefault();
}
beforeEach(() => {
  followed.length = 0;
  document.addEventListener("click", follow);
});
afterEach(() => {
  document.removeEventListener("click", follow);
});

describe("CartDrawer: the button", () => {
  it.each(LOCALES)("is named 'Cart' and what it holds, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale).drawer;
    const count = drawerOf(locale).cart.itemCount;
    const items = formatMessage(copy.items, { count }, htmlLang[locale]);
    const button = screen.getByRole("button", { name: named(`${copy.open}, ${items}`) });
    expect(button).toBe(trigger());
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    const badge = slot("cart-drawer-badge") as HTMLElement;
    expect(badge.getAttribute("aria-hidden")).toBe("true");
    expect(badge.textContent).toBe(String(count));
  });

  it("says an empty cart is empty and draws no badge", () => {
    render(element("en", "empty"));
    expect(screen.getByRole("button", { name: named("Cart, empty") })).toBe(trigger());
    expect(slot("cart-drawer-badge")).toBeNull();
  });

  it("writes more than 99 as 99+", () => {
    const full = drawerOf("en");
    render(element("en", "full", { cart: { ...full.cart, itemCount: 120 } }));
    expect(slot("cart-drawer-badge")?.textContent).toBe("99+");
    expect(screen.getByRole("button", { name: named("Cart, 120 items") })).toBeTruthy();
  });

  it("is 44 px, draws a hidden icon and takes the page's classes", () => {
    render(element("en", "full", { triggerClassName: "md:hidden" }));
    expect(trigger().className).toContain("size-11");
    expect(trigger().className).toContain("md:hidden");
    expect(trigger().className).toContain("focus-visible:ring-ring");
    expect(trigger().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders on the server as the button alone", () => {
    const html = renderToString(element("en"));
    expect(html).toContain('data-slot="cart-drawer-trigger"');
    expect(html).not.toContain('role="dialog"');
  });

  it.each([["{Enter}"], [" "]])("opens the sheet on %j", async (key) => {
    render(element("en"));
    const user = userEvent.setup();
    trigger().focus();
    await user.keyboard(key);
    await waitFor(() => expect(sheet()).not.toBeNull());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("CartDrawer: the sheet", () => {
  it.each(LOCALES)(
    "is a dialog named by its title, with the count beside it, in %s",
    async (locale) => {
      await openSheet(locale);
      const copy = copyOf(locale).drawer;
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBe(sheet());
      const count = formatMessage(
        copy.count,
        { count: drawerOf(locale).cart.itemCount },
        htmlLang[locale],
      );
      expect(plain(slot("cart-drawer-header")?.textContent ?? "")).toContain(plain(count));
      expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(copy.title);
      expect(screen.getByRole("button", { name: copy.close })).toBe(slot("cart-drawer-close"));
    },
  );

  it("moves the focus to the close button, the first stop", async () => {
    await openSheet("en");
    expect(document.activeElement).toBe(slot("cart-drawer-close"));
  });

  it.each(LOCALES)(
    "lists every line, the bar to free shipping and the code field, in %s",
    async (locale) => {
      await openSheet(locale);
      const copy = copyOf(locale).drawer;
      const list = screen.getByRole("list", { name: copy.lines });
      expect(
        within(list)
          .getAllByRole("listitem", { hidden: false })
          .filter((each) => each.parentElement === list),
      ).toHaveLength(drawerOf(locale).cart.lines.length);
      for (const line of drawerOf(locale).cart.lines)
        expect(within(list).getAllByText(line.title).length).toBeGreaterThan(0);
      expect(sheet()?.querySelector('[data-slot="free-shipping-progress"]')).not.toBeNull();
      expect(sheet()?.querySelector('[data-slot="promo-code-field"]')).not.toBeNull();
    },
  );

  it.each(LOCALES)(
    "ends with the summary, the note and two links that close it, in %s",
    async (locale) => {
      const { user } = await openSheet(locale);
      const copy = copyOf(locale).drawer;
      const cart = drawerOf(locale).cart;
      const foot = slot("cart-drawer-foot") as HTMLElement;
      const summary = slot("cart-drawer-summary") as HTMLElement;
      expect(summary.tagName.toLowerCase()).toBe("dl");
      expect(summary.getAttribute("aria-label")).toBe(copy.summary);
      expect(plain(summary.textContent ?? "")).toContain(
        plain(formatMoney(cart.total.amount, cart.total.currencyCode, htmlLang[locale])),
      );
      expect(foot.textContent).toContain(copy.note);
      const checkout = within(foot).getByRole("link", { name: copy.checkout });
      const view = within(foot).getByRole("link", { name: copy.viewCart });
      expect(checkout.getAttribute("href")).toBe(drawerOf(locale).checkoutHref);
      expect(view.getAttribute("href")).toBe(drawerOf(locale).cartHref);
      for (const link of [checkout, view]) {
        expect(link.getAttribute("data-prefetch")).toBe("false");
        expect(link.className).toContain("min-h-12");
      }
      await user.click(checkout);
      expect(followed).toEqual([drawerOf(locale).checkoutHref]);
      await waitFor(() => expect(sheet()).toBeNull());
    },
  );

  it("draws the discount's row with the code only when there is a discount", async () => {
    await openSheet("en");
    expect(slot("cart-drawer-summary")?.textContent).toContain("WELCOME10");
  });

  it("scrolls its body between the header and the foot", async () => {
    await openSheet("en");
    expect(slot("cart-drawer-body")?.className).toContain("overflow-y-auto");
    expect(slot("cart-drawer-body")?.className).toContain("min-h-0");
    // The containing block of the lines' absolutely positioned parts, so they scroll with the body.
    expect(slot("cart-drawer-body")?.className).toContain("relative");
    expect(slot("cart-drawer-header")?.className).toContain("shrink-0");
    expect(slot("cart-drawer-foot")?.className).toContain("shrink-0");
    expect(sheet()?.className).toContain("data-[side=inline-end]:sm:max-w-md");
    expect(sheet()?.className).toContain("motion-reduce:transition-none");
  });
});

describe("CartDrawer: empty", () => {
  it.each(LOCALES)("says so and links on, with no foot, in %s", async (locale) => {
    await openSheet(locale, "empty");
    const copy = copyOf(locale).drawer;
    expect(screen.getByRole("heading", { level: 3, name: copy.emptyTitle })).toBeTruthy();
    const link = screen.getByRole("link", { name: copy.continue });
    expect(link.getAttribute("href")).toBe(drawerOf(locale, "empty").continueHref);
    expect(slot("cart-drawer-foot")).toBeNull();
    expect(screen.queryByRole("list", { name: copy.lines })).toBeNull();
  });
});

describe("CartDrawer: the keyboard", () => {
  it("closes with ONE Escape and gives the focus back to the button", async () => {
    const { user, opener } = await openSheet("en");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(sheet()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("closes with the close button and gives the focus back", async () => {
    const { user, opener } = await openSheet("en");
    await user.click(screen.getByRole("button", { name: "Close cart" }));
    await waitFor(() => expect(sheet()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the focus inside while Tab and Shift+Tab go round", async () => {
    const { user } = await openSheet("en");
    const inside = () => sheet()?.contains(document.activeElement) === true;
    for (let press = 0; press < 30; press++) {
      await user.tab();
      expect(inside()).toBe(true);
    }
    for (let press = 0; press < 30; press++) {
      await user.tab({ shift: true });
      expect(inside()).toBe(true);
    }
  });

  it("hides the page behind it from assistive technology", async () => {
    await openSheet("en");
    expect(screen.queryByRole("button", { name: "Before" })).toBeNull();
  });
});

describe("CartDrawer: drawn open for the design system", () => {
  it("is open at first render without taking the focus, and the page stays reachable", () => {
    render(
      element("en", "full", { defaultOpen: true, modal: false, popupClassName: "max-h-full" }),
    );
    expect(sheet()).not.toBeNull();
    expect(sheet()?.className).toContain("max-h-full");
    expect(sheet()?.contains(document.activeElement)).toBe(false);
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
  });

  it("takes the focus when a reader opens it again", async () => {
    const user = userEvent.setup();
    render(element("en", "full", { defaultOpen: true, modal: false }));
    await user.click(screen.getByRole("button", { name: "Close cart" }));
    await waitFor(() => expect(sheet()).toBeNull());
    await user.click(trigger());
    await waitFor(() => expect(document.activeElement).toBe(slot("cart-drawer-close")));
  });
});

describe("CartDrawer: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", async (locale, long) => {
    const full = drawerOf(locale);
    await openSheet(locale, "full", {
      cart: {
        ...full.cart,
        lines: full.cart.lines.map((line) => ({ ...line, title: long.productName })),
      },
      copy: {
        ...copyOf(locale),
        drawer: {
          ...copyOf(locale).drawer,
          title: long.fieldLabel,
          checkout: long.action,
          viewCart: long.linkLabel,
          note: long.helpText,
        },
      },
    });
    // Nothing cuts a string but CartLineItem's two-line title, which says so (its name is whole).
    const cutters = [...(sheet() as HTMLElement).querySelectorAll("[class]")].filter((each) =>
      CLIPPING_CLASSES.test(each.getAttribute("class") ?? ""),
    );
    expect(cutters.map((each) => each.getAttribute("data-truncate"))).toEqual(["", "", ""]);
    expect(classesIn(trigger()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByRole("heading", { level: 2 }).className).toContain("wrap-anywhere");
    expect(
      within(slot("cart-drawer-checkout") as HTMLElement).getByText(long.action).className,
    ).toContain("wrap-anywhere");
    expect(
      within(slot("cart-drawer-view") as HTMLElement).getByText(long.linkLabel).className,
    ).toContain("wrap-anywhere");
  });
});
