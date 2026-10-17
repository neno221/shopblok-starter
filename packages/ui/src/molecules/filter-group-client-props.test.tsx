import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterGroup } from "./filter-group";

// The design system's stories are server components (RSC), and FilterGroup's client parts get their
// props across that boundary: a function, a class instance or a Symbol would not survive it. The
// two client parts are replaced here by stand-ins that keep what they were given.
const given = vi.hoisted(() => ({
  range: [] as Record<string, unknown>[],
  swatch: [] as Record<string, unknown>[],
}));

vi.mock("./filter-group-price-range", () => ({
  PriceRange: (props: Record<string, unknown>) => {
    given.range.push(props);
    return null;
  },
}));
vi.mock("./filter-group-swatch-option", () => ({
  FilterSwatchOption: (props: Record<string, unknown>) => {
    given.swatch.push(props);
    return null;
  },
}));

describe("FilterGroup's client parts", () => {
  it.each(LOCALES)("%s: are given plain, JSON-serialisable props only", (locale) => {
    given.range.length = 0;
    given.swatch.length = 0;
    const { facets, market } = commerceFixtures[locale];
    render(
      <form>
        {facets.map((facet) => (
          <FilterGroup
            key={facet.id}
            facet={facet}
            copy={catalogs[locale].molecules.filterGroup}
            locale={market.htmlLang}
          />
        ))}
      </form>,
    );
    expect(given.range).toHaveLength(1);
    expect(given.swatch.length).toBeGreaterThan(0);
    for (const props of [...given.range, ...given.swatch]) {
      expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      for (const value of Object.values(props)) {
        expect(typeof value).not.toBe("function");
      }
    }
  });

  it("gives the price range the words it needs, already formatted, and never the catalog", () => {
    given.range.length = 0;
    const { facets, market } = commerceFixtures.de;
    const price = facets.find((facet) => facet.kind === "range");
    if (price === undefined) throw new Error("no range facet");
    render(
      <FilterGroup
        facet={price}
        copy={catalogs.de.molecules.filterGroup}
        locale={market.htmlLang}
      />,
    );
    const [props] = given.range;
    expect(props).toMatchObject({
      id: "price",
      currencyCode: "EUR",
      locale: market.htmlLang,
      minimumLabel: catalogs.de.molecules.filterGroup.minimum,
      maximumLabel: catalogs.de.molecules.filterGroup.maximum,
    });
    expect(String(props?.boundsText)).toMatch(/^Preise von .*€.* bis .*€/);
  });
});
