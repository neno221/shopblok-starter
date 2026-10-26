import { describe, expect, it } from "vitest";
import { germanyClosed, seeded, withDomains } from "../markets/test-maps";
import { toMarketChoice } from "./market-choice";

const EUR = new Set(["cy", "de", "fr"]);
const currencyOf = (country: string) =>
  EUR.has(country)
    ? "eur"
    : ({ us: "usd", gb: "gbp", ch: "chf" } as Record<string, string>)[country];

describe("toMarketChoice (D66)", () => {
  it("lists a country per row, its languages in the map's order, each a link to its market's home", () => {
    const choice = toMarketChoice(seeded, { key: "fr-ch" }, currencyOf);
    expect(choice?.markets.map((option) => option.country)).toEqual([
      "cy",
      "us",
      "gb",
      "de",
      "fr",
      "ch",
    ]);
    const swiss = choice?.markets.find((option) => option.country === "ch");
    expect(swiss).toEqual({
      country: "ch",
      flagCode: "CH",
      currencyCode: "CHF",
      languages: [
        { language: "de", htmlLang: "de-CH", href: "/ch", current: false },
        { language: "fr", htmlLang: "fr-CH", href: "/ch/fr", current: true },
      ],
    });
    expect(choice?.markets[0]?.languages[0]?.href).toBe("/");
  });

  it("marks only the current market", () => {
    const choice = toMarketChoice(seeded, { key: "en-us" }, currencyOf);
    const current = choice?.markets.flatMap((option) =>
      option.languages.filter((language) => language.current).map(() => option.country),
    );
    expect(current).toEqual(["us"]);
  });

  it("leaves out a country with no region, and a closed one", () => {
    const noUs = (country: string) => (country === "us" ? undefined : currencyOf(country));
    expect(
      toMarketChoice(seeded, { key: "el-cy" }, noUs)?.markets.map((option) => option.country),
    ).not.toContain("us");
    expect(
      toMarketChoice(germanyClosed, { key: "el-cy" }, currencyOf)?.markets.map(
        (option) => option.country,
      ),
    ).not.toContain("de");
  });

  it("has no switcher when the current market's country has no region", () => {
    const noCyprus = (country: string) => (country === "cy" ? undefined : currencyOf(country));
    expect(toMarketChoice(seeded, { key: "el-cy" }, noCyprus)).toBeUndefined();
  });

  it("links a market on its own domain by its full URL", () => {
    const choice = toMarketChoice(withDomains, { key: "el-cy" }, currencyOf);
    const hrefs = choice?.markets.flatMap((option) =>
      option.languages.map((language) => language.href),
    );
    expect(hrefs).toContain("https://shop.ch/");
    expect(hrefs).toContain("https://shop.com.cy/");
  });
});
