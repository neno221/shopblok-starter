import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import {
  fallbackMarketOf,
  findMarket,
  listMarkets,
  normalizeHost,
  primaryCountryCode,
  primaryMarket,
  toInternalKey,
} from "./market";
import { brazil, germanyClosed, seeded, withDomains } from "./test-maps";

describe("toInternalKey", () => {
  it("is {language}-{country}, the [market] segment (SPEC §8.1)", () => {
    expect(toInternalKey("cy", "el")).toBe("el-cy");
    expect(toInternalKey("ch", "fr")).toBe("fr-ch");
    expect(toInternalKey("br", "pt")).toBe("pt-br");
  });
});

describe("normalizeHost", () => {
  it("keeps only the lowercase host", () => {
    expect(normalizeHost("Shop.com.CY")).toBe("shop.com.cy");
    expect(normalizeHost("shop.com.cy:8443")).toBe("shop.com.cy");
    expect(normalizeHost("https://Shop.com.cy/path?x=1")).toBe("shop.com.cy");
    expect(normalizeHost(" shop.com.cy. ")).toBe("shop.com.cy");
  });

  it("says undefined for nothing", () => {
    for (const value of [undefined, null, "", "  "]) expect(normalizeHost(value)).toBeUndefined();
  });
});

describe("listMarkets", () => {
  it("lists the seven seeded markets in the map's order, with SPEC §12's lang values", () => {
    expect(listMarkets(seeded).map((m) => [m.key, m.htmlLang, m.medusaLocale])).toEqual([
      ["el-cy", "el-CY", "el-GR"],
      ["en-us", "en-US", "en-US"],
      ["en-gb", "en-GB", "en-US"],
      ["de-de", "de-DE", "de-DE"],
      ["fr-fr", "fr-FR", "fr-FR"],
      ["de-ch", "de-CH", "de-DE"],
      ["fr-ch", "fr-CH", "fr-FR"],
    ]);
  });

  it("marks each country's first language as its default", () => {
    const swiss = listMarkets(seeded).filter((m) => m.country === "ch");
    expect(swiss.map((m) => [m.language, m.isDefaultLanguage])).toEqual([
      ["de", true],
      ["fr", false],
    ]);
  });

  it("leaves out a country that is closed", () => {
    expect(listMarkets(germanyClosed).map((m) => m.key)).not.toContain("de-de");
    expect(listMarkets(germanyClosed)).toHaveLength(6);
  });

  it("takes <html lang> from the language's override (D17: Brazil is pt-BR)", () => {
    const map: MarketMap = {
      ...brazil,
      languages: [{ code: "pt", medusaLocale: "pt-PT", htmlLang: "pt-PT" }],
    };
    expect(listMarkets(map)[0]).toMatchObject({ key: "pt-br", htmlLang: "pt-PT" });
    // No override: language and country make it, so Brazil in Portuguese is pt-BR with no help.
    expect(listMarkets(brazil)[0]).toMatchObject({ key: "pt-br", htmlLang: "pt-BR" });
  });

  it("carries a country's domain as a bare lowercase host", () => {
    const map: MarketMap = {
      ...seeded,
      countries: seeded.countries.map((c) =>
        c.code === "cy" ? { ...c, domain: "https://Shop.com.cy/" } : c,
      ),
    };
    expect(listMarkets(map)[0]?.domain).toBe("shop.com.cy");
    expect(listMarkets(seeded)[0]).not.toHaveProperty("domain");
    expect(listMarkets(withDomains).filter((m) => m.domain === "shop.ch")).toHaveLength(2);
  });
});

describe("findMarket, primaryMarket, fallbackMarketOf", () => {
  it("finds a market by its key", () => {
    expect(findMarket(seeded, "fr-ch")?.country).toBe("ch");
    expect(findMarket(seeded, "fr-cy")).toBeUndefined();
    expect(findMarket(germanyClosed, "de-de")).toBeUndefined();
  });

  it("serves the primary country in its default language at /", () => {
    expect(primaryMarket(seeded)?.key).toBe("el-cy");
    expect(primaryMarket(brazil)?.key).toBe("pt-br");
  });

  it("falls back to the first open country when the primary is not open", () => {
    const map: MarketMap = { ...seeded, primaryCountry: "xx" };
    expect(primaryCountryCode(map)).toBe("cy");
    const closed: MarketMap = { ...germanyClosed, primaryCountry: "de" };
    expect(primaryMarket(closed)?.key).toBe("el-cy");
  });

  it("points x-default at the fallback market, or at the primary when that is stale", () => {
    expect(fallbackMarketOf(seeded)?.key).toBe("en-us");
    expect(fallbackMarketOf({ ...seeded, fallbackMarket: "en-xx" })?.key).toBe("el-cy");
  });
});
