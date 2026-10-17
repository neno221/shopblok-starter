import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMoney, LOCALES } from "@shopblok/i18n";
import type { PriceSummary } from "@shopblok/registry/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { PriceBlock } from "./price-block";

// SPEC §14, "Test rule": compare what the project controls and normalise what CLDR decides (no-break
// spaces, the Swiss digit-group mark).
const plain = (text: string | null | undefined) =>
  (text ?? "").replace(/(?<=\d)[\u202f\u2019'](?=\d)/g, "'").replace(/[\u00a0\u202f]/g, " ");

const money = (amount: number, currencyCode = "USD") => ({ amount, currencyCode });
const regular: PriceSummary = { price: money(64), varies: false };
const sale: PriceSummary = { price: money(49), compareAt: money(69), varies: false };
const from: PriceSummary = { price: money(42), varies: true };

const copy = catalogs.en.molecules.priceBlock;
const view = (price: PriceSummary, props: Partial<Parameters<typeof PriceBlock>[0]> = {}) =>
  render(<PriceBlock price={price} copy={copy} locale="en-US" data-testid="block" {...props} />);

describe("PriceBlock", () => {
  it("shows a regular price through the Price atom, with nothing struck through and no note", () => {
    view(regular);
    const block = screen.getByTestId("block");
    expect(plain(block.textContent)).toBe("$64.00");
    expect(block.querySelector("[data-slot=price]")?.className).toContain("text-price");
    expect(block.querySelector("s")).toBeNull();
    expect(block.querySelector("[data-slot=price-tax]")).toBeNull();
    expect(block.querySelector("[data-slot=price-from]")).toBeNull();
    expect(block.getAttribute("data-sale")).toBeNull();
    expect(block.getAttribute("data-varies")).toBeNull();
  });

  it("shows a sale as the sale price and the original struck through, each with its hidden label", () => {
    view(sale);
    const block = screen.getByTestId("block");
    expect(plain(block.textContent)).toBe("Sale price $49.00Original price $69.00");
    expect(block.getAttribute("data-sale")).toBe("");
    const original = block.querySelector("s");
    expect(plain(original?.textContent)).toBe("Original price $69.00");
    // The labels are read out and not drawn.
    expect(screen.getByText("Sale price", { exact: false }).className).toContain("sr-only");
    expect(screen.getByText("Original price", { exact: false }).className).toContain("sr-only");
    expect(block.querySelector("[data-slot=price-sale]")?.className).toContain("text-price-sale");
    expect(original?.className).toContain("text-price-original");
  });

  it('puts "From {price}" before a price that varies, with the price still its own element', () => {
    view(from);
    const block = screen.getByTestId("block");
    expect(plain(block.textContent)).toBe("From$42.00");
    expect(block.querySelector("[data-slot=price-from]")?.textContent).toBe("From");
    expect(plain(block.querySelector("[data-slot=price]")?.textContent)).toBe("$42.00");
    expect(block.getAttribute("data-varies")).toBe("");
  });

  it("reads a varying price in order: the word, then the price", () => {
    view(from);
    // The visible text, with the gap the layout draws between the two.
    const parts = [...screen.getByTestId("block").querySelectorAll("[data-slot]")]
      .filter((element) => ["price-from", "price"].includes(element.getAttribute("data-slot")!))
      .map((element) => element.getAttribute("data-slot"));
    expect(parts).toEqual(["price-from", "price"]);
  });

  it("lets the message decide where the word goes", () => {
    view(from, { copy: { ...copy, from: "{price} onwards" } });
    const block = screen.getByTestId("block");
    const slots = [...block.querySelectorAll("[data-slot]")]
      .map((element) => element.getAttribute("data-slot"))
      .filter((slot) => slot === "price-from" || slot === "price");
    expect(slots).toEqual(["price", "price-from"]);
    expect(block.querySelector("[data-slot=price-from]")?.textContent).toBe("onwards");
  });

  it("shows a sale that varies: the word, the sale price and the original", () => {
    view({ ...sale, varies: true });
    expect(plain(screen.getByTestId("block").textContent)).toBe(
      "FromSale price $49.00Original price $69.00",
    );
  });

  it("puts the tax note under the price", () => {
    const { rerender } = view(regular, { tax: "included" });
    const note = () => screen.getByTestId("block").querySelector("[data-slot=price-tax]");
    expect(note()?.textContent).toBe("Tax included");
    rerender(
      <PriceBlock price={regular} copy={copy} locale="en-US" data-testid="block" tax="excluded" />,
    );
    expect(note()?.textContent).toBe("Tax excluded");
    // After the price, not beside it.
    const block = screen.getByTestId("block");
    expect(block.lastElementChild).toBe(note());
  });

  it("passes the size to the price, and the rest to its element", () => {
    view(regular, { size: "lg", className: "mt-2" });
    const block = screen.getByTestId("block");
    expect(block.querySelector("[data-slot=price]")?.className).toContain("text-xl");
    expect(block.className).toContain("mt-2");
  });

  it("never scales the amount: 12.5 is 12.50", () => {
    view({ price: money(12.5, "EUR"), varies: false }, { locale: "de-DE" });
    expect(plain(screen.getByTestId("block").textContent)).toBe(
      plain(formatMoney(12.5, "EUR", "de-DE")),
    );
    expect(plain(screen.getByTestId("block").textContent)).toMatch(/12,50/);
  });

  describe.each(LOCALES)("in %s", (locale) => {
    const fixture = commerceFixtures[locale];
    const { htmlLang } = fixture.market;
    const messages = catalogs[locale].molecules.priceBlock;
    const named = (handle: string) => {
      const product = fixture.products.find((candidate) => candidate.handle === handle);
      if (product === undefined) throw new Error(`no ${handle}`);
      return product;
    };

    it("formats the price for the market, and reads both labels of a sale", () => {
      const product = named("brushed-fleece-hoodie");
      render(
        <PriceBlock price={product.price} copy={messages} locale={htmlLang} data-testid="b" />,
      );
      const text = plain(screen.getByTestId("b").textContent);
      const { price, compareAt } = product.price;
      expect(compareAt).toBeDefined();
      expect(text).toBe(
        `${messages.sale} ${plain(formatMoney(price.amount, price.currencyCode, htmlLang))}` +
          `${messages.original} ${plain(formatMoney(compareAt!.amount, price.currencyCode, htmlLang))}`,
      );
    });

    it('says "from" in the language, with the formatted price', () => {
      const product = named("canvas-tote-bag");
      render(
        <PriceBlock price={product.price} copy={messages} locale={htmlLang} data-testid="b" />,
      );
      const block = screen.getByTestId("b");
      const word = block.querySelector("[data-slot=price-from]")?.textContent ?? "";
      expect(word).not.toBe("");
      expect(word).not.toContain("{");
      expect(plain(block.querySelector("[data-slot=price]")?.textContent)).toBe(
        plain(formatMoney(product.price.price.amount, product.price.price.currencyCode, htmlLang)),
      );
    });

    it("says whether tax is included, in the language", () => {
      render(
        <PriceBlock
          price={fixture.products[0]!.price}
          copy={messages}
          locale={htmlLang}
          tax="included"
        />,
      );
      expect(screen.getByText(messages.taxIncluded)).toBeTruthy();
    });
  });

  it("uses no English in a Greek page", () => {
    const el = commerceFixtures.el;
    render(
      <PriceBlock
        price={el.long.product.price}
        copy={catalogs.el.molecules.priceBlock}
        locale={el.market.htmlLang}
        tax="excluded"
        data-testid="b"
      />,
    );
    const text = screen.getByTestId("b").textContent ?? "";
    for (const english of Object.values(catalogs.en.molecules.priceBlock))
      expect(text).not.toContain(english.replace("{price}", "").trim());
  });

  it.each(["de", "el"] as const)(
    "wraps a long %s price, from word and tax note instead of cutting them",
    (locale) => {
      const { long, market } = commerceFixtures[locale];
      render(
        <PriceBlock
          price={long.product.price}
          copy={catalogs[locale].molecules.priceBlock}
          locale={market.htmlLang}
          tax="excluded"
          data-testid="b"
        />,
      );
      const block = screen.getByTestId("b");
      for (const element of [block, ...block.querySelectorAll("*")])
        expect(element.getAttribute("class") ?? "").not.toMatch(CLIPPING_CLASSES);
      // Both labels, the word and the note are all in the reading order.
      expect(block.textContent).toContain(catalogs[locale].molecules.priceBlock.sale);
      expect(block.textContent).toContain(catalogs[locale].molecules.priceBlock.taxExcluded);
    },
  );
});
