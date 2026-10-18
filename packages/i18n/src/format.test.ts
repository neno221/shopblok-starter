import { describe, expect, it } from "vitest";
import { catalogs } from "./index";
import {
  countryName,
  formatDate,
  formatList,
  formatMessage,
  formatMoney,
  formatNumber,
  formatNumberRange,
  languageName,
} from "./format";

// Intl's no-break spaces (U+00A0, U+202F) and the Swiss digit-group mark (’ U+2019 in de-CH and
// U+202F in fr-CH with CLDR 47 / Node 22.22.0, ASCII ' with CLDR 48 / Node 22.23, GitHub's runners)
// belong to the runtime, not to this package. A group mark between digits reads as ', a no-break
// space elsewhere as a plain one; a grouping that is lost, or written as a plain space, still fails.
const plain = (text: string) =>
  text.replace(/(?<=\d)[\u202f\u2019'](?=\d)/g, "'").replace(/[\u00a0\u202f]/g, " ");

describe("formatMoney", () => {
  it.each([
    ["el-CY", "EUR", "1.234,50 €"],
    ["en-US", "USD", "$1,234.50"],
    ["en-GB", "GBP", "£1,234.50"],
    ["de-CH", "CHF", "CHF 1'234.50"],
    ["fr-CH", "CHF", "1'234.50 CHF"],
    // Any currency Medusa sells in formats the same way: a shop that opens Brazil or Mongolia
    // needs no change here.
    ["pt-BR", "BRL", "R$ 1.234,50"],
    ["mn-MN", "MNT", "₮ 1,234.50"],
  ])("formats 1234.5 for %s in %s", (locale, currency, expected) => {
    expect(plain(formatMoney(1234.5, currency, locale))).toBe(expected);
  });

  it("takes the amount in major units, never divided by 100", () => {
    expect(formatMoney(12.5, "EUR", "en-US")).toBe("€12.50");
    expect(formatMoney(1250, "EUR", "en-US")).toBe("€1,250.00");
  });

  it("accepts Medusa's lowercase currency codes", () => {
    expect(formatMoney(10, "eur", "en-US")).toBe(formatMoney(10, "EUR", "en-US"));
  });
});

describe("formatDate", () => {
  const options = { dateStyle: "medium", timeZone: "UTC" } as const;
  const date = new Date(Date.UTC(2026, 9, 9, 12));

  it.each([
    ["en-US", "Oct 9, 2026"],
    ["en-GB", "9 Oct 2026"],
    ["de-CH", "09.10.2026"],
    ["el-CY", "9 Οκτ 2026"],
    ["fr-CH", "9 oct. 2026"],
  ])("formats a date for %s", (locale, expected) => {
    expect(plain(formatDate(date, locale, options))).toBe(expected);
  });

  it("takes an ISO string as well as a Date", () => {
    expect(formatDate("2026-10-09T12:00:00Z", "en-GB", options)).toBe("9 Oct 2026");
  });
});

describe("formatNumber", () => {
  it.each([
    ["en-US", "4.5"],
    ["de-DE", "4,5"],
    ["el-CY", "4,5"],
    ["fr-CH", "4,5"],
  ])("writes the decimal mark of %s", (locale, expected) => {
    expect(formatNumber(4.5, locale)).toBe(expected);
  });

  it("takes Intl.NumberFormat's options, and keeps a format per locale and options", () => {
    const options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    expect(formatNumber(4, "en-US", options)).toBe("4.0");
    expect(formatNumber(4, "en-US")).toBe("4");
    expect(plain(formatNumber(1234.5, "de-CH"))).toBe("1'234.5");
  });
});

describe("formatNumberRange (T38)", () => {
  it.each([
    ["en-US", 88, 92, "88–92"],
    ["de-DE", 34.6, 36.2, "34,6–36,2"],
    ["el-CY", 34.6, 36.2, "34,6–36,2"],
    ["fr-CH", 34.6, 36.2, "34,6–36,2"],
  ])(
    "writes a range for %s with the locale's dash and decimal mark",
    (locale, from, to, expected) => {
      expect(plain(formatNumberRange(from, to, locale)).replace(/\s/g, "")).toBe(expected);
    },
  );

  it("takes Intl.NumberFormat's options", () => {
    const options = { maximumFractionDigits: 1 };
    expect(formatNumberRange(34.64, 36.22, "en-US", options)).toBe("34.6–36.2");
  });
});

describe("formatList (T38)", () => {
  it.each([
    ["en-US", "Colour and Size"],
    ["el-CY", "Colour και Size"],
    ["de-DE", "Colour und Size"],
    ["fr-CH", "Colour et Size"],
  ])("joins two names with %s's word for and", (locale, expected) => {
    expect(formatList(["Colour", "Size"], locale)).toBe(expected);
  });

  it("joins three, one, with or, and with commas alone", () => {
    expect(formatList(["Colour", "Size", "Fit"], "en-US")).toBe("Colour, Size, and Fit");
    expect(formatList(["Size"], "en-US")).toBe("Size");
    expect(formatList(["S", "M"], "en-US", "disjunction")).toBe("S or M");
    expect(formatList(["Black", "M"], "en-US", "unit")).toBe("Black, M");
  });
});

describe("countryName", () => {
  it.each([
    ["cy", "el-CY", "Κύπρος"],
    ["de", "de-DE", "Deutschland"],
    ["ch", "fr-CH", "Suisse"],
    ["US", "en-US", "United States"],
  ])("names %s in %s", (code, locale, expected) => {
    expect(countryName(code, locale)).toBe(expected);
  });
});

describe("languageName", () => {
  it.each([
    ["el", "el", "Ελληνικά"],
    ["en", "en", "English"],
    ["de", "de-CH", "Deutsch"],
    // CLDR writes French language names in lower case; the market switcher capitalises its own.
    ["fr", "fr-CH", "français"],
  ])("names %s in its own language, %s", (language, locale, expected) => {
    expect(languageName(language, locale)).toBe(expected);
  });

  it("names a language in the page's language when asked to", () => {
    expect(languageName("en", "el-CY")).toBe("Αγγλικά");
    expect(languageName("fr", "de-DE")).toBe("Französisch");
  });

  it("gives back a code Intl does not know, and answers the same twice (cached)", () => {
    expect(languageName("zz", "en-US")).toBe("zz");
    expect(languageName("el", "el")).toBe(languageName("el", "el"));
  });
});

describe("formatMessage (D43)", () => {
  const low = (locale: keyof typeof catalogs) => catalogs[locale].atoms.stock.low;

  it.each([
    ["en", "en-US", "Only 1 left", "Only 3 left"],
    ["el", "el-CY", "Απομένει μόνο 1", "Απομένουν μόνο 3"],
    ["de", "de-DE", "Nur noch 1 verfügbar", "Nur noch 3 verfügbar"],
    ["fr", "fr-CH", "Plus que 1 en stock", "Plus que 3 en stock"],
  ] as const)("picks the plural of %s's catalog", (locale, tag, one, other) => {
    expect(formatMessage(low(locale), { count: 1 }, tag)).toBe(one);
    expect(formatMessage(low(locale), { count: 3 }, tag)).toBe(other);
  });

  it("follows each language's CLDR categories, not English's", () => {
    // French puts 0 and 1 in `one` (CLDR); English and German put only 1 there.
    const message = "{count, plural, one {one} other {other}}";
    expect(formatMessage(message, { count: 0 }, "fr-CH")).toBe("one");
    expect(formatMessage(message, { count: 0 }, "en-US")).toBe("other");
    expect(formatMessage(message, { count: 0 }, "de-DE")).toBe("other");
    expect(formatMessage(message, { count: 1 }, "el-CY")).toBe("one");
    expect(formatMessage(message, { count: 2 }, "el-CY")).toBe("other");
  });

  it("writes # in the market's number format (the test rule of SPEC §14)", () => {
    const message = "{count, plural, other {# items}}";
    expect(plain(formatMessage(message, { count: 1234 }, "en-US"))).toBe("1,234 items");
    expect(plain(formatMessage(message, { count: 1234 }, "de-DE"))).toBe("1.234 items");
    expect(plain(formatMessage(message, { count: 1234 }, "el-CY"))).toBe("1.234 items");
    expect(plain(formatMessage(message, { count: 1234 }, "fr-CH"))).toBe("1'234 items");
  });

  it("fills plain arguments, and throws for a missing one", () => {
    expect(formatMessage(catalogs.en.atoms.rating.label, { value: "4.5", max: "5" }, "en-US")).toBe(
      "4.5 out of 5",
    );
    expect(() => formatMessage("{value} out of {max}", { value: "4.5" }, "en-US")).toThrow();
  });
});
