import { markets } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { mapFromGlobal, marketMapProblems } from "../lib/markets/global";
import { marketsGlobalData } from "./markets-data";

describe("marketsGlobalData", () => {
  it("turns the fixtures into a global that reads back as the same map", () => {
    expect(mapFromGlobal(marketsGlobalData(markets))).toEqual(markets);
  });

  it("gives a map the library accepts: no problems", () => {
    expect(marketMapProblems(mapFromGlobal(marketsGlobalData(markets)))).toEqual([]);
  });

  it("seeds the seven markets of SPEC §8.5 (six countries, Switzerland in two languages)", () => {
    const data = marketsGlobalData(markets);
    expect(data.countries?.map((c) => `${c.code}:${c.languages.join("+")}`)).toEqual([
      "cy:el",
      "us:en",
      "gb:en",
      "de:de",
      "fr:fr",
      "ch:de+fr",
    ]);
    expect(data.languages?.map((l) => `${l.code}=${l.medusaLocale}`)).toEqual([
      "en=en-US",
      "el=el-GR",
      "de=de-DE",
      "fr=fr-FR",
    ]);
    expect(data.primaryCountry).toBe("cy");
    expect(data.fallbackMarket).toBe("en-us");
  });

  it("leaves out a language no open country uses, and keeps one only a closed country uses out too", () => {
    const data = marketsGlobalData({
      countries: [
        { code: "br", enabled: true, languages: ["pt"] },
        { code: "cy", enabled: false, languages: ["el"] },
      ],
      languages: [
        { code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" },
        { code: "el", medusaLocale: "el-GR" },
        { code: "en", medusaLocale: "en-US" },
      ],
      primaryCountry: "br",
      fallbackMarket: "pt-br",
    });
    expect(data.languages).toEqual([{ code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" }]);
    expect(data.countries?.map((c) => [c.code, c.enabled])).toEqual([
      ["br", true],
      ["cy", false],
    ]);
  });

  it("keeps a country's own domain", () => {
    const data = marketsGlobalData({
      countries: [{ code: "ch", enabled: true, languages: ["de"], domain: "shop.ch" }],
      languages: [{ code: "de", medusaLocale: "de-DE" }],
      primaryCountry: "ch",
      fallbackMarket: "de-ch",
    });
    expect(data.countries?.[0]?.domain).toBe("shop.ch");
  });
});
