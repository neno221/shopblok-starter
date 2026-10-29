import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonSection } from "./comparison";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("ComparisonSection", () => {
  it.each(LOCALES)(
    "is a table captioned by the heading, a column per product and a row per value, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].comparison;
      const copy = sectionsCopy(catalogs[locale]);
      render(<ComparisonSection {...section} copy={copy} locale={htmlLang[locale]} />);
      const table = screen.getByRole("table", { name: section.heading });
      const columns = within(table).getAllByRole("columnheader");
      expect(columns.map((cell) => cell.textContent)).toEqual(
        section.products.map((product) => product.title),
      );
      expect(
        within(table)
          .getAllByRole("rowheader")
          .map((cell) => cell.textContent),
      ).toEqual([copy.comparison.price, ...section.rows.map((row) => row.label)]);
      // The box that scrolls sideways takes the focus, and is named by the caption.
      const box = screen.getByRole("group", { name: section.heading });
      expect(box.getAttribute("tabindex")).toBe("0");
    },
  );

  it("reads a missing value as not specified", () => {
    const { two } = sectionFixtures.en.comparison;
    const { container } = render(
      <ComparisonSection {...two} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.textContent).toContain(catalogs.en.sections.comparison.missing);
  });
});
