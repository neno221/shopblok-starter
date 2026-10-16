import { designSystemFixtures } from "@shopblok/fixtures";
import { formatMoney, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./price";

// SPEC §14, "Test rule": compare what the project controls (the symbol's side, the decimal mark,
// the currency) and normalise what CLDR decides: no-break spaces, and the Swiss digit-group mark,
// which differs between Node 22 builds.
const plain = (text: string) =>
  text.replace(/(?<=\d)[\u202f\u2019'](?=\d)/g, "'").replace(/[\u00a0\u202f]/g, " ");

// What each market writes for 1249.5: the project's side, mark and currency, not CLDR's spacing.
const expected = {
  en: /^\$1,249\.50$/,
  el: /^1\.249,50 €$/,
  de: /^1\.249,50 €$/,
  fr: /^1'249\.50 CHF$/,
} as const;

describe("Price", () => {
  describe.each(LOCALES)("in %s", (locale) => {
    const { market, prices } = designSystemFixtures[locale];

    it(`is formatMoney's output for ${market.htmlLang} ${market.currency}`, () => {
      render(
        <Price
          amount={prices.high}
          currency={market.currency}
          locale={market.htmlLang}
          data-testid="price"
        />,
      );
      const text = screen.getByTestId("price").textContent ?? "";
      expect(plain(text)).toBe(plain(formatMoney(prices.high, market.currency, market.htmlLang)));
      expect(plain(text)).toMatch(expected[locale]);
    });

    it("never scales the amount: 12.5 is 12.50, not 1250.00", () => {
      render(
        <Price amount={12.5} currency={market.currency} locale={market.htmlLang} data-testid="p" />,
      );
      const text = plain(screen.getByTestId("p").textContent ?? "");
      expect(text).toBe(plain(formatMoney(12.5, market.currency, market.htmlLang)));
      expect(text).toMatch(/12[.,]50/);
      expect(text).not.toMatch(/1[.,' ]?250/);
    });
  });

  it("draws a regular price in the price token, without a line through it", () => {
    render(<Price amount={64} currency="USD" locale="en-US" data-testid="price" />);
    const price = screen.getByTestId("price");
    expect(price.className).toContain("text-price");
    expect(price.querySelector("s")).toBeNull();
    expect(price.getAttribute("data-sale")).toBeNull();
  });

  it("lists the sale price and the original, struck through, each with a hidden label", () => {
    render(
      <Price
        amount={49}
        original={64}
        currency="USD"
        locale="en-US"
        saleLabel="Sale price"
        originalLabel="Original price"
        data-testid="price"
      />,
    );
    const price = screen.getByTestId("price");
    expect(plain(price.textContent ?? "")).toBe("Sale price $49.00Original price $64.00");
    const sale = price.querySelector("[data-slot=price-sale]");
    const original = price.querySelector("s");
    expect(sale?.className).toContain("text-price-sale");
    expect(original?.className).toContain("text-price-original");
    expect(plain(original?.textContent ?? "")).toBe("Original price $64.00");
    expect(screen.getByText("Sale price", { exact: false }).className).toContain("sr-only");
    expect(screen.getByText("Original price", { exact: false }).className).toContain("sr-only");
  });

  it("needs both labels with an original price", () => {
    // @ts-expect-error -- a sale price without its labels says nothing to a screen reader (D30).
    render(<Price amount={49} original={64} currency="USD" locale="en-US" />);
  });

  it("takes any currency Medusa sells in, in either case", () => {
    render(<Price amount={10} currency="chf" locale="de-CH" data-testid="price" />);
    expect(plain(screen.getByTestId("price").textContent ?? "")).toBe(
      plain(formatMoney(10, "CHF", "de-CH")),
    );
  });
});
