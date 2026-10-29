import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestimonialsSection } from "./testimonials";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("TestimonialsSection", () => {
  it.each(LOCALES)("shows each quote with its author, its role and its rating, in %s", (locale) => {
    const { section } = sectionFixtures[locale].testimonials;
    render(
      <TestimonialsSection
        {...section}
        copy={{ rating: catalogs[locale].atoms.rating.label }}
        locale={htmlLang[locale]}
      />,
    );
    const region = screen
      .getByRole("heading", { level: 2, name: section.heading })
      .closest("section") as HTMLElement;
    const figures = within(region).getAllByRole("figure");
    expect(figures).toHaveLength(section.quotes.length);
    section.quotes.forEach((quote, index) => {
      const figure = figures[index] as HTMLElement;
      expect(figure.querySelector("blockquote")?.textContent).toBe(quote.quote);
      expect(figure.querySelector("figcaption")?.textContent).toContain(quote.author);
      if (quote.role !== undefined)
        expect(figure.querySelector("figcaption")?.textContent).toContain(quote.role);
      if (quote.rating !== undefined)
        expect(within(figure).getByRole("img").getAttribute("aria-label")).toContain(
          String(quote.rating),
        );
    });
  });

  it("leaves out the stars without a rating, and draws an avatar as decoration", () => {
    render(
      <TestimonialsSection
        quotes={[
          {
            id: "a",
            quote: "Lovely.",
            author: "Ana",
            avatar: { src: "/a.png", alt: "Ana", width: 80, height: 80 },
          },
        ]}
        copy={{ rating: "{value} out of {max}" }}
        locale="en-US"
      />,
    );
    expect(screen.queryByRole("img", { name: /out of/ })).toBeNull();
    const avatar = document.querySelector("figcaption img");
    expect(avatar?.getAttribute("alt")).toBe("");
  });
});
