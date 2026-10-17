import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { addressFormat, addressLines, hasAddressFormat, postalCodePattern } from "./address-format";
import data from "./address-formats.json";
import { compactAll, serializeAll, type GoogleAddressData } from "./address-metadata";

// D48 (T34): the address formats come from the pinned lib-address's copy of Google's metadata.

const countriesDir = path.join(
  path.dirname(createRequire(import.meta.url).resolve("lib-address/package.json")),
  "countries",
);
const google: GoogleAddressData[] = readdirSync(countriesDir)
  .filter((name) => /^[A-Z]{2}\.json$/.test(name))
  .map(
    (name) => JSON.parse(readFileSync(path.join(countriesDir, name), "utf8")) as GoogleAddressData,
  );

const anchored = (pattern: string) => new RegExp(`^(?:${pattern})$`, "v");

describe("address-formats.json", () => {
  it("is what the script writes from the pinned lib-address (run `pnpm --filter @shopblok/i18n address-formats`)", () => {
    expect(google.length).toBeGreaterThan(240);
    expect(data).toEqual(compactAll(google));
    expect(readFileSync(path.join(import.meta.dirname, "address-formats.json"), "utf8")).toBe(
      serializeAll(compactAll(google)),
    );
  });

  it("requires no field Medusa's address cannot hold (a dependent locality, a sorting code)", () => {
    const requiring = google.filter((country) => /[DX]/.test(country.require ?? ""));
    expect(requiring.map((country) => country.key)).toEqual([]);
  });

  it("gives every postal-code pattern in a form <input pattern> compiles, matching each example in either case", () => {
    const problems: string[] = [];
    for (const country of google) {
      if (country.zip === undefined) continue;
      const pattern = postalCodePattern(country.zip);
      if (pattern === undefined) {
        problems.push(`${country.key}: does not compile`);
        continue;
      }
      for (const example of (country.zipex ?? "").split(",").filter(Boolean)) {
        if (!new RegExp(`^(?:${country.zip})$`).test(example))
          problems.push(`${country.key}: Google's own pattern misses ${example}`);
        for (const typed of [example, example.toLowerCase()])
          if (!anchored(pattern).test(typed)) problems.push(`${country.key}: misses ${typed}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("postalCodePattern", () => {
  it("lets a letter match in either case, inside and outside a class", () => {
    expect(postalCodePattern("AD[1-7]0\\d")).toBe("[Aa][Dd][1-7]0\\d");
    expect(postalCodePattern("[ABD-HJ]\\d")).toBe("[AaBbD-Hd-hJj]\\d");
    expect(postalCodePattern("[^A-Z]")).toBe("[^A-Za-z]");
  });

  it("keeps escapes as they are (\\d is not a letter to fold)", () => {
    expect(postalCodePattern("\\d{5}(?:[ \\-]\\d{4})?")).toBe("\\d{5}(?:[ \\-]\\d{4})?");
  });

  it("matches a British postcode typed in lower case", () => {
    const gb = addressFormat("GB").postalCode?.pattern ?? "";
    for (const code of ["EC1Y 8SY", "ec1y 8sy", "m2 5bq", "BFPO 61"])
      expect(anchored(gb).test(code), code).toBe(true);
    for (const code of ["EC1Y", "12345", "QQ1 1QQ"])
      expect(anchored(gb).test(code), code).toBe(false);
  });

  it("gives undefined for a pattern that does not compile", () => {
    expect(postalCodePattern("[")).toBeUndefined();
    expect(postalCodePattern("(\\d")).toBeUndefined();
  });
});

describe("addressFormat", () => {
  it("Cyprus: postal code before the city, both required by default, no province", () => {
    expect(addressFormat("cy")).toEqual({
      countryCode: "cy",
      known: true,
      rows: [
        ["firstName", "lastName"],
        ["company"],
        ["address1"],
        ["address2"],
        ["postalCode", "city"],
      ],
      required: ["firstName", "lastName", "address1", "city"],
      postalCode: { pattern: "\\d{4}", example: "2008" },
      names: { postalCode: "postal", province: "province", city: "city" },
    });
  });

  it("the United States: city, state and ZIP code on one line, all required", () => {
    const us = addressFormat("US", "en");
    expect(us.rows.at(-1)).toEqual(["city", "province", "postalCode"]);
    expect(us.required).toEqual([
      "firstName",
      "lastName",
      "address1",
      "city",
      "province",
      "postalCode",
    ]);
    expect(us.names).toEqual({ postalCode: "zip", province: "state", city: "city" });
    expect(us.postalCode?.example).toBe("95014");
  });

  it("Germany: postal code and city required, no province", () => {
    const de = addressFormat("DE", "de");
    expect(de.rows.at(-1)).toEqual(["postalCode", "city"]);
    expect(de.rows.flat()).not.toContain("province");
    expect(de.required).toEqual(["firstName", "lastName", "address1", "postalCode", "city"]);
  });

  it("Switzerland: the company first, the CH- prefix beside the postal code", () => {
    const ch = addressFormat("CH", "fr");
    expect(ch.rows[0]).toEqual(["company"]);
    expect(ch.rows[1]).toEqual(["firstName", "lastName"]);
    expect(ch.postalCode).toEqual({ pattern: "\\d{4}", example: "2544", prefix: "CH-" });
  });

  it("the United Kingdom: a post town, then the postcode on its own line", () => {
    const gb = addressFormat("GB", "en");
    expect(gb.rows.slice(-2)).toEqual([["city"], ["postalCode"]]);
    expect(gb.names.city).toBe("post_town");
    expect(gb.required).toContain("postalCode");
  });

  it("France: the company first, a region that is not asked", () => {
    const fr = addressFormat("FR", "fr");
    expect(fr.rows[0]).toEqual(["company"]);
    expect(fr.rows.flat()).not.toContain("province");
    expect(fr.postalCode?.pattern).toBe("\\d{2} ?\\d{3}");
  });

  it("Japan: the Latin order on a page in English, Japan's own on a page in Japanese", () => {
    const english = addressFormat("JP", "en");
    expect(english.rows).toEqual([
      ["firstName", "lastName"],
      ["company"],
      ["address1"],
      ["address2"],
      ["province"],
      ["postalCode"],
    ]);
    expect(english.required).toEqual([
      "firstName",
      "lastName",
      "address1",
      "province",
      "postalCode",
    ]);
    expect(english.names.province).toBe("prefecture");
    expect(addressFormat("JP", "ja").rows[0]).toEqual(["postalCode"]);
    expect(addressFormat("JP").rows[0]).toEqual(["postalCode"]);
  });

  it("Brazil: a state and a postal code required, its neighbourhood line left out", () => {
    const br = addressFormat("BR", "en");
    expect(br.rows.flat()).toEqual([
      "company",
      "firstName",
      "lastName",
      "address1",
      "address2",
      "city",
      "province",
      "postalCode",
    ]);
    expect(br.required).toEqual([
      "firstName",
      "lastName",
      "address1",
      "city",
      "province",
      "postalCode",
    ]);
  });

  it("a country Google lists without a format gets Google's default: no postal code", () => {
    const ag = addressFormat("AG");
    expect(ag.known).toBe(true);
    expect(ag.rows.flat()).toEqual([
      "firstName",
      "lastName",
      "company",
      "address1",
      "address2",
      "city",
    ]);
    expect(ag.postalCode).toBeUndefined();
  });

  it("a country missing from the data gets the generic form, not an error", () => {
    expect(hasAddressFormat("QQ")).toBe(false);
    const generic = addressFormat("QQ", "en");
    expect(generic.known).toBe(false);
    expect(generic.countryCode).toBe("qq");
    expect(generic.rows).toEqual([
      ["firstName", "lastName"],
      ["company"],
      ["address1"],
      ["address2"],
      ["city"],
      ["province", "postalCode"],
    ]);
    expect(generic.required).toEqual(["firstName", "lastName", "address1", "city"]);
    expect(generic.postalCode).toEqual({});
  });

  it("names every field once, in every country", () => {
    for (const country of google) {
      const fields = addressFormat(country.key, "en").rows.flat();
      expect(new Set(fields).size, country.key).toBe(fields.length);
      expect(fields, country.key).toContain("address1");
    }
  });
});

describe("addressLines", () => {
  const person = { firstName: "Jordan", lastName: "Ellis" };
  const texts = (lines: { text: string }[]) => lines.map((line) => line.text);

  it("the United States: the street lines, then `City, ST ZIP` on one line", () => {
    const lines = addressLines(
      {
        ...person,
        company: "Northside Design Co.",
        address1: "482 Maple Avenue",
        address2: "Suite 210",
        city: "Brooklyn",
        province: "NY",
        postalCode: "11215",
        countryCode: "us",
      },
      "en",
    );
    expect(texts(lines)).toEqual([
      "Jordan Ellis",
      "Northside Design Co.",
      "482 Maple Avenue",
      "Suite 210",
      "Brooklyn, NY 11215",
    ]);
    expect(lines.map((line) => line.kind)).toEqual([
      "name",
      "company",
      "street",
      "street",
      "locality",
    ]);
  });

  it("takes a field's separator with it when the field is missing", () => {
    const us = { ...person, address1: "1 Main St", city: "Brooklyn", countryCode: "us" };
    expect(texts(addressLines({ ...us, postalCode: "11215" })).at(-1)).toBe("Brooklyn 11215");
    expect(texts(addressLines({ ...us, province: "NY" })).at(-1)).toBe("Brooklyn, NY");
    expect(texts(addressLines(us)).at(-1)).toBe("Brooklyn");
    // The city first in its line: its separator after it goes.
    expect(
      texts(
        addressLines({
          ...person,
          address1: "1 Main St",
          province: "NY",
          postalCode: "1",
          countryCode: "us",
        }),
      ).at(-1),
    ).toBe("NY 1");
  });

  it("Cyprus and Germany: the postal code before the city, no company line when there is none", () => {
    expect(
      texts(
        addressLines({
          ...person,
          address1: "Arch. Makariou 45",
          city: "Nicosia",
          postalCode: "1065",
          countryCode: "cy",
        }),
      ),
    ).toEqual(["Jordan Ellis", "Arch. Makariou 45", "1065 Nicosia"]);
    expect(
      texts(
        addressLines(
          {
            ...person,
            address1: "Lindenstraße 27",
            city: "Berlin",
            postalCode: "10969",
            countryCode: "DE",
          },
          "de",
        ),
      ),
    ).toEqual(["Jordan Ellis", "Lindenstraße 27", "10969 Berlin"]);
  });

  it("Switzerland: the company before the name, and the CH- prefix inside the line", () => {
    const lines = addressLines(
      {
        ...person,
        company: "Atelier AG",
        address1: "Bahnhofstrasse 42",
        city: "Zürich",
        postalCode: "8001",
        countryCode: "ch",
      },
      "de",
    );
    expect(texts(lines)).toEqual([
      "Atelier AG",
      "Jordan Ellis",
      "Bahnhofstrasse 42",
      "CH-8001 Zürich",
    ]);
    expect(lines[0]?.kind).toBe("company");
    expect(lines[1]?.kind).toBe("name");
    // Without a postal code the prefix has nothing to prefix.
    expect(
      texts(
        addressLines({
          ...person,
          address1: "Bahnhofstrasse 42",
          city: "Zürich",
          countryCode: "ch",
        }),
      ).at(-1),
    ).toBe("Zürich");
  });

  it("the United Kingdom: the post town and the postcode each on a line", () => {
    expect(
      texts(
        addressLines({
          ...person,
          address1: "221 Baker Street",
          city: "London",
          postalCode: "NW1 6XE",
          countryCode: "gb",
        }),
      ),
    ).toEqual(["Jordan Ellis", "221 Baker Street", "London", "NW1 6XE"]);
  });

  it("Japan: the Latin order on a page in English, Japan's own order on a page in Japanese", () => {
    const tokyo = {
      ...person,
      address1: "2-8-1 Nishi-Shinjuku",
      province: "Tokyo",
      postalCode: "163-8001",
      countryCode: "jp",
    };
    expect(texts(addressLines(tokyo, "en-US"))).toEqual([
      "Jordan Ellis",
      "2-8-1 Nishi-Shinjuku, Tokyo",
      "163-8001",
    ]);
    expect(texts(addressLines({ ...tokyo, address2: "Tower B" }, "en"))).toEqual([
      "Jordan Ellis",
      "2-8-1 Nishi-Shinjuku",
      "Tower B, Tokyo",
      "163-8001",
    ]);
    expect(texts(addressLines(tokyo, "ja"))).toEqual([
      "〒163-8001",
      "Tokyo",
      "2-8-1 Nishi-Shinjuku",
      "Jordan Ellis",
    ]);
  });

  it("leaves out a line that is only the country's name written into the format (Åland)", () => {
    const lines = addressLines({
      ...person,
      address1: "Torggatan 1",
      city: "Mariehamn",
      postalCode: "22100",
      countryCode: "ax",
    });
    expect(texts(lines)).toEqual(["Jordan Ellis", "Torggatan 1", "AX-22100 Mariehamn"]);
  });

  it("a country missing from the data gets the generic order, not an error", () => {
    expect(
      texts(
        addressLines({
          ...person,
          address1: "1 Road",
          city: "Town",
          province: "North",
          postalCode: "99",
          countryCode: "qq",
        }),
      ),
    ).toEqual(["Jordan Ellis", "1 Road", "Town", "North 99"]);
  });

  it("has no name line for a place that has no person (a pickup point)", () => {
    const lines = addressLines({
      address1: "118 Wythe Avenue",
      city: "Brooklyn",
      province: "NY",
      postalCode: "11249",
      countryCode: "us",
    });
    expect(lines.map((line) => line.kind)).toEqual(["street", "locality"]);
  });

  it("skips what is only blanks, and trims what is not", () => {
    expect(
      texts(
        addressLines({
          firstName: " Jordan ",
          lastName: " ",
          company: "  ",
          address1: " 1 Main St ",
          city: "Brooklyn",
          countryCode: "us",
        }),
      ),
    ).toEqual(["Jordan", "1 Main St", "Brooklyn"]);
  });

  it("prints every country's address with its street, and with no stray separator, double space or blank line", () => {
    const problems: string[] = [];
    for (const country of google) {
      const full = {
        firstName: "Ada",
        lastName: "Lovelace",
        company: "Analytical Engines",
        address1: "1 Main St",
        address2: "Flat 2",
        city: "Townsville",
        province: "Northshire",
        postalCode: "12345",
        countryCode: country.key,
      };
      const without = {
        ...full,
        province: undefined,
        postalCode: undefined,
        company: undefined,
        address2: undefined,
      };
      for (const [label, address] of [
        ["full", full],
        ["partial", without],
      ] as const) {
        const lines = addressLines(address, "en");
        const joined = lines.map((line) => line.text);
        if (!joined.some((text) => text.includes("1 Main St")))
          problems.push(`${country.key} ${label}: no street`);
        for (const text of joined) {
          if (/^[\s,\-–·]|[\s,\-–·]$/.test(text))
            problems.push(`${country.key} ${label}: "${text}" ends in a separator`);
          if (/ {2}|,,|undefined|%/.test(text)) problems.push(`${country.key} ${label}: "${text}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("leaves addressFormat's answers as they were (the format string is chosen in one place)", () => {
    expect(addressFormat("JP", "en").rows[0]).toEqual(["firstName", "lastName"]);
    expect(addressFormat("JP", "ja").rows[0]).toEqual(["postalCode"]);
    expect(addressFormat("QQ").known).toBe(false);
  });
});
