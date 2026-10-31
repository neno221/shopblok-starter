import { markets } from "@shopblok/fixtures/markets";

import { buildMarketMap } from "../map";
import { seededState } from "./state.fixtures";

const inputOf = (state = seededState()) => ({
  countries: state.countries,
  languages: state.languages,
  settings: state.settings,
  regionCountryCodes: state.regionCountries.map((country) => country.code),
});

describe("buildMarketMap", () => {
  it("rebuilds the fixtures' map exactly from the seeded rows, order included", () => {
    const map = buildMarketMap({
      ...inputOf(),
      // The seeded shop has no Austria row; leave it out of the regions here.
      regionCountryCodes: ["cy", "de", "fr", "us", "gb", "ch"],
    });
    expect(map).toEqual(markets);
    expect(map.countries.map((country) => country.code)).toEqual([
      "cy",
      "us",
      "gb",
      "de",
      "fr",
      "ch",
    ]);
  });

  it("lists a country with no row as closed, and a row with no region not at all", () => {
    const state = seededState({
      countries: [
        ...seededState().countries,
        { code: "br", enabled: true, languages: ["en"], domain: null, time_zone: null, rank: null },
      ],
    });
    const map = buildMarketMap(inputOf(state));
    const at = map.countries.find((country) => country.code === "at");
    expect(at).toEqual({ code: "at", enabled: false, languages: [] });
    expect(map.countries.some((country) => country.code === "br")).toBe(false);
    // Ranked countries first, then the others by code.
    expect(map.countries.map((country) => country.code)).toEqual([
      "cy",
      "us",
      "gb",
      "de",
      "fr",
      "ch",
      "at",
    ]);
  });

  it("leaves out the optional fields when they are null, and keeps them when set", () => {
    const state = seededState({
      countries: seededState().countries.map((row) =>
        row.code === "cy" ? { ...row, domain: "shop.example.cy", time_zone: null } : row,
      ),
      languages: seededState().languages.map((row) =>
        row.code === "el" ? { ...row, html_lang: "el-CY" } : row,
      ),
    });
    const map = buildMarketMap(inputOf(state));
    expect(map.countries[0]).toEqual({
      code: "cy",
      enabled: true,
      languages: ["el"],
      domain: "shop.example.cy",
    });
    expect(map.languages.find((language) => language.code === "el")).toEqual({
      code: "el",
      medusaLocale: "el-GR",
      htmlLang: "el-CY",
    });
    expect(map.countries[1]).not.toHaveProperty("domain");
  });

  it("lists only the languages some listed country uses", () => {
    const state = seededState({
      languages: [
        ...seededState().languages,
        { code: "it", medusa_locale: "it-IT", html_lang: null, rank: null },
      ],
    });
    expect(buildMarketMap(inputOf(state)).languages.map((language) => language.code)).toEqual([
      "en",
      "el",
      "de",
      "fr",
    ]);
  });

  it("gives empty strings for an unset primary country and fallback market", () => {
    const map = buildMarketMap(
      inputOf(seededState({ settings: { primary_country: null, fallback_market: null } })),
    );
    expect(map.primaryCountry).toBe("");
    expect(map.fallbackMarket).toBe("");
  });
});
