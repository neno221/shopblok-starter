import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentlyViewedSection } from "./recently-viewed";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("RecentlyViewedSection", () => {
  it.each(LOCALES)(
    "draws the visitor's products as a carousel named by the heading, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].recentlyViewed;
      render(
        <RecentlyViewedSection
          {...section}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
        />,
      );
      const region = screen.getByRole("region", { name: section.heading });
      expect(within(region).getAllByRole("article")).toHaveLength(section.products.length);
    },
  );

  it("draws nothing at all, not even its frame, with no product", () => {
    const { section } = sectionFixtures.en.recentlyViewed;
    const { container } = render(
      <RecentlyViewedSection
        {...section}
        products={[]}
        copy={sectionsCopy(catalogs.en)}
        locale="en-US"
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
