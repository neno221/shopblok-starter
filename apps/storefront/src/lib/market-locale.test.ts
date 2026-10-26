import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, withLocale } from "./market-locale";
import { findMarket } from "./markets/market";
import { brazil, mongolia, seeded } from "./markets/test-maps";

describe("withLocale", () => {
  it("uses the market's language when the i18n package has a catalog for it", () => {
    expect(withLocale(findMarket(seeded, "fr-ch")!).locale).toBe("fr");
    expect(withLocale(findMarket(seeded, "el-cy")!).locale).toBe("el");
  });

  it("uses English copy for a language it has no catalog for (D17: Brazil, Mongolia)", () => {
    expect(withLocale(findMarket(brazil, "pt-br")!).locale).toBe("en");
    expect(withLocale(findMarket(mongolia, "mn-mn")!).locale).toBe("en");
  });

  it("keeps the market's own fields, including the lang value", () => {
    expect(withLocale(findMarket(brazil, "pt-br")!)).toMatchObject({
      key: "pt-br",
      htmlLang: "pt-BR",
      medusaLocale: "pt-BR",
    });
  });

  // next-intl falls back to the zone of the machine that renders when none is set, so a prerender
  // and a browser would write different times.
  it("sets a fixed time zone, UTC for a country that has none (D65)", () => {
    expect(DEFAULT_TIME_ZONE).toBe("UTC");
    for (const [map, key] of [
      [mongolia, "mn-mn"],
      [brazil, "pt-br"],
    ] as const) {
      expect(withLocale(findMarket(map, key)!).timeZone, key).toBe("UTC");
    }
  });

  it("uses the country's own zone from the map, in each of its languages (D65)", () => {
    const zones = {
      "el-cy": "Europe/Nicosia",
      "en-us": "America/New_York",
      "en-gb": "Europe/London",
      "de-de": "Europe/Berlin",
      "fr-fr": "Europe/Paris",
      "de-ch": "Europe/Zurich",
      "fr-ch": "Europe/Zurich",
    };
    for (const [key, zone] of Object.entries(zones)) {
      expect(withLocale(findMarket(seeded, key)!).timeZone, key).toBe(zone);
    }
  });

  it("uses UTC for a country whose zone was emptied", () => {
    const map = { ...seeded, countries: seeded.countries.map(({ timeZone: _, ...c }) => c) };
    expect(withLocale(findMarket(map, "el-cy")!).timeZone).toBe("UTC");
  });
});
