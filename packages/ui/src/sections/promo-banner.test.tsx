import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, formatDate, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromoBannerSection } from "./promo-banner";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("PromoBannerSection", () => {
  it.each(LOCALES)(
    "draws the offer, its code to copy, its end, the link and the small print, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].promoBanner;
      const { container } = render(
        <PromoBannerSection
          {...section}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
          timeZone="Europe/Nicosia"
        />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(container.textContent).toContain(section.code);
      expect(screen.getByRole("button")).toBeTruthy();
      const ends = container.querySelector("[data-slot=promo-banner-ends]")?.textContent ?? "";
      expect(ends).toContain(
        formatDate(section.endsAt ?? "", htmlLang[locale], {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Europe/Nicosia",
        }),
      );
      expect(container.querySelector("[data-slot=promo-banner-terms]")?.textContent).toBe(
        section.terms,
      );
      expect(screen.getByRole("link", { name: section.link?.label })).toBeTruthy();
      expect(screen.getByRole("img", { name: section.image?.alt })).toBeTruthy();
    },
  );

  it("draws the words alone without a picture, an end, a link or terms", () => {
    const { plain } = sectionFixtures.en.promoBanner;
    const { container } = render(
      <PromoBannerSection {...plain} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-slot=promo-banner-ends]")).toBeNull();
    expect(container.querySelector("[data-slot=promo-banner-terms]")).toBeNull();
  });
});
