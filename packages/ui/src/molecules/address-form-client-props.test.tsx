import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddressForm } from "./address-form";

// The design system's stories are server components (RSC), and AddressForm's client part gets its
// props across that boundary: a function, a class instance or a Symbol would not survive it. The
// part is replaced here by a stand-in that keeps what it was given.
const given = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock("./address-form-fields", () => ({
  AddressFormFields: (props: Record<string, unknown>) => {
    given.push(props);
    return null;
  },
}));

const countries = commerceFixtures.en.markets.map((market) => market.country);

describe("AddressForm's client part", () => {
  it.each(LOCALES)("%s: is given plain, JSON-serialisable props only", (locale) => {
    given.length = 0;
    const { addresses, market } = commerceFixtures[locale];
    render(
      <AddressForm
        countries={countries}
        values={addresses[0]!}
        copy={catalogs[locale].molecules.addressForm}
        locale={market.htmlLang}
        errors={{ postalCode: "pattern", city: "required" }}
        section="shipping"
        status="pending"
      />,
    );
    expect(given).toHaveLength(1);
    const [props] = given;
    expect(JSON.parse(JSON.stringify(props))).toEqual(props);
    for (const value of Object.values(props ?? {})) expect(typeof value).not.toBe("function");
  });

  it("gives it the formats of the countries it was given and no others, already worded", () => {
    given.length = 0;
    const { market } = commerceFixtures.de;
    render(
      <AddressForm
        countries={["de", "ch"]}
        values={{ countryCode: "ch" }}
        copy={catalogs.de.molecules.addressForm}
        locale={market.htmlLang}
      />,
    );
    const props = given[0] as {
      country: string;
      countries: { code: string; name: string; rows: string[][]; labels: Record<string, string> }[];
    };
    expect(props.country).toBe("ch");
    expect(props.countries.map((country) => country.code)).toEqual(["de", "ch"]);
    expect(props.countries.map((country) => country.name)).toEqual(["Deutschland", "Schweiz"]);
    // The words are the page's, formatted on the server: the part holds no catalog.
    expect(props.countries[1]?.labels.postalCode).toBe("Postleitzahl");
    expect(props.countries[1]?.labels.firstName).toBe("Vorname");
    expect(props.countries[1]?.rows[0]).toEqual(["company"]);
    expect(JSON.stringify(props)).not.toContain("{field}");
  });

  it("gives it the starting country's error texts only for the fields that country draws", () => {
    given.length = 0;
    render(
      <AddressForm
        countries={countries}
        values={{ countryCode: "de" }}
        copy={catalogs.en.molecules.addressForm}
        locale="en-US"
        errors={{ postalCode: "pattern", province: "required", city: "invalid" }}
      />,
    );
    const props = given[0] as { errors: Record<string, string> };
    expect(Object.keys(props.errors).sort()).toEqual(["city", "postalCode"]);
    expect(props.errors.postalCode).toBe("Enter a postal code like 26133.");
  });
});
