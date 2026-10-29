import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionSpotlightSection } from "./collection-spotlight";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("CollectionSpotlightSection", () => {
  it.each(LOCALES)(
    "draws the collection's picture, words and link beside its products, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].collectionSpotlight;
      const copy = sectionsCopy(catalogs[locale]);
      render(<CollectionSpotlightSection {...section} copy={copy} locale={htmlLang[locale]} />);
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(screen.getByRole("img", { name: section.image?.alt })).toBeTruthy();
      expect(
        screen.getByRole("link", { name: copy.collectionSpotlight.shop }).getAttribute("href"),
      ).toBe(section.href);
      const list = screen.getByRole("list", { name: catalogs[locale].organisms.productGrid.label });
      expect(within(list).getAllByRole("article")).toHaveLength(section.products.length);
    },
  );

  it("draws the words alone when the collection has no product in the region", () => {
    const { long } = sectionFixtures.en.collectionSpotlight;
    const { container } = render(
      <CollectionSpotlightSection {...long} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.querySelector("article")).toBeNull();
    expect(container.querySelector(".lg\\:grid-cols-2")).toBeNull();
  });
});
