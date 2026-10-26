import { describe, expect, it } from "vitest";
import { findMarket } from "./market";
import { pathInMarket, preferredLanguages, suggestMarket } from "./suggest";
import { seeded } from "./test-maps";

const cy = findMarket(seeded, "el-cy")!;
const currencyOf = (country: string) => ({ cy: "EUR", us: "USD", ch: "CHF", de: "EUR" })[country];

describe("preferredLanguages", () => {
  it("orders by quality, then by position, and keeps one entry per language", () => {
    expect(preferredLanguages("de-CH, fr;q=0.8, en-US;q=0.9, de;q=0.7, *;q=0.1")).toEqual([
      "de",
      "en",
      "fr",
    ]);
  });

  it("ignores junk and q=0", () => {
    expect(preferredLanguages("12, x-y, fr;q=0, el")).toEqual(["el"]);
    expect(preferredLanguages(undefined)).toEqual([]);
  });
});

describe("pathInMarket", () => {
  it("finds the page's path inside its market", () => {
    expect(pathInMarket("/us/products/tee", "example.com", seeded)).toBe("/products/tee");
    expect(pathInMarket("/products/tee", "example.com", seeded)).toBe("/products/tee");
    expect(pathInMarket("/us", "example.com", seeded)).toBe("/");
  });

  it("never takes a path that could leave the origin", () => {
    expect(pathInMarket("//evil.example/x", "example.com", seeded)).toBe("/");
    expect(pathInMarket("https://evil.example/", "example.com", seeded)).toBe("/");
  });
});

describe("suggestMarket", () => {
  const base = { map: seeded, current: cy, path: "/", currencyOf };

  it("offers a US visitor on / the US store (SPEC §8.5's example)", () => {
    expect(suggestMarket({ ...base, country: "US", acceptLanguage: "en-US" })).toMatchObject({
      market: "en-us",
      suggested: { href: "/us", currencyCode: "USD", htmlLang: "en-US" },
    });
  });

  it("falls back to the country's default language", () => {
    expect(suggestMarket({ ...base, country: "ch", acceptLanguage: "en" })?.market).toBe("de-ch");
  });

  it("offers nothing without a country, for a country the shop does not sell in, or without a region", () => {
    expect(suggestMarket({ ...base, country: null, acceptLanguage: "en" })).toBeNull();
    expect(suggestMarket({ ...base, country: "jp", acceptLanguage: "ja" })).toBeNull();
    expect(
      suggestMarket({ ...base, country: "gb", acceptLanguage: "en", currencyOf: () => undefined }),
    ).toBeNull();
  });

  it("offers nothing in the visitor's own country (MarketSuggestion needs another one)", () => {
    expect(suggestMarket({ ...base, country: "CY", acceptLanguage: "en" })).toBeNull();
  });
});
