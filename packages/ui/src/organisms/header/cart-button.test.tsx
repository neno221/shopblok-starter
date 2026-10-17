import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartButton } from "./cart-button";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const copy = (locale: Locale) => catalogs[locale].organisms.header;

function button(locale: Locale, count?: number, announce?: boolean) {
  return (
    <CartButton
      href="/us/cart"
      count={count}
      copy={copy(locale)}
      locale={htmlLang[locale]}
      announce={announce}
    />
  );
}
const region = () => document.querySelector('[data-slot="cart-count"]');

describe("CartButton (D44)", () => {
  it("without a count is the placeholder: the bag, the name alone, an empty live region, no badge", () => {
    render(button("en"));
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/us/cart");
    expect(plain(link.textContent)).toBe("Cart");
    expect(region()?.getAttribute("aria-live")).toBe("polite");
    expect(region()?.textContent).toBe("");
    // Beside the link, not in it: the region's words are not part of the link's name.
    expect(link.contains(region())).toBe(false);
    expect(link.querySelector('[data-slot="cart-badge"]')).toBeNull();
  });

  it("puts no number in the server's HTML when it has none: a prerendered page stays the same for everyone", () => {
    const html = renderToStaticMarkup(button("en"));
    // The text and every attribute a screen reader reads: the classes and the icon's path have digits.
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
    expect(html).not.toMatch(/aria-label=/);
  });

  it.each(LOCALES)(
    "names the cart and its items, and draws the number in a badge (%s)",
    (locale) => {
      render(button(locale, 3));
      const words = formatMessage(copy(locale).cartItems, { count: 3 }, htmlLang[locale]);
      const link = screen.getByRole("link", { name: plain(`${copy(locale).cart} ${words}`) });
      // A number the page has just learnt is not news: the live region says nothing.
      expect(region()?.textContent).toBe("");
      const badge = link.querySelector('[data-slot="cart-badge"]');
      expect(badge?.textContent).toBe("3");
      // The digits are drawn; the words are read.
      expect(badge?.getAttribute("aria-hidden")).toBe("true");
    },
  );

  it.each(LOCALES)(
    "says the cart and the new number in its live region when `announce` (%s, PR 57 review)",
    (locale) => {
      const { rerender } = render(button(locale, 3));
      rerender(button(locale, 4, true));
      const words = formatMessage(copy(locale).cartItems, { count: 4 }, htmlLang[locale]);
      expect(plain(region()?.textContent)).toBe(plain(`${copy(locale).cart} ${words}`));
      expect(screen.getByRole("link", { name: plain(`${copy(locale).cart} ${words}`) })).toBeTruthy();
    },
  );

  it("says an empty cart is empty, with no badge", () => {
    render(button("en", 0));
    expect(screen.getByRole("link", { name: "Cart empty" })).toBeTruthy();
    expect(document.querySelector('[data-slot="cart-badge"]')).toBeNull();
  });

  it("writes more than 99 items as 99+ in the badge, and the real number in the name", () => {
    render(button("de", 120));
    expect(screen.getByRole("link", { name: "Warenkorb 120 Artikel" })).toBeTruthy();
    expect(document.querySelector('[data-slot="cart-badge"]')?.textContent).toBe("99+");
  });

  it("treats a number that is not a count as unknown", () => {
    for (const count of [-1, 2.5, Number.NaN]) {
      const { unmount } = render(button("en", count));
      expect(plain(screen.getByRole("link").textContent)).toBe("Cart");
      unmount();
    }
  });

  it("keeps the badge out of the flow, so the button is 44 px with or without it", () => {
    const { container, rerender } = render(button("en"));
    const link = container.querySelector('[data-slot="cart-button"]');
    expect(link?.className).toMatch(/(?:^|\s)size-11(?:\s|$)/);
    rerender(button("en", 3));
    expect(link?.querySelector('[data-slot="cart-badge"]')?.className).toMatch(
      /(?:^|\s)absolute(?:\s|$)/,
    );
  });

  it("takes its formatters from @shopblok/i18n/format, so the island's chunk has no catalog", () => {
    const source = readFileSync(path.join(import.meta.dirname, "cart-button.tsx"), "utf8");
    const imports = [...source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)";/gms)];
    for (const [, isType, from] of imports)
      if (from === "@shopblok/i18n") expect(isType, from).toBe("type ");
    expect(imports.map(([, , from]) => from)).toContain("@shopblok/i18n/format");
  });
});
