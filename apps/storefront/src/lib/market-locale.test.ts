import { describe, expect, it } from "vitest";
import { withLocale } from "./market-locale";
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
});
