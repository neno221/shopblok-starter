import fixture from "@shopblok/fixtures/sync/documents.json";
import { describe, expect, it } from "vitest";
import { isSyncedEmpty, syncedFromGlobal, syncedMarketProblems } from "./synced";

const synced = syncedFromGlobal(fixture.markets);

describe("syncedFromGlobal", () => {
  it("reads the fixture's synced part as it is", () => {
    expect(synced).toEqual(fixture.markets);
  });

  it("makes an empty global an empty synced part", () => {
    for (const value of [undefined, null, {}]) {
      const empty = syncedFromGlobal(value);
      expect(empty).toEqual({ regions: [], currencies: [], defaultCurrency: null, locales: [] });
      expect(isSyncedEmpty(empty)).toBe(true);
    }
    expect(isSyncedEmpty(synced)).toBe(false);
  });
});

describe("syncedMarketProblems (D76)", () => {
  it("passes a map whose countries and locales Medusa has", () => {
    expect(
      syncedMarketProblems(
        {
          countries: [
            { code: "cy", languages: ["el"] },
            { code: "us", languages: ["en"] },
          ],
          languages: [
            { code: "el", medusaLocale: "el-GR" },
            { code: "en", medusaLocale: "en-US" },
          ],
        },
        synced,
      ),
    ).toEqual([]);
  });

  it("refuses an enabled country in no region, and says where to add it", () => {
    expect(
      syncedMarketProblems({ countries: [{ code: "at", languages: ["de"] }] }, synced),
    ).toEqual([
      {
        path: "countries.0.code",
        message:
          '"at" is in no Medusa region. Add it to a region in Medusa Admin (Settings → Regions) first, or switch it off.',
      },
    ]);
  });

  it("lets a switched-off country be in no region", () => {
    expect(
      syncedMarketProblems(
        { countries: [{ code: "at", enabled: false, languages: ["de"] }] },
        synced,
      ),
    ).toEqual([]);
  });

  it("refuses a country in two regions", () => {
    const twice = {
      ...synced,
      regions: [
        ...synced.regions,
        { medusaId: "reg_x", name: "Cyprus", currency: "eur", countries: ["cy"] },
      ],
    };
    expect(syncedMarketProblems({ countries: [{ code: "cy" }] }, twice)).toEqual([
      {
        path: "countries.0.code",
        message: '"cy" is in 2 Medusa regions (Europe, Cyprus). Keep it in one.',
      },
    ]);
  });

  it("refuses a language whose Medusa locale the store does not have", () => {
    expect(
      syncedMarketProblems(
        {
          languages: [
            { code: "en", medusaLocale: "en-US" },
            { code: "fr", medusaLocale: "fr-FR" },
          ],
        },
        synced,
      ),
    ).toEqual([
      {
        path: "languages.1.medusaLocale",
        message:
          '"fr-FR" is not one of the store\'s locales (de-DE, el-GR, en-US). Add it in Medusa Admin (Settings → Store) first.',
      },
    ]);
  });
});
