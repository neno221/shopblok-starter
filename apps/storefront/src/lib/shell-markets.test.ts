import { describe, expect, it } from "vitest";
import type { MarketMap } from "@shopblok/fixtures";
import { findShellMarket, listShellMarkets } from "./shell-markets";

const map: MarketMap = {
  countries: [
    { code: "cy", enabled: true, languages: ["el"] },
    { code: "ch", enabled: true, languages: ["de", "fr"] },
    { code: "br", enabled: true, languages: ["pt"] },
    { code: "de", enabled: false, languages: ["de"] },
  ],
  languages: [
    { code: "el", medusaLocale: "el-GR" },
    { code: "de", medusaLocale: "de-DE" },
    { code: "fr", medusaLocale: "fr-FR" },
    { code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" },
  ],
  primaryCountry: "cy",
  fallbackMarket: "el-cy",
};

describe("listShellMarkets", () => {
  it("lists one market per language of each enabled country, keyed {language}-{country}", () => {
    expect(listShellMarkets(map).map((market) => market.key)).toEqual([
      "el-cy",
      "de-ch",
      "fr-ch",
      "pt-br",
    ]);
  });

  it("skips disabled countries", () => {
    expect(listShellMarkets(map).some((market) => market.country === "de")).toBe(false);
  });

  it("builds <html lang> from language and country, and lets a language override it", () => {
    const lang = Object.fromEntries(listShellMarkets(map).map((m) => [m.key, m.htmlLang]));
    expect(lang).toEqual({
      "el-cy": "el-CY",
      "de-ch": "de-CH",
      "fr-ch": "fr-CH",
      "pt-br": "pt-BR",
    });
  });

  it("uses English copy for a language the i18n package has no catalog for", () => {
    expect(findShellMarket("pt-br", map)?.locale).toBe("en");
    expect(findShellMarket("fr-ch", map)?.locale).toBe("fr");
  });

  it("lists the seven seeded markets by default", () => {
    expect(listShellMarkets().map((market) => market.key)).toEqual([
      "el-cy",
      "en-us",
      "en-gb",
      "de-de",
      "fr-fr",
      "de-ch",
      "fr-ch",
    ]);
  });
});

describe("findShellMarket", () => {
  it("finds a market by key, and nothing for an unknown or internal-looking key", () => {
    expect(findShellMarket("el-cy", map)?.htmlLang).toBe("el-CY");
    expect(findShellMarket("cy", map)).toBeUndefined();
    expect(findShellMarket("de-de", map)).toBeUndefined();
    expect(findShellMarket("EL-CY", map)).toBeUndefined();
  });
});
