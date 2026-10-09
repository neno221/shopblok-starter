// Market maps for the tests (T10). Not a test file; `resolve`, `url`, `hreflang` and `source`
// tests all use them. `seeded` is the SPEC §8.5 table; the others are the shops of D17 and the
// variations of SPEC §8.5 that the seeded map doesn't have.
import { markets as seeded, type MarketCountry, type MarketMap } from "@shopblok/fixtures";

export { seeded };

/** A shop with one country, in one or more languages (the first one is the default). */
export function singleCountry(
  country: string,
  languages: [code: string, medusaLocale: string][],
): MarketMap {
  const first = languages[0]?.[0] ?? "";
  return {
    countries: [{ code: country, enabled: true, languages: languages.map(([code]) => code) }],
    languages: languages.map(([code, medusaLocale]) => ({ code, medusaLocale })),
    primaryCountry: country,
    fallbackMarket: `${first}-${country}`,
  };
}

/** D17's four shops: each one country, one language, and none of them is in the seeded map. */
export const brazil = singleCountry("br", [["pt", "pt-BR"]]);
export const mongolia = singleCountry("mn", [["mn", "mn-MN"]]);
export const usOnly = singleCountry("us", [["en", "en-US"]]);
export const greeceOnly = singleCountry("gr", [["el", "el-GR"]]);

/** A shop with one country and an extra language: `/` in Greek, `/en/…` in English. */
export const greeceTwoLanguages = singleCountry("gr", [
  ["el", "el-GR"],
  ["en", "en-US"],
]);

function withCountry(map: MarketMap, code: string, change: Partial<MarketCountry>): MarketMap {
  return {
    ...map,
    countries: map.countries.map((country) =>
      country.code === code ? { ...country, ...change } : country,
    ),
  };
}

/** SPEC §8.5: "`/cy/en/` if Cyprus gets English". */
export const cyprusGainsEnglish = withCountry(seeded, "cy", { languages: ["el", "en"] });

/** Cyprus and Switzerland on domains of their own. */
export const withDomains = withCountry(withCountry(seeded, "cy", { domain: "shop.com.cy" }), "ch", {
  domain: "shop.ch",
});

/** The seeded map with Germany closed. */
export const germanyClosed = withCountry(seeded, "de", { enabled: false });

/**
 * Brazil and Portugal, both in Portuguese: the one `pt-BR` override of the `pt` language gives two
 * markets the same lang value. Not in `allMaps`, whose checks expect one value per market.
 */
export const brazilAndPortugal: MarketMap = {
  countries: [
    { code: "br", enabled: true, languages: ["pt"] },
    { code: "pt", enabled: true, languages: ["pt"] },
  ],
  languages: [{ code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" }],
  primaryCountry: "br",
  fallbackMarket: "pt-br",
};

/** Every map above, for the checks that must hold on all of them. */
export const allMaps: [name: string, map: MarketMap][] = [
  ["seeded", seeded],
  ["Brazil", brazil],
  ["Mongolia", mongolia],
  ["US only", usOnly],
  ["Greece only", greeceOnly],
  ["Greece, two languages", greeceTwoLanguages],
  ["Cyprus gains English", cyprusGainsEnglish],
  ["domains", withDomains],
  ["Germany closed", germanyClosed],
];
