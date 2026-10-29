import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedProductSection } from "./featured-product";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("FeaturedProductSection", () => {
  it.each(LOCALES)(
    "draws the heading, the product's name under it, its price and its page, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].featuredProduct;
      const copy = sectionsCopy(catalogs[locale]);
      const { container } = render(
        <FeaturedProductSection {...section} copy={copy} locale={htmlLang[locale]} />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(screen.getByRole("heading", { level: 3, name: section.product.title })).toBeTruthy();
      expect(screen.getByRole("img", { name: section.image.alt })).toBeTruthy();
      expect(container.querySelector("[data-slot=price-block]")).toBeTruthy();
      for (const paragraph of section.text ?? [])
        expect(container.textContent).toContain(paragraph);
      expect(
        screen.getByRole("link", { name: copy.featuredProduct.view }).getAttribute("href"),
      ).toBe(section.product.href);
    },
  );

  it("makes the product's name the h2 without a heading, and strikes the price before a sale", () => {
    const { sale } = sectionFixtures.en.featuredProduct;
    const { container } = render(
      <FeaturedProductSection {...sale} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(screen.getByRole("heading", { level: 2, name: sale.product.title })).toBeTruthy();
    expect(container.querySelector("s, del")).toBeTruthy();
  });
});
