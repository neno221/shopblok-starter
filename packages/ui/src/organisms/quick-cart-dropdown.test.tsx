// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). QuickCartDropdown's tests, in
// Testing Library and happy-dom: the cart button (its name with the count, the badge), the popover
// (a dialog named by "Added to your cart", the line just added with its options, quantity and total,
// the subtotal with the count, Checkout and View cart that close it, a close button), the polite
// region (there and empty at first, the sentence once it opens), the keyboard (Enter opens it, focus
// goes in and stays, ONE Escape closes it and gives the focus back), the popover drawn open for the
// design system and held by its caller, a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { QuickCart } from "@shopblok/registry/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { QuickCartDropdown, type QuickCartDropdownProps } from "./quick-cart-dropdown";
import { QuickCartDropdownClient } from "./quick-cart-dropdown-client";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.quickCartDropdown;
const cartOf = (locale: Locale): QuickCart => commerceFixtures[locale].cartCheckout.quickCart;
const named = (expected: string) => (name: string) => name.replace(/\s+,/g, ",") === expected;
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

function element(locale: Locale = "en", props: Partial<QuickCartDropdownProps> = {}) {
  return (
    <>
      <button type="button">Before</button>
      <QuickCartDropdown
        {...cartOf(locale)}
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
const trigger = () => slot("quick-cart-trigger") as HTMLButtonElement;
const popup = () => slot("quick-cart");
const status = () => slot("quick-cart-status") as HTMLElement;
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

async function openPopup(locale: Locale = "en", props: Partial<QuickCartDropdownProps> = {}) {
  render(element(locale, props));
  const user = userEvent.setup();
  await user.click(trigger());
  await waitFor(() => expect(popup()).not.toBeNull());
  return { user };
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

describe("QuickCartDropdown: the button", () => {
  it.each(LOCALES)("is named 'Cart' and what it holds, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const items = formatMessage(copy.items, { count: cartOf(locale).itemCount }, htmlLang[locale]);
    expect(screen.getByRole("button", { name: named(`${copy.open}, ${items}`) })).toBe(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().className).toContain("size-11");
    expect(slot("quick-cart-badge")?.getAttribute("aria-hidden")).toBe("true");
    expect(slot("quick-cart-badge")?.textContent).toBe(String(cartOf(locale).itemCount));
  });

  it("writes more than 99 as 99+", () => {
    render(element("en", { itemCount: 140 }));
    expect(slot("quick-cart-badge")?.textContent).toBe("99+");
  });

  it("renders on the server as the button and the empty region", () => {
    const html = renderToString(element("en"));
    expect(html).toContain('data-slot="quick-cart-trigger"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('data-slot="quick-cart"');
  });
});

describe("QuickCartDropdown: the popover", () => {
  it.each(LOCALES)(
    "is a dialog named by its title, with the line just added, in %s",
    async (locale) => {
      await openPopup(locale);
      const copy = copyOf(locale);
      const { added, itemCount, subtotal } = cartOf(locale);
      const dialog = screen.getByRole("dialog", { name: copy.title });
      expect(dialog).toBe(popup());
      const line = plain(slot("quick-cart-line")?.textContent ?? "");
      expect(line).toContain(added.title);
      for (const option of added.options)
        expect(line).toContain(plain(formatMessage(copy.option, option, htmlLang[locale])));
      expect(line).toContain(
        plain(formatMessage(copy.quantity, { count: added.quantity }, htmlLang[locale])),
      );
      expect(line).toContain(
        plain(formatMoney(added.total.amount, added.total.currencyCode, htmlLang[locale])),
      );
      const sub = plain(slot("quick-cart-subtotal")?.textContent ?? "");
      expect(sub).toContain(
        plain(formatMessage(copy.subtotal, { count: itemCount }, htmlLang[locale])),
      );
      expect(sub).toContain(
        plain(formatMoney(subtotal.amount, subtotal.currencyCode, htmlLang[locale])),
      );
      expect(within(dialog).getByRole("button", { name: copy.close })).toBe(
        slot("quick-cart-close"),
      );
    },
  );

  it("has no control that changes the cart", async () => {
    await openPopup("en");
    const dialog = popup() as HTMLElement;
    expect(dialog.querySelectorAll("form, input, select")).toHaveLength(0);
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
  });

  it.each(LOCALES)("links on to the checkout and the cart, and closes, in %s", async (locale) => {
    const { user } = await openPopup(locale);
    const copy = copyOf(locale);
    const checkout = screen.getByRole("link", { name: copy.checkout });
    const view = screen.getByRole("link", { name: copy.viewCart });
    expect(checkout.getAttribute("href")).toBe(cartOf(locale).checkoutHref);
    expect(view.getAttribute("href")).toBe(cartOf(locale).cartHref);
    for (const link of [checkout, view]) {
      expect(link.className).toContain("min-h-11");
      expect(link.getAttribute("data-prefetch")).toBe("false");
    }
    await user.click(view);
    expect(followed).toEqual([cartOf(locale).cartHref]);
    await waitFor(() => expect(popup()).toBeNull());
  });

  it("stays open for a link opened in a new tab", async () => {
    const { user } = await openPopup("en");
    const view = screen.getByRole("link", { name: copyOf("en").viewCart });
    await user.keyboard("{Control>}");
    await user.click(view);
    await user.keyboard("{/Control}");
    expect(popup()).not.toBeNull();
  });

  it("is capped at the room under the button and scrolls inside", async () => {
    await openPopup("en");
    expect(popup()?.className).toContain("max-h-(--available-height)");
    expect(popup()?.className).toContain("overflow-y-auto");
    expect(popup()?.className).toContain("max-w-(--available-width)");
  });
});

describe("QuickCartDropdown: the polite region", () => {
  it("is there and empty at first, and says nothing when the shopper opens it from its button", async () => {
    render(element("en"));
    expect(status().getAttribute("aria-live")).toBe("polite");
    expect(status().textContent).toBe("");
    await userEvent.setup().click(trigger());
    await waitFor(() => expect(popup()).not.toBeNull());
    // No add happened: the button only shows the last one (PR 62 review).
    expect(status().textContent).toBe("");
  });

  it("says nothing for a popover drawn open at first render", () => {
    render(element("en", { defaultOpen: true, modal: false }));
    expect(popup()).not.toBeNull();
    expect(status().textContent).toBe("");
  });

  it("empties again when it closes", async () => {
    const { user } = await openPopup("en");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    expect(status().textContent).toBe("");
  });

  it("speaks when the caller opens it after an add (controlled)", async () => {
    function Island() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Add
          </button>
          <QuickCartDropdownClient
            open={open}
            onOpenChange={setOpen}
            copy={{
              open: "Cart",
              items: "4 items",
              title: "Added to your cart",
              close: "Close",
              viewCart: "View cart",
              checkout: "Checkout",
              announce: "Added to your cart: Socks",
            }}
            badge="4"
            line={<p>Socks</p>}
            subtotal={<p>Subtotal</p>}
            cartHref="/cart"
            checkoutHref="/checkout"
          />
        </>
      );
    }
    render(<Island />);
    expect(status().textContent).toBe("");
    await act(async () => {
      screen.getByRole("button", { name: "Add" }).click();
    });
    await waitFor(() => expect(popup()).not.toBeNull());
    expect(status().textContent).toBe("Added to your cart: Socks");
  });
});

describe("QuickCartDropdown: the keyboard", () => {
  it("opens with Enter and moves the focus inside", async () => {
    render(element("en"));
    const user = userEvent.setup();
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(popup()).not.toBeNull());
    await waitFor(() => expect(popup()?.contains(document.activeElement)).toBe(true));
  });

  it("closes with ONE Escape and gives the focus back to the button", async () => {
    const { user } = await openPopup("en");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(popup()).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });

  it("keeps the focus inside while Tab and Shift+Tab go round", async () => {
    const { user } = await openPopup("en");
    await waitFor(() => expect(popup()?.contains(document.activeElement)).toBe(true));
    for (let press = 0; press < 8; press++) {
      await user.tab();
      expect(popup()?.contains(document.activeElement)).toBe(true);
    }
    for (let press = 0; press < 8; press++) {
      await user.tab({ shift: true });
      expect(popup()?.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("QuickCartDropdown: drawn open for the design system", () => {
  it("is open at first render without taking the focus, the page reachable", () => {
    render(element("en", { defaultOpen: true, modal: false, popupClassName: "max-h-80" }));
    expect(popup()?.className).toContain("max-h-80");
    expect(popup()?.contains(document.activeElement)).toBe(false);
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
  });
});

describe("QuickCartDropdown: long labels", () => {
  it.each(longLabels)("wraps a long %s label and cuts nothing", async (locale, long) => {
    const cart = cartOf(locale);
    await openPopup(locale, {
      added: {
        ...cart.added,
        title: long.productName,
        options: [{ option: long.fieldLabel, value: long.optionLabel }],
      },
      copy: {
        ...copyOf(locale),
        title: long.fieldLabel,
        checkout: long.action,
        viewCart: long.linkLabel,
      },
    });
    expect(classesIn(popup() as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each))).toEqual(
      [],
    );
    expect(screen.getByText(long.productName).className).toContain("wrap-anywhere");
    expect(screen.getByText(long.action).className).toContain("wrap-anywhere");
    expect(screen.getByText(long.linkLabel).className).toContain("wrap-anywhere");
    expect(
      screen.getByText(long.fieldLabel, { selector: "span" }).parentElement?.className,
    ).toContain("wrap-anywhere");
  });
});
