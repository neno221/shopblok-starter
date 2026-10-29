import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BundleSection } from "./bundle";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("BundleSection", () => {
  it.each(LOCALES)(
    "lists the products in the editor's order under the heading, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].bundle;
      const { container } = render(
        <BundleSection
          {...section}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
        />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      const list = screen.getByRole("list", { name: catalogs[locale].organisms.productGrid.label });
      expect(
        within(list)
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(section.products.map((product) => product.title));
      // A "+" between the cards, as decoration only.
      const pluses = container.querySelectorAll("[data-slot=bundle-plus]");
      expect(pluses).toHaveLength(section.products.length - 1);
      for (const plus of pluses) expect(plus.getAttribute("aria-hidden")).toBe("true");
    },
  );
});
