import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Address, AddressFormState, CountryCode, LocationAddress } from "./index";

// The address contracts (T34, D48): Address and LocationAddress as AddressCard and a pickup point
// show them, and AddressFormState as AddressForm takes it. Which fields a country shows and
// requires is its format's (`addressFormat`, @shopblok/i18n), not the schema's: the schema only
// holds what no country can do without.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const address = {
  id: "addr_us",
  firstName: "Jordan",
  lastName: "Ellis",
  company: "Northside Design Co.",
  address1: "482 Maple Avenue",
  address2: "Suite 210",
  city: "Brooklyn",
  province: "NY",
  postalCode: "11215",
  countryCode: "us",
  phone: "+1 718 555 0148",
  isDefaultShipping: true,
  isDefaultBilling: false,
};

describe("CountryCode", () => {
  it("is two letters in lower case, as Medusa stores it", () => {
    expect(issues(CountryCode, "cy")).toEqual([]);
    for (const code of ["CY", "cyp", "c", "", "c1", " cy"])
      expect(issues(CountryCode, code), JSON.stringify(code)).not.toEqual([]);
  });
});

describe("Address (AddressCard)", () => {
  it("takes an address with every part, and one with only what no country can do without", () => {
    expect(issues(Address, address)).toEqual([]);
    expect(
      issues(Address, {
        firstName: "Ελένη",
        lastName: "Χαραλάμπους",
        address1: "Λεωφόρος Μακαρίου Γ΄ 45",
        city: "Λευκωσία",
        countryCode: "cy",
      }),
    ).toEqual([]);
  });

  it("wants a name, a street and a country", () => {
    for (const key of ["firstName", "lastName", "address1", "countryCode"] as const) {
      const { [key]: _removed, ...without } = address;
      expect(issues(Address, without), key).not.toEqual([]);
    }
  });

  it("refuses an empty string for a part: a part that is missing is absent", () => {
    for (const key of ["company", "address2", "city", "province", "postalCode", "phone"] as const)
      expect(issues(Address, { ...address, [key]: "" }), key).not.toEqual([]);
  });

  it("does not ask for a city: seven countries' formats have none (D65)", () => {
    const { city: _city, ...singapore } = { ...address, countryCode: "sg", postalCode: "079903" };
    expect(issues(Address, singapore)).toEqual([]);
  });

  it("does not ask for a province or a postal code: Cyprus has no province, Ireland had no postcode", () => {
    const { province: _province, postalCode: _postalCode, ...bare } = address;
    expect(issues(Address, bare)).toEqual([]);
  });

  it("takes the two defaults apart: shipping alone, billing alone, both, neither", () => {
    for (const [isDefaultShipping, isDefaultBilling] of [
      [true, false],
      [false, true],
      [true, true],
      [false, false],
    ])
      expect(issues(Address, { ...address, isDefaultShipping, isDefaultBilling })).toEqual([]);
    expect(issues(Address, { ...address, isDefaultShipping: "yes" })).not.toEqual([]);
  });
});

describe("LocationAddress (a pickup point)", () => {
  it("is an address of a place: no person, no id, no defaults", () => {
    expect(
      issues(LocationAddress, {
        address1: "118 Wythe Avenue",
        city: "Brooklyn",
        province: "NY",
        postalCode: "11249",
        countryCode: "us",
      }),
    ).toEqual([]);
    expect(Object.keys(LocationAddress.shape).sort()).toEqual([
      "address1",
      "address2",
      "city",
      "company",
      "countryCode",
      "phone",
      "postalCode",
      "province",
    ]);
  });
});

describe("AddressFormState (AddressForm)", () => {
  const state = {
    countries: ["cy", "us", "gb", "de", "fr", "ch"],
    values: { countryCode: "us", firstName: "Jordan" },
  };

  it("takes the region's countries and the values so far, which may be only the country", () => {
    expect(issues(AddressFormState, state)).toEqual([]);
    expect(issues(AddressFormState, { ...state, values: { countryCode: "cy" } })).toEqual([]);
    expect(issues(AddressFormState, { ...state, values: address })).toEqual([]);
  });

  it("wants the country, which decides the form, but no other value", () => {
    expect(issues(AddressFormState, { ...state, values: { firstName: "Jordan" } })).not.toEqual([]);
    expect(issues(AddressFormState, { ...state, values: {} })).not.toEqual([]);
  });

  it("refuses a country that is not one of the form's: the select would have no such option", () => {
    expect(issues(AddressFormState, { ...state, values: { countryCode: "jp" } })).toEqual([
      "the address's country is not one of the form's countries",
    ]);
  });

  it("refuses a country listed twice: the select would offer it twice", () => {
    expect(
      issues(AddressFormState, {
        ...state,
        countries: ["cy", "us", "cy"],
        values: { countryCode: "us" },
      }),
    ).toEqual(["a country is listed twice"]);
  });

  it("wants at least one country, each in lower case", () => {
    expect(issues(AddressFormState, { ...state, countries: [] })).not.toEqual([]);
    expect(
      issues(AddressFormState, { ...state, countries: ["US"], values: { countryCode: "us" } }),
    ).not.toEqual([]);
  });

  it("refuses a value that is an empty string, as Address does", () => {
    expect(
      issues(AddressFormState, { ...state, values: { countryCode: "us", firstName: "" } }),
    ).not.toEqual([]);
  });

  it("draws as JSON Schema, as the entry's Props table does", () => {
    const schema = z.toJSONSchema(AddressFormState, { io: "input", unrepresentable: "any" });
    expect(JSON.stringify(schema)).toContain("countries");
    expect(JSON.stringify(schema)).toContain("values");
  });
});
