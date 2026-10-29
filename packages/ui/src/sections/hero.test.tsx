import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroSection } from "./hero";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("HeroSection", () => {
  it.each(LOCALES)(
    "draws the eyebrow, the heading, the line, the links and the picture, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].hero;
      const { container } = render(
        <HeroSection
          {...section}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
        />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(container.textContent).toContain(section.eyebrow);
      expect(container.textContent).toContain(section.subheading);
      expect(screen.getByRole("img", { name: section.image?.alt })).toBeTruthy();
      expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
        section.links.map((link) => link.href),
      );
      expect(container.querySelector("[data-slot=hero-products]")).toBeNull();
    },
  );

  it("is the page's h1 when it opens the page, its cards' titles h2, with a countdown", () => {
    const { offer } = sectionFixtures.en.hero;
    render(
      <HeroSection
        {...offer}
        headingLevel={1}
        copy={sectionsCopy(catalogs.en)}
        locale="en-US"
        frozen
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: offer.heading })).toBeTruthy();
    const list = screen.getByRole("list", { name: catalogs.en.organisms.productGrid.label });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(screen.getByRole("timer")).toBeTruthy();
  });

  it("draws one column without a picture", () => {
    const { long } = sectionFixtures.en.hero;
    const { container } = render(
      <HeroSection {...long} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".md\\:grid-cols-2")).toBeNull();
  });
});
