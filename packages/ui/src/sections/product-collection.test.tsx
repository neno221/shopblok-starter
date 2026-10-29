import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCollectionSection } from "./product-collection";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("ProductCollectionSection", () => {
  it.each(LOCALES)(
    "draws a carousel named by the heading, with the intro and the link, in %s",
    (locale) => {
      const { carousel } = sectionFixtures[locale].productCollection;
      const { container } = render(
        <ProductCollectionSection
          {...carousel}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
        />,
      );
      expect(
        container
          .querySelector("[data-slot=product-collection-section]")
          ?.getAttribute("data-display"),
      ).toBe("carousel");
      const region = screen.getByRole("region", { name: carousel.heading });
      expect(within(region).getAllByRole("article")).toHaveLength(carousel.products.length);
      expect(region.textContent).toContain(carousel.intro);
      expect(within(region).getByRole("link", { name: carousel.link?.label })).toBeTruthy();
    },
  );

  it("draws a grid under an h2, the cards' titles h3", () => {
    const { grid } = sectionFixtures.en.productCollection;
    render(<ProductCollectionSection {...grid} copy={sectionsCopy(catalogs.en)} locale="en-US" />);
    expect(screen.getByRole("heading", { level: 2, name: grid.heading })).toBeTruthy();
    const list = screen.getByRole("list", { name: catalogs.en.organisms.productGrid.label });
    expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(grid.products.length);
  });

  it("says there is nothing, under its heading, when the source is empty", () => {
    const { empty } = sectionFixtures.en.productCollection;
    const { container } = render(
      <ProductCollectionSection {...empty} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.querySelector("[data-slot=empty-state]")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: empty.empty?.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: empty.empty?.action?.label })).toBeTruthy();
    expect(container.querySelector("article")).toBeNull();
  });
});
