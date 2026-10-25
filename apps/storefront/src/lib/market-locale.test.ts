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
  // and a browser would write different times. D65 gives each country its own zone.
  it("sets a fixed time zone, UTC until D65 gives a market its own", () => {
    expect(DEFAULT_TIME_ZONE).toBe("UTC");
    for (const [map, key] of [
      [seeded, "el-cy"],
      [mongolia, "mn-mn"],
      [brazil, "pt-br"],
    ] as const) {
      expect(withLocale(findMarket(map, key)!).timeZone, key).toBe("UTC");
    }
  });
});
