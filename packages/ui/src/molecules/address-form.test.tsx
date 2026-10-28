import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import {
  addressFormat,
  catalogs,
  countryName,
  formatMessage,
  hasAddressFormat,
  LOCALES,
  type Locale,
} from "@shopblok/i18n";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { AddressForm, type AddressFormProps } from "./address-form";
import { TOKENS } from "./address-form-fields";

const htmlLang = (locale: Locale) => commerceFixtures[locale].market.htmlLang;
/** The six seeded markets' countries, in the markets' order. */
const SEEDED = commerceFixtures.en.markets.map((market) => market.country);
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

function setup(locale: Locale = "en", props: Partial<AddressFormProps> = {}) {
  return render(
    <AddressForm
      countries={SEEDED}
      values={{ countryCode: commerceFixtures[locale].market.country }}
      copy={catalogs[locale].molecules.addressForm}
      locale={htmlLang(locale)}
      {...props}
    />,
  );
}

type Container = ReturnType<typeof render>["container"];
/** The fields in the order they are in the page: the country first, the phone last. */
const fieldNames = (container: Container) =>
  [...container.querySelectorAll<HTMLElement>("[data-slot=address-field]")].map(
    (field) => field.dataset.field,
  );
const control = (container: Container, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
/** A field's label as it reads: the label, then "(optional)" when it may stay empty. */
const labelText = (element: HTMLElement) =>
  plain((element as HTMLInputElement).labels?.[0]?.textContent);
const pattern = (value: string, source: string) => new RegExp(`^(?:${source})$`, "v").test(value);

const source = readFileSync(path.join(import.meta.dirname, "address-form.tsx"), "utf8");
const clientSource = readFileSync(
  path.join(import.meta.dirname, "address-form-fields.tsx"),
  "utf8",
);

// D48's list: the formats of CY, US, DE, CH, GB, FR and one country no market seeds, each in its
// order with its required fields. The labels are English's; `names` is what the country calls them.
type Expectation = {
  country: string;
  name: string;
  /** The fields after the country select and before the phone, in order. */
  fields: string[];
  required: string[];
  labels: Record<string, string>;
  postalCode?: {
    pattern: string;
    /** The mismatch bubble's text and the hint under the field. */
    title: string;
    example: string;
    prefix?: string;
    numeric: boolean;
    accepts: string[];
    refuses: string[];
  };
};

const countries: Expectation[] = [
  {
    country: "cy",
    name: "Cyprus",
    fields: ["firstName", "lastName", "company", "address1", "address2", "postalCode", "city"],
    required: ["firstName", "lastName", "address1", "city"],
    labels: { postalCode: "Postal code", city: "City" },
    postalCode: {
      pattern: "\\d{4}",
      title: "Enter a postal code like 2008.",
      example: "2008",
      numeric: true,
      accepts: ["1065", "2008"],
      refuses: ["106", "10650", "ab12"],
    },
  },
  {
    country: "us",
    name: "United States",
    fields: [
      "firstName",
      "lastName",
      "company",
      "address1",
      "address2",
      "city",
      "province",
      "postalCode",
    ],
    required: ["firstName", "lastName", "address1", "city", "province", "postalCode"],
    labels: { city: "City", province: "State", postalCode: "ZIP code" },
    postalCode: {
      pattern: "(\\d{5})(?:[ \\-](\\d{4}))?",
      title: "Enter a ZIP code like 95014.",
      example: "95014",
      // ZIP+4 has a hyphen the numeric keyboard lacks: the plain keyboard.
      numeric: false,
      accepts: ["11215", "11215-1234", "11215 1234"],
      refuses: ["1121", "112151234", "ABCDE"],
    },
  },
  {
    country: "de",
    name: "Germany",
    fields: ["firstName", "lastName", "company", "address1", "address2", "postalCode", "city"],
    required: ["firstName", "lastName", "address1", "postalCode", "city"],
    labels: { postalCode: "Postal code", city: "City" },
    postalCode: {
      pattern: "\\d{5}",
      title: "Enter a postal code like 26133.",
      example: "26133",
      numeric: true,
      accepts: ["10969"],
      refuses: ["1096", "109690", "D-10969"],
    },
  },
  {
    country: "ch",
    name: "Switzerland",
    // The company comes before the name here, and CH- is written before the postal code.
    fields: ["company", "firstName", "lastName", "address1", "address2", "postalCode", "city"],
    required: ["firstName", "lastName", "address1", "postalCode", "city"],
    labels: { postalCode: "Postal code", city: "City" },
    postalCode: {
      pattern: "\\d{4}",
      title: "Enter a postal code like 2544.",
      example: "2544",
      prefix: "CH-",
      numeric: true,
      accepts: ["8001"],
      refuses: ["800", "CH-8001"],
    },
  },
  {
    country: "gb",
    name: "United Kingdom",
    // The post town and the postcode each have a line of their own.
    fields: ["firstName", "lastName", "company", "address1", "address2", "city", "postalCode"],
    required: ["firstName", "lastName", "address1", "city", "postalCode"],
    labels: { city: "Town or city", postalCode: "Postal code" },
    postalCode: {
      // Letters match in either case: a shopper types "ec1y 8sy".
      pattern: "[Gg][Ii][Rr] ?0[Aa][Aa]",
      title: "Enter a postal code like EC1Y 8SY.",
      example: "EC1Y 8SY",
      numeric: false,
      accepts: ["EC1Y 8SY", "ec1y 8sy", "M2 5BQ", "m25bq"],
      refuses: ["12345", "EC1Y", "QQ1 1QQ"],
    },
  },
  {
    country: "fr",
    name: "France",
    // The company first, and no region to ask for.
    fields: ["company", "firstName", "lastName", "address1", "address2", "postalCode", "city"],
    required: ["firstName", "lastName", "address1", "postalCode", "city"],
    labels: { postalCode: "Postal code", city: "City" },
    postalCode: {
      pattern: "\\d{2} ?\\d{3}",
      title: "Enter a postal code like 33380.",
      example: "33380",
      numeric: false,
      accepts: ["69003", "69 003"],
      refuses: ["6900", "ABCDE"],
    },
  },
  {
    // Japan: no market seeds it, so its form comes from the data alone (Principle 10), in the
    // Latin order a page in English gets.
    country: "jp",
    name: "Japan",
    fields: ["firstName", "lastName", "company", "address1", "address2", "province", "postalCode"],
    required: ["firstName", "lastName", "address1", "province", "postalCode"],
    labels: { province: "Prefecture", postalCode: "Postal code" },
    postalCode: {
      pattern: "\\d{3}-?\\d{4}",
      title: "Enter a postal code like 154-0023.",
      example: "154-0023",
      numeric: false,
      accepts: ["107-0061", "1070061"],
      refuses: ["107-006", "ABC-DEFG"],
    },
  },
];

const withJapan = [...SEEDED, "jp"];

describe("AddressForm", () => {
  describe("structure", () => {
    it("is a plain form named for the address it is for, with a submit button", () => {
      const { container } = setup();
      const form = screen.getByRole("form", { name: "Address" });
      expect(form.tagName).toBe("FORM");
      expect(container.querySelector('button[type="submit"]')?.textContent).toBe("Save address");
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("renders its children inside the form, after the fields and before the submit button", () => {
      const { container } = setup("en", { children: <input type="checkbox" name="extra" /> });
      const form = screen.getByRole("form", { name: "Address" });
      const extra = container.querySelector('input[name="extra"]') as HTMLElement;
      expect(form.contains(extra)).toBe(true);
      const submit = container.querySelector('button[type="submit"]') as HTMLElement;
      expect(extra.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const phone = control(container, "phone");
      expect(phone.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it.each([
      ["shipping", "Shipping address"],
      ["billing", "Billing address"],
    ] as const)("is the %s address when it says so", (section, name) => {
      setup("en", { section });
      expect(screen.getByRole("form", { name })).toBeTruthy();
    });

    it("has the country select first, then the country's fields, then the phone", () => {
      const { container } = setup();
      const fields = fieldNames(container);
      expect(fields[0]).toBe("countryCode");
      expect(fields.at(-1)).toBe("phone");
      expect(container.querySelector("select")).toBe(control(container, "countryCode"));
      expect(container.querySelectorAll("select")).toHaveLength(1);
    });

    it("offers the countries it is given, named in the page's language, in the order given", () => {
      for (const locale of LOCALES) {
        const { container, unmount } = setup(locale, { countries: ["ch", "cy", "us"] });
        const options = [...container.querySelectorAll<HTMLOptionElement>("option")];
        expect(options.map((option) => option.value)).toEqual(["ch", "cy", "us"]);
        expect(options.map((option) => option.textContent)).toEqual(
          ["ch", "cy", "us"].map((code) => countryName(code, htmlLang(locale))),
        );
        unmount();
      }
      const { container } = setup("el");
      expect(
        [...container.querySelectorAll("option")].find((option) => option.value === "cy")
          ?.textContent,
      ).toBe("Κύπρος");
    });

    it("selects the country of the values", () => {
      for (const country of SEEDED) {
        const { container, unmount } = setup("en", { values: { countryCode: country } });
        expect(control(container, "countryCode").value).toBe(country);
        unmount();
      }
    });

    it("starts from the first country when the values name one it does not offer", () => {
      const { container } = setup("en", { values: { countryCode: "jp" } });
      expect(control(container, "countryCode").value).toBe("cy");
    });

    it("says that every field is required unless marked optional", () => {
      setup();
      expect(screen.getByText("All fields are required unless marked optional.")).toBeTruthy();
    });

    it("is a plain form: a URL action posts, a function leaves the method to React", () => {
      const { container, rerender } = setup("en", { action: "/api/address" });
      expect(container.querySelector("form")?.getAttribute("action")).toBe("/api/address");
      expect(container.querySelector("form")?.getAttribute("method")).toBe("post");
      rerender(
        <AddressForm
          countries={SEEDED}
          values={{ countryCode: "us" }}
          copy={catalogs.en.molecules.addressForm}
          locale="en-US"
          action={() => {}}
        />,
      );
      expect(container.querySelector("form")?.getAttribute("method")).toBeNull();
    });

    it("posts without an action too, so the address never lands in the URL (PR 56 review)", () => {
      const { container } = setup();
      expect(container.querySelector("form")?.getAttribute("method")).toBe("post");
    });

    it("passes the form's own props on, and merges the class", () => {
      const { container } = setup("en", { id: "checkout-address", className: "max-w-xl" });
      const form = container.querySelector("form");
      expect(form?.id).toBe("checkout-address");
      expect(form?.className).toContain("max-w-xl");
      expect(form?.className).toContain("@container");
    });

    it("sends the address's id when it has one (an address being edited), and only then", () => {
      const withId = setup("en", { values: { countryCode: "us", id: "addr_us" } });
      expect(control(withId.container, "addressId").value).toBe("addr_us");
      withId.unmount();
      const without = setup("en");
      expect(without.container.querySelector('[name="addressId"]')).toBeNull();
    });

    it("gives two forms on one page ids of their own, each label pointing at its control", () => {
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <AddressForm
              key={key}
              countries={SEEDED}
              values={{ countryCode: "us" }}
              copy={catalogs.en.molecules.addressForm}
              locale="en-US"
            />
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const control of container.querySelectorAll("input:not([type=hidden]), select")) {
        expect((control as HTMLInputElement).labels).toHaveLength(1);
      }
      expect(screen.getAllByRole("form")).toHaveLength(2);
    });
  });

  describe("each country's form (D48)", () => {
    it.each(countries)(
      "$country ($name): its fields in its order, its required marks, its postal code",
      (expected) => {
        const { container } = setup("en", {
          countries: withJapan,
          values: { countryCode: expected.country },
        });
        expect(control(container, "countryCode").value).toBe(expected.country);
        // The order of the fields in the page is the country's, and the phone comes last.
        expect(fieldNames(container)).toEqual(["countryCode", ...expected.fields, "phone"]);
        // Each is required, or marked optional in its label; the browser is told too.
        for (const field of expected.fields) {
          const input = control(container, field);
          const required = expected.required.includes(field);
          expect(input.required, `${expected.country} ${field}`).toBe(required);
          const label = labelText(input);
          if (required) expect(label, `${expected.country} ${field}`).not.toContain("(optional)");
          else expect(label, `${expected.country} ${field}`).toMatch(/ \(optional\)$/);
        }
        // What the country calls its parts.
        for (const [field, label] of Object.entries(expected.labels)) {
          expect(labelText(control(container, field)).replace(" (optional)", "")).toBe(label);
        }
        // The postal code: its pattern, what it looks like, its prefix and its keyboard.
        const postal = container.querySelector<HTMLInputElement>('[name="postalCode"]');
        if (expected.postalCode === undefined) {
          expect(postal).toBeNull();
          return;
        }
        const code = expected.postalCode;
        expect(postal?.getAttribute("pattern")).toContain(code.pattern);
        expect(postal?.title).toBe(code.title);
        expect(screen.getByText(`For example: ${code.example}`)).toBeTruthy();
        expect(postal?.getAttribute("inputmode")).toBe(code.numeric ? "numeric" : null);
        for (const value of code.accepts)
          expect(pattern(value, postal?.getAttribute("pattern") ?? ""), value).toBe(true);
        for (const value of code.refuses)
          expect(pattern(value, postal?.getAttribute("pattern") ?? ""), value).toBe(false);
        const prefix = container.querySelector("[data-slot=address-field-prefix]");
        if (code.prefix === undefined) expect(prefix).toBeNull();
        else {
          expect(prefix?.textContent).toBe(code.prefix);
          // Shown beside the field, in front of the typed part, never typed itself.
          expect(prefix?.getAttribute("aria-hidden")).toBe("true");
          expect(prefix?.closest("[data-slot=input-group]")?.contains(postal)).toBe(true);
        }
      },
    );

    it("a country missing from the format data gets the generic form, not an error", () => {
      expect(hasAddressFormat("qq")).toBe(false);
      const { container } = setup("en", {
        countries: ["us", "qq"],
        values: { countryCode: "qq" },
      });
      expect(fieldNames(container)).toEqual([
        "countryCode",
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "city",
        "province",
        "postalCode",
        "phone",
      ]);
      // The street and the city are required, the rest may stay empty.
      for (const field of ["firstName", "lastName", "address1", "city"])
        expect(control(container, field).required, field).toBe(true);
      for (const field of ["company", "address2", "province", "postalCode", "phone"])
        expect(control(container, field).required, field).toBe(false);
      // No pattern, no example, no prefix: nothing to hold the postal code to.
      const postal = control(container, "postalCode");
      expect(postal.getAttribute("pattern")).toBeNull();
      expect(postal.title).toBe("");
      expect(container.querySelector("[data-slot=address-field-prefix]")).toBeNull();
      expect(labelText(postal)).toBe("Postal code (optional)");
      expect(labelText(control(container, "province"))).toBe("Province (optional)");
      // The country is still named, as its code, and chosen.
      expect(control(container, "countryCode").value).toBe("qq");
    });

    it("draws a form for every country in the data, with the street and the city or province, and no row longer than three", () => {
      const problems: string[] = [];
      for (let a = 65; a <= 90; a += 1) {
        for (let b = 65; b <= 90; b += 1) {
          const code = String.fromCharCode(a, b).toLowerCase();
          if (!hasAddressFormat(code)) continue;
          const format = addressFormat(code, "en");
          if (format.rows.some((row) => row.length > 3)) problems.push(`${code}: a long row`);
          const html = renderToStaticMarkup(
            <AddressForm
              countries={[code]}
              values={{ countryCode: code }}
              copy={catalogs.en.molecules.addressForm}
              locale="en-US"
            />,
          );
          for (const field of format.rows.flat())
            if (!html.includes(`name="${field}"`)) problems.push(`${code}: no ${field}`);
          if (html.includes("undefined") || html.includes("NaN"))
            problems.push(`${code}: undefined`);
        }
      }
      expect(problems).toEqual([]);
    }, // Renders every country's form: a few seconds, which passed the 5 s default on a busy
    // runner (PR 56 CI).
    30_000);

    it("has no city field for the seven countries whose format has none, and those are all (D65)", () => {
      const NO_CITY = ["ae", "gi", "jp", "ky", "mo", "nr", "sg"];
      const withoutCity: string[] = [];
      for (let a = 65; a <= 90; a += 1) {
        for (let b = 65; b <= 90; b += 1) {
          const code = String.fromCharCode(a, b).toLowerCase();
          if (hasAddressFormat(code) && !addressFormat(code, "en").rows.flat().includes("city"))
            withoutCity.push(code);
        }
      }
      expect(withoutCity).toEqual(NO_CITY);
      for (const countryCode of NO_CITY) {
        const html = renderToStaticMarkup(
          <AddressForm
            countries={[countryCode]}
            values={{ countryCode, address1: "1 Main St" }}
            copy={catalogs.en.molecules.addressForm}
            locale="en-US"
          />,
        );
        expect(html, countryCode).not.toContain('name="city"');
      }
    });

    it("follows a page in another language: Japan's Latin order in English, labels in the page's language", () => {
      const { container } = setup("de", {
        countries: withJapan,
        values: { countryCode: "jp" },
      });
      expect(labelText(control(container, "province")).replace(" (optional)", "")).toBe(
        "Präfektur",
      );
      expect(labelText(control(container, "postalCode"))).toBe("Postleitzahl");
      expect(labelText(control(container, "firstName"))).toBe("Vorname");
    });

    it.each(LOCALES)(
      "names the parts in %s: the labels follow the country's name types",
      (locale) => {
        const copy = catalogs[locale].molecules.addressForm;
        const { container } = setup(locale, {
          countries: withJapan,
          values: { countryCode: "us" },
        });
        expect(labelText(control(container, "province")).replace(/ \(.*\)$/, "")).toBe(
          copy.labels.province.state,
        );
        expect(labelText(control(container, "postalCode"))).toBe(copy.labels.postalCode.zip);
        expect(labelText(control(container, "company"))).toBe(
          `${copy.labels.company} ${copy.optional}`,
        );
      },
    );
  });

  describe("autocomplete tokens (WCAG 1.3.5)", () => {
    const expected: Record<string, string> = {
      firstName: "given-name",
      lastName: "family-name",
      company: "organization",
      address1: "address-line1",
      address2: "address-line2",
      city: "address-level2",
      province: "address-level1",
      postalCode: "postal-code",
      countryCode: "country",
      phone: "tel",
    };
    const names = Object.keys(expected);

    it("gives every field its token: the name, the address lines, the city, the state, the postal code, the country and the phone", () => {
      const { container } = setup("en", { values: { countryCode: "us" } });
      expect(names.sort()).toEqual([...fieldNames(container)].sort());
      for (const [name, token] of Object.entries(expected)) {
        expect(control(container, name).getAttribute("autocomplete"), name).toBe(token);
      }
      // The component's own table says the same, so a field cannot lose its token unseen.
      expect(TOKENS).toEqual(expected);
    });

    it.each(["shipping", "billing"] as const)(
      "prefixes every token with the section, for a %s address",
      (section) => {
        const { container } = setup("en", { values: { countryCode: "us" }, section });
        for (const [name, token] of Object.entries(expected)) {
          expect(control(container, name).getAttribute("autocomplete"), name).toBe(
            `${section} ${token}`,
          );
        }
      },
    );

    it("gives every input and select of every country's form a token", () => {
      const problems: string[] = [];
      for (let a = 65; a <= 90; a += 1) {
        for (let b = 65; b <= 90; b += 1) {
          const code = String.fromCharCode(a, b).toLowerCase();
          if (!hasAddressFormat(code) && code !== "qq") continue;
          const holder = document.createElement("div");
          holder.innerHTML = renderToStaticMarkup(
            <AddressForm
              countries={[code]}
              values={{ countryCode: code }}
              copy={catalogs.en.molecules.addressForm}
              locale="en-US"
              section="billing"
            />,
          );
          for (const element of holder.querySelectorAll("input:not([type=hidden]), select")) {
            const token = element.getAttribute("autocomplete");
            const name = element.getAttribute("name") ?? "";
            if (token !== `billing ${expected[name]}`) problems.push(`${code} ${name}: ${token}`);
          }
        }
      }
      expect(problems).toEqual([]);
    }, // Renders every country's form: a few seconds, which passed the 5 s default on a busy
    // runner (PR 56 CI).
    30_000);

    it("types each field for its keyboard: text, and tel for the phone", () => {
      const { container } = setup("en", { values: { countryCode: "de" } });
      for (const name of [
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "city",
        "postalCode",
      ])
        expect(control(container, name).getAttribute("type"), name).toBe("text");
      expect(control(container, "phone").getAttribute("type")).toBe("tel");
      expect(control(container, "phone").getAttribute("inputmode")).toBe("tel");
      expect(control(container, "phone").required).toBe(false);
      expect(labelText(control(container, "phone"))).toBe("Phone (optional)");
    });

    it("has a real <label for> on every field, and no placeholder standing in for one", () => {
      const { container } = setup("en", { values: { countryCode: "us" } });
      for (const element of container.querySelectorAll<HTMLInputElement>(
        "input:not([type=hidden]), select",
      )) {
        expect(element.labels, element.name).toHaveLength(1);
        expect(element.getAttribute("placeholder"), element.name).toBeNull();
      }
    });
  });

  describe("values and errors", () => {
    const typed = commerceFixtures.en.addresses[0]!;

    it("shows the values it is given, in the fields of their country", () => {
      const { container } = setup("en", {
        values: { ...typed, company: "Northside Design Co.", address2: "Suite 210" },
      });
      expect((control(container, "firstName") as HTMLInputElement).value).toBe(typed.firstName);
      expect((control(container, "address1") as HTMLInputElement).value).toBe(typed.address1);
      expect((control(container, "province") as HTMLInputElement).value).toBe("NY");
      expect((control(container, "postalCode") as HTMLInputElement).value).toBe("11215");
      expect((control(container, "phone") as HTMLInputElement).value).toBe(typed.phone);
      expect((control(container, "company") as HTMLInputElement).value).toBe(
        "Northside Design Co.",
      );
    });

    it("is quiet when nothing is wrong: no error, no invalid mark, nothing in the status line", () => {
      const { container } = setup();
      expect(container.querySelectorAll("[aria-invalid]")).toHaveLength(0);
      expect(container.querySelector("[data-slot=address-field-error]")).toBeNull();
      expect(container.querySelector("[data-slot=address-form-status]")?.textContent).toBe("");
    });

    it("says what is wrong beside each field and ties it to the field, keeping the values", () => {
      const { mistaken } = commerceFixtures.en.addressSamples;
      const { container } = setup("en", {
        values: mistaken,
        errors: { province: "required", postalCode: "pattern", firstName: "invalid" },
      });
      const cases = [
        ["province", "State is required."],
        ["postalCode", "Enter a ZIP code like 95014."],
        ["firstName", "First name is not valid. Check it and try again."],
      ] as const;
      for (const [name, message] of cases) {
        const input = control(container, name);
        expect(input.getAttribute("aria-invalid"), name).toBe("true");
        const error = input.getAttribute("aria-describedby")?.split(" ").pop();
        expect(error).toBeTruthy();
        const text = document.getElementById(error ?? "");
        expect(text?.textContent, name).toBe(message);
        // Not by colour alone: an icon and words.
        expect(text?.querySelector("svg[aria-hidden=true]"), name).toBeTruthy();
      }
      // The fields without a mistake are not marked.
      for (const name of ["lastName", "address1", "city"])
        expect(control(container, name).getAttribute("aria-invalid"), name).toBeNull();
      // What was typed stays.
      expect((control(container, "postalCode") as HTMLInputElement).value).toBe("1121");
      expect((control(container, "city") as HTMLInputElement).value).toBe("Brooklyn");
      expect((control(container, "address1") as HTMLInputElement).value).toBe("482 Maple Avenue");
      // The postal code keeps its example beside the error.
      expect(
        control(container, "postalCode").getAttribute("aria-describedby")?.split(" "),
      ).toHaveLength(2);
    });

    it("says in the status line how many fields need attention, in a region that is always there", () => {
      const { container, rerender } = setup();
      const region = container.querySelector("[data-slot=address-form-status]");
      expect(region?.getAttribute("role")).toBe("status");
      expect(region?.getAttribute("aria-live")).toBe("polite");
      rerender(
        <AddressForm
          countries={SEEDED}
          values={commerceFixtures.en.addressSamples.mistaken}
          copy={catalogs.en.molecules.addressForm}
          locale="en-US"
          errors={{ province: "required", postalCode: "pattern" }}
        />,
      );
      // The same element, so a screen reader sees its text change rather than a new region.
      expect(container.querySelector("[data-slot=address-form-status]")).toBe(region);
      expect(region?.textContent).toBe("2 fields need your attention.");
      rerender(
        <AddressForm
          countries={SEEDED}
          values={commerceFixtures.en.addressSamples.mistaken}
          copy={catalogs.en.molecules.addressForm}
          locale="en-US"
          errors={{ province: "required" }}
        />,
      );
      expect(region?.textContent).toBe("1 field needs your attention.");
    });

    it("tells a postal code that does not match what one looks like, and a field the server refused that it is not valid", () => {
      const { container } = setup("en", {
        countries: withJapan,
        values: { countryCode: "gb", postalCode: "12345" },
        errors: { postalCode: "pattern", city: "invalid", lastName: "required" },
      });
      const messages = [...container.querySelectorAll("[data-slot=address-field-error]")].map(
        (element) => element.textContent,
      );
      expect(messages).toEqual([
        "Last name is required.",
        "Town or city is not valid. Check it and try again.",
        "Enter a postal code like EC1Y 8SY.",
      ]);
    });

    it("tells a mismatch with no example to check the format, using the field's own name", () => {
      const { container } = setup("en", {
        countries: ["qq"],
        values: { countryCode: "qq", postalCode: "!!" },
        errors: { postalCode: "pattern" },
      });
      expect(container.querySelector("[data-slot=address-field-error]")?.textContent).toBe(
        "Postal code is not in the right format.",
      );
    });

    it("can name the country and the phone in an error", () => {
      const { container } = setup("en", { errors: { countryCode: "invalid", phone: "invalid" } });
      const select = control(container, "countryCode");
      expect(select.getAttribute("aria-invalid")).toBe("true");
      expect(
        document.getElementById(select.getAttribute("aria-describedby") ?? "")?.textContent,
      ).toBe("Country or region is not valid. Check it and try again.");
      expect(control(container, "phone").getAttribute("aria-invalid")).toBe("true");
    });

    it("ignores an error about a field the country does not have", () => {
      const { container } = setup("en", {
        values: { countryCode: "de" },
        errors: { province: "required" },
      });
      expect(container.querySelectorAll("[aria-invalid]")).toHaveLength(0);
      expect(container.querySelector("[data-slot=address-form-status]")?.textContent).toBe("");
    });

    it("says when the address could not be saved and no field is to blame", () => {
      const { container } = setup("en", { status: "error" });
      expect(container.querySelector("[data-slot=address-form-status]")?.textContent).toBe(
        "We could not save this address. Check the details and try again.",
      );
      expect(container.querySelectorAll("[aria-invalid]")).toHaveLength(0);
    });

    it.each(LOCALES)("reads its errors in %s", (locale) => {
      const copy = catalogs[locale].molecules.addressForm;
      const { container } = setup(locale, {
        countries: withJapan,
        values: { countryCode: "us" },
        errors: { province: "required", postalCode: "pattern" },
      });
      const messages = [...container.querySelectorAll("[data-slot=address-field-error]")].map((e) =>
        plain(e.textContent),
      );
      expect(messages).toEqual([
        plain(
          formatMessage(
            copy.errors.required,
            { field: copy.labels.province.state },
            htmlLang(locale),
          ),
        ),
        plain(formatMessage(copy.errors.postalCode.zip, { example: "95014" }, htmlLang(locale))),
      ]);
      expect(plain(container.querySelector("[data-slot=address-form-status]")?.textContent)).toBe(
        plain(formatMessage(copy.summary, { count: 2 }, htmlLang(locale))),
      );
    });
  });

  describe("sending", () => {
    it("keeps the button, named for what is happening, and stops it submitting twice", () => {
      setup("en", { status: "pending" });
      const button = screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement;
      expect(button.type).toBe("button");
      // Base UI's focusableWhenDisabled: aria-disabled, so it stays in the tab order.
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.disabled).toBe(false);
      expect(button.getAttribute("aria-busy")).toBe("true");
      expect(screen.queryByRole("button", { name: "Save address" })).toBeNull();
      const spinner = button.querySelector("[data-slot=spinner]");
      expect(spinner?.closest("[aria-hidden=true]")).toBeTruthy();
    });

    it("says it in the status region, which is the same one as in every other state", () => {
      const { container, rerender } = setup();
      const region = container.querySelector("[data-slot=address-form-status]");
      rerender(
        <AddressForm
          countries={SEEDED}
          values={{ countryCode: "us" }}
          copy={catalogs.en.molecules.addressForm}
          locale="en-US"
          status="pending"
        />,
      );
      expect(container.querySelector("[data-slot=address-form-status]")).toBe(region);
      expect(region?.textContent).toBe("Saving…");
    });

    it("keeps the values in fields that are read-only, not disabled", () => {
      const { container } = setup("en", {
        status: "pending",
        values: commerceFixtures.en.addresses[0]!,
      });
      for (const input of container.querySelectorAll<HTMLInputElement>(
        "input:not([type=hidden])",
      )) {
        expect(input.readOnly, input.name).toBe(true);
        expect(input.disabled, input.name).toBe(false);
      }
      expect((control(container, "address1") as HTMLInputElement).value).toBe("482 Maple Avenue");
      expect(control(container, "countryCode").getAttribute("aria-disabled")).toBe("true");
    });

    it("has no submit button that works: a click and Enter both do nothing", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      const { container } = setup("en", {
        status: "pending",
        onSubmit,
        values: commerceFixtures.en.addresses[0]!,
      });
      await user.click(screen.getByRole("button", { name: "Saving…" }));
      await user.click(control(container, "address1"));
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
      // The first submit button is a disabled one, which is what stops Enter in a browser.
      const first = container.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(first?.disabled).toBe(true);
      expect(first?.hidden).toBe(true);
      expect(container.querySelectorAll('button[type="submit"]:not([disabled])')).toHaveLength(0);
    });

    it("keeps the country while it is being sent", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", { status: "pending" });
      await user.selectOptions(control(container, "countryCode"), "de");
      expect(control(container, "countryCode").value).toBe("us");
    });

    it("has no hidden submit button in any other state", () => {
      for (const status of ["idle", "error"] as const) {
        const { container, unmount } = setup("en", { status });
        expect(container.querySelectorAll("button[hidden]")).toHaveLength(0);
        unmount();
      }
    });

    it("leaves focus on the button while it is sending", async () => {
      const user = userEvent.setup();
      const props = {
        countries: SEEDED,
        values: { countryCode: "us" },
        copy: catalogs.en.molecules.addressForm,
        locale: "en-US",
      };
      const { rerender } = render(<AddressForm {...props} />);
      screen.getByRole("button", { name: "Save address" }).focus();
      rerender(<AddressForm {...props} status="pending" />);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Saving…" }));
      await user.tab();
    });

    it("takes the button's text from the step it is in", () => {
      setup("en", { submitLabel: "Continue to delivery" });
      expect(screen.getByRole("button", { name: "Continue to delivery" })).toBeTruthy();
    });
  });

  describe("changing the country with JavaScript", () => {
    it("swaps the fields to the new country's format at once, keeping what was typed", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", { values: { countryCode: "cy" } });
      await user.type(control(container, "firstName"), "Eleni");
      await user.type(control(container, "address1"), "Makariou 45");
      await user.type(control(container, "city"), "Nicosia");
      expect(fieldNames(container)).not.toContain("province");
      await user.selectOptions(control(container, "countryCode"), "us");
      expect(fieldNames(container)).toEqual([
        "countryCode",
        "firstName",
        "lastName",
        "company",
        "address1",
        "address2",
        "city",
        "province",
        "postalCode",
        "phone",
      ]);
      expect((control(container, "firstName") as HTMLInputElement).value).toBe("Eleni");
      expect((control(container, "address1") as HTMLInputElement).value).toBe("Makariou 45");
      expect((control(container, "city") as HTMLInputElement).value).toBe("Nicosia");
      // The labels, the required marks and the tokens are the new country's.
      expect(labelText(control(container, "province"))).toBe("State");
      expect(labelText(control(container, "postalCode"))).toBe("ZIP code");
      expect(control(container, "province").required).toBe(true);
      expect(control(container, "postalCode").getAttribute("pattern")).toContain("\\d{5}");
      expect(control(container, "postalCode").getAttribute("autocomplete")).toBe("postal-code");
    });

    it("reorders the fields the two countries share, without losing their text", async () => {
      const user = userEvent.setup();
      // Cyprus has the postal code before the city; the United Kingdom has them on lines of their own.
      const { container } = setup("en", { values: { countryCode: "ch" } });
      await user.type(control(container, "company"), "Atelier AG");
      await user.type(control(container, "lastName"), "Meier");
      const company = control(container, "company");
      await user.selectOptions(control(container, "countryCode"), "us");
      // Switzerland puts the company first, the United States after the name: same node, new place.
      expect(control(container, "company")).toBe(company);
      expect(fieldNames(container).slice(1, 4)).toEqual(["firstName", "lastName", "company"]);
      expect((control(container, "company") as HTMLInputElement).value).toBe("Atelier AG");
      expect((control(container, "lastName") as HTMLInputElement).value).toBe("Meier");
    });

    it("gives a field back its text when the shopper returns to the country that has it", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", { values: { countryCode: "us" } });
      await user.type(control(container, "province"), "NY");
      await user.selectOptions(control(container, "countryCode"), "de");
      expect(container.querySelector('[name="province"]')).toBeNull();
      await user.selectOptions(control(container, "countryCode"), "us");
      expect((control(container, "province") as HTMLInputElement).value).toBe("NY");
    });

    it("keeps focus on the select, and says once that the fields changed", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", { values: { countryCode: "cy" } });
      const status = container.querySelector("[data-slot=address-form-country-status]");
      expect(status?.getAttribute("role")).toBe("status");
      expect(status?.getAttribute("aria-live")).toBe("polite");
      expect(status?.textContent).toBe("");
      const select = control(container, "countryCode");
      await user.selectOptions(select, "gb");
      expect(document.activeElement).toBe(select);
      expect(container.querySelector("[data-slot=address-form-country-status]")).toBe(status);
      expect(status?.textContent).toBe(
        "The address fields now follow the format for United Kingdom.",
      );
    });

    it("drops the errors about the old country once another is chosen", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", {
        values: commerceFixtures.en.addressSamples.mistaken,
        errors: { province: "required", postalCode: "pattern" },
      });
      expect(container.querySelectorAll("[aria-invalid=true]")).toHaveLength(2);
      await user.selectOptions(control(container, "countryCode"), "de");
      expect(container.querySelectorAll("[aria-invalid]")).toHaveLength(0);
      expect(container.querySelector("[data-slot=address-field-error]")).toBeNull();
      // Back to the country the server drew: its errors are about it, and are back.
      await user.selectOptions(control(container, "countryCode"), "us");
      expect(container.querySelectorAll("[aria-invalid=true]")).toHaveLength(2);
    });

    it("starts again from new values when the server hands over another address", () => {
      const { container, rerender } = setup("en", {
        values: { countryCode: "us", id: "addr_1", firstName: "Jordan" },
      });
      fireEvent.change(control(container, "firstName"), { target: { value: "Typed over" } });
      const props = {
        countries: SEEDED,
        copy: catalogs.en.molecules.addressForm,
        locale: "en-US",
      };
      rerender(
        <AddressForm
          {...props}
          values={{ countryCode: "us", id: "addr_1", firstName: "Jordan" }}
        />,
      );
      // The same address: what the shopper typed stays.
      expect((control(container, "firstName") as HTMLInputElement).value).toBe("Typed over");
      rerender(
        <AddressForm {...props} values={{ countryCode: "us", id: "addr_2", firstName: "Lena" }} />,
      );
      expect((control(container, "firstName") as HTMLInputElement).value).toBe("Lena");
    });
  });

  describe("without JavaScript (D48)", () => {
    const markup = (props: Partial<AddressFormProps> = {}) =>
      renderToString(
        <AddressForm
          countries={SEEDED}
          values={commerceFixtures.en.addresses[0]!}
          copy={catalogs.en.molecules.addressForm}
          locale="en-US"
          action="/api/address"
          {...props}
        />,
      );

    it("renders as markup a browser can submit: a native form, named inputs with their values, a submit button", () => {
      const html = markup();
      expect(html).toContain("<form ");
      expect(html).toContain('method="post"');
      expect(html).toContain('action="/api/address"');
      for (const [name, value] of Object.entries({
        firstName: "Jordan",
        lastName: "Ellis",
        address1: "482 Maple Avenue",
        city: "Brooklyn",
        province: "NY",
        postalCode: "11215",
        phone: "+1 718 555 0148",
      }))
        expect(html, name).toContain(`name="${name}" value="${value}"`);
      expect(html).toContain('name="countryCode"');
      expect(html).toContain('type="submit"');
      expect(html).toContain("<option");
    });

    it("draws the starting country's fields and the chosen country selected, so what is submitted is the choice", () => {
      const html = markup({ values: { countryCode: "ch", firstName: "Noah" } });
      expect(html).toMatch(/<option[^>]*value="ch"[^>]*selected/);
      expect(html).not.toMatch(/<option[^>]*value="us"[^>]*selected/);
      // Switzerland's fields only; the server draws the others when it re-renders.
      expect(html).toContain("CH-");
      expect(html).not.toContain('name="province"');
    });

    it("has every country the form offers as an option, so the server can be sent any of them", () => {
      const html = markup();
      for (const country of SEEDED) expect(html).toContain(`value="${country}"`);
    });

    it("marks the fields as required in the markup the browser validates", () => {
      const html = markup({ values: { countryCode: "us" } });
      for (const field of ["firstName", "lastName", "address1", "city", "province", "postalCode"])
        expect(html, field).toMatch(
          new RegExp(
            `<input[^>]*name="${field}"[^>]*required|<input[^>]*required[^>]*name="${field}"`,
          ),
        );
      expect(html).toMatch(/pattern="\(\\d\{5\}\)/);
    });

    it("is a server component that renders one small client part, and the client part imports no words", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(source).toContain('from "./address-form-fields"');
      expect(clientSource).toMatch(/^"use client";/m);
      // It may name types from @shopblok/i18n, never its code (the formats, the catalogs, ICU).
      const imports = [...clientSource.matchAll(/^import (type )?[^;]*? from "([^"]+)";/gms)];
      for (const [, isType, from] of imports) {
        if (from === "@shopblok/i18n") expect(isType, from).toBe("type ");
        expect(from).not.toMatch(/intl-messageformat|address-format|messages/);
      }
    });
  });

  describe("typed before hydration (T58)", () => {
    const element = (
      <AddressForm
        countries={SEEDED}
        values={{ countryCode: "us" }}
        copy={catalogs.en.molecules.addressForm}
        locale="en-US"
        action="/api/address"
      />
    );

    /** The server's markup, changed by `before` as a shopper would before the scripts run, then hydrated. */
    async function hydrate(before: (container: HTMLElement) => void) {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element);
      before(container);
      const onRecoverableError = vi.fn();
      await act(async () => {
        hydrateRoot(container, element, { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      return container;
    }

    it("keeps a field typed before hydration when another field is typed in afterwards", async () => {
      const container = await hydrate((root) => {
        (control(root, "firstName") as HTMLInputElement).value = "Maria";
      });
      expect(control(container, "firstName").value).toBe("Maria");
      // The next render of the fields: before T58 it wrote the hydrated state (empty) back.
      fireEvent.change(control(container, "lastName"), { target: { value: "Georgiou" } });
      expect(control(container, "firstName").value).toBe("Maria");
      expect(control(container, "lastName").value).toBe("Georgiou");
      container.remove();
    });

    it("follows a country chosen before hydration, keeping what was typed", async () => {
      const container = await hydrate((root) => {
        (control(root, "firstName") as HTMLInputElement).value = "Noah";
        (control(root, "countryCode") as HTMLSelectElement).value = "ch";
      });
      expect(control(container, "countryCode").value).toBe("ch");
      // Switzerland's fields: no state or province, the postal code with its prefix.
      expect(container.querySelector('[name="province"]')).toBeNull();
      expect(container.querySelector('[data-slot="address-field-prefix"]')?.textContent).toBe(
        "CH-",
      );
      fireEvent.change(control(container, "city"), { target: { value: "Zürich" } });
      expect(control(container, "firstName").value).toBe("Noah");
      container.remove();
    });
  });

  describe("keyboard use", () => {
    it("tabs through the fields in the order of the country's format, ending at the button", async () => {
      const user = userEvent.setup();
      const { container } = setup("en", { values: { countryCode: "ch" } });
      const order: string[] = [];
      for (let step = 0; step < 12; step += 1) {
        await user.tab();
        const active = document.activeElement as HTMLInputElement;
        order.push(active.name || active.tagName.toLowerCase());
        if (active.tagName === "BUTTON") break;
      }
      expect(order).toEqual([
        "countryCode",
        "company",
        "firstName",
        "lastName",
        "address1",
        "address2",
        "postalCode",
        "city",
        "phone",
        "button",
      ]);
      expect(container.querySelector("form")).toBeTruthy();
    });

    it("submits with the button and with Enter in a field, once the required fields are filled", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      const { container } = setup("en", {
        onSubmit,
        values: { ...commerceFixtures.en.addresses[0]! },
      });
      await user.click(screen.getByRole("button", { name: "Save address" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await user.click(control(container, "city"));
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("lets the browser hold a postal code to its pattern, in the page's own words for the bubble", () => {
      const { container } = setup("en", { values: { countryCode: "de", postalCode: "1234" } });
      const input = control(container, "postalCode") as HTMLInputElement;
      expect(input.title).toBe("Enter a postal code like 26133.");
      expect(input.getAttribute("pattern")).toBe("\\d{5}");
    });
  });

  describe("sizes and long labels", () => {
    it("makes every control at least 44 px high (D32)", () => {
      const { container } = setup("en", { values: { countryCode: "us" } });
      for (const input of container.querySelectorAll("input:not([type=hidden])"))
        expect(input.className, (input as HTMLInputElement).name).toContain("h-11");
      expect(control(container, "countryCode").className).toContain("h-11");
      expect(screen.getByRole("button", { name: "Save address" }).className).toContain("min-h-11");
    });

    it("uses the focus ring at full strength on the fields and the button", () => {
      const { container } = setup("en", { values: { countryCode: "ch" } });
      for (const element of [
        control(container, "firstName"),
        control(container, "countryCode"),
        screen.getByRole("button", { name: "Save address" }),
      ]) {
        expect(element.className).toContain("focus-visible:ring-ring");
        expect(element.className).not.toMatch(/ring-ring\/\d/);
      }
      // The postal code with a prefix sits in a group that draws the ring around both.
      expect(container.querySelector("[data-slot=input-group]")?.className).toContain("ring-ring");
    });

    it("lays the fields out by container: stacked below 28 rem, on the format's rows above it", () => {
      const { container } = setup("en", { values: { countryCode: "us" } });
      expect(container.querySelector("form")?.className).toContain("@container");
      const cell = (name: string) =>
        container.querySelector(`[data-field="${name}"]`)?.className ?? "";
      for (const name of ["firstName", "company", "address1", "city", "phone"])
        expect(cell(name), name).toContain("col-span-6");
      // Two names share a row; the US's city, state and ZIP code share a row in thirds.
      expect(cell("firstName")).toContain("@md:col-span-3");
      expect(cell("lastName")).toContain("@md:col-span-3");
      for (const name of ["city", "province", "postalCode"])
        expect(cell(name), name).toContain("@md:col-span-2");
      // A postal code beside a city takes a third, and the city the rest.
      const de = setup("en", { values: { countryCode: "de" } });
      expect(de.container.querySelector('[data-field="postalCode"]')?.className).toContain(
        "@md:col-span-2",
      );
      expect(de.container.querySelector('[data-field="city"]')?.className).toContain(
        "@md:col-span-4",
      );
    });

    it.each(["de", "el"] as const)(
      "lets the longest copy and values, in %s, wrap or scroll rather than be cut",
      (locale) => {
        const { long, market } = commerceFixtures[locale];
        const { container } = setup(locale, {
          values: { ...long.address, countryCode: market.country },
          errors: { postalCode: "pattern", address1: "required", city: "invalid" },
          status: "error",
          submitLabel: long.shippingOption.name,
        });
        for (const element of container.querySelectorAll("*")) {
          expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
        }
        // The whole value is in the field, however long, and the field says it scrolls.
        const address1 = control(container, "address1") as HTMLInputElement;
        expect(address1.value).toBe(long.address.address1);
        expect(address1.hasAttribute("data-truncate")).toBe(true);
        expect(address1.className).toContain("min-w-0");
        // The button may wrap and is never wider than the form.
        const button = container.querySelector("button[type=submit]");
        expect(button?.className).toContain("max-w-full");
        expect(button?.textContent).toBe(long.shippingOption.name);
      },
    );
  });

  describe("the copy", () => {
    it.each(LOCALES)("reads in %s: form, note, country, fields and button", (locale) => {
      const copy = catalogs[locale].molecules.addressForm;
      const { container } = setup(locale, {
        countries: withJapan,
        values: { countryCode: commerceFixtures[locale].market.country },
        section: "shipping",
      });
      expect(screen.getByRole("form", { name: copy.label.shipping })).toBeTruthy();
      expect(screen.getByText(copy.requiredNote)).toBeTruthy();
      expect(screen.getByLabelText(copy.countryLabel)).toBeTruthy();
      expect(labelText(control(container, "phone"))).toBe(`${copy.labels.phone} ${copy.optional}`);
      expect(screen.getByRole("button", { name: copy.submit })).toBeTruthy();
    });

    it.each(LOCALES)("names every country in %s through Intl, not a table of ours", (locale) => {
      const { container } = setup(locale, { countries: withJapan });
      for (const option of container.querySelectorAll("option")) {
        expect(option.textContent).toBe(countryName(option.value, htmlLang(locale)));
      }
    });
  });
});
