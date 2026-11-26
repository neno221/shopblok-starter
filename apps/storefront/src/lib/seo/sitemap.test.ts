import { describe, expect, it } from "vitest";
import { listMarkets } from "../markets/market";
import { germanyClosed, seeded, usOnly, withDomains } from "../markets/test-maps";
import type { Market, MarketMap } from "../markets/types";
import {
  addressCount,
  newest,
  parseSitemapId,
  SITEMAP_LIMIT,
  sitemapEntries,
  sitemapId,
  sitemapIdsByMarket,
  sitemapParts,
  type SitemapAddress,
} from "./sitemap";

// M7 D147 (T110): the sitemaps' builder. `seo.spec.ts` checks what `next start` serves against the
// Store API; these check the ids, the split past 50,000 addresses and the alternates.

const base = new URL("https://shop.example");
const marketOf = (map: MarketMap, key: string): Market => {
  const market = listMarkets(map).find((each) => each.key === key);
  if (market === undefined) throw new Error(`no market ${key}`);
  return market;
};

/** A generated catalog: `count` products, each changed on a day of 2026. */
const generatedCatalog = (count: number): SitemapAddress[] =>
  Array.from({ length: count }, (_, index) => ({
    path: `/products/product-${String(index).padStart(6, "0")}`,
    lastModified: new Date(Date.UTC(2026, 0, 1 + (index % 300))).toISOString(),
  }));

describe("sitemap ids", () => {
  it("are the market's key, then `{key}_2`…", () => {
    expect(sitemapId("en-us", 1)).toBe("en-us");
    expect(sitemapId("en-us", 3)).toBe("en-us_3");
    expect(parseSitemapId("en-us")).toEqual({ key: "en-us", part: 1 });
    expect(parseSitemapId("en-us_3")).toEqual({ key: "en-us", part: 3 });
  });

  it("refuse a malformed id, and `_1`, the first part under a second name", () => {
    for (const id of ["en-us_1", "en-us_0", "en-us_", "_2", "", "en-us_2_2", "en-us_02"])
      expect(parseSitemapId(id)).toBeUndefined();
  });

  it("give each open market one sitemap per 50,000 addresses, at least one", () => {
    expect(sitemapParts(0)).toBe(1);
    expect(sitemapParts(SITEMAP_LIMIT)).toBe(1);
    expect(sitemapParts(SITEMAP_LIMIT + 1)).toBe(2);
    const ids = sitemapIdsByMarket({ "en-us": SITEMAP_LIMIT * 2 + 1 }, germanyClosed);
    expect(ids["en-us"]).toEqual(["en-us", "en-us_2", "en-us_3"]);
    expect(ids["el-cy"]).toEqual(["el-cy"]);
    // A closed market has no sitemap.
    expect(Object.keys(ids)).not.toContain("de-de");
  });
});

describe("sitemapEntries", () => {
  it("lists each address at the market's public URL, with its date and every market's address", () => {
    const us = marketOf(seeded, "en-us");
    const [entry] = sitemapEntries(
      us,
      seeded,
      [{ path: "/products/linen-shirt", lastModified: "2026-11-01T10:00:00.000Z" }],
      base,
    );
    expect(entry?.url).toBe("https://shop.example/us/products/linen-shirt");
    expect(entry?.lastModified).toBe("2026-11-01T10:00:00.000Z");
    expect(entry?.alternates?.languages).toEqual({
      "el-CY": "https://shop.example/products/linen-shirt",
      "en-US": "https://shop.example/us/products/linen-shirt",
      "en-GB": "https://shop.example/gb/products/linen-shirt",
      "de-DE": "https://shop.example/de/products/linen-shirt",
      "fr-FR": "https://shop.example/fr/products/linen-shirt",
      "de-CH": "https://shop.example/ch/products/linen-shirt",
      "fr-CH": "https://shop.example/ch/fr/products/linen-shirt",
      "x-default": expect.stringMatching(/^https:\/\/shop\.example\//),
    });
  });

  it("puts a market on its own domain at its domain, in its own sitemap and the others' alternates", () => {
    const ch = marketOf(withDomains, "de-ch");
    const [entry] = sitemapEntries(ch, withDomains, [{ path: "/store" }], base);
    expect(entry?.url).toBe("https://shop.ch/store");
    expect(entry?.lastModified).toBeUndefined();
    expect(entry?.alternates?.languages?.["fr-CH" as never]).toBe("https://shop.ch/fr/store");
    expect(entry?.alternates?.languages?.["en-US" as never]).toBe("https://shop.example/us/store");
  });

  it("never names a closed market", () => {
    const entries = sitemapEntries(
      marketOf(germanyClosed, "en-us"),
      germanyClosed,
      generatedCatalog(20),
      base,
    );
    const urls = entries.flatMap((entry) => [
      entry.url,
      ...Object.values(entry.alternates?.languages ?? {}),
    ]);
    expect(urls.some((url) => String(url).startsWith("https://shop.example/de/"))).toBe(false);
    expect(entries.every((entry) => !("de-DE" in (entry.alternates?.languages ?? {})))).toBe(true);
  });

  it("names no alternates with a single market (SPEC §12)", () => {
    const [entry] = sitemapEntries(marketOf(usOnly, "en-us"), usOnly, [{ path: "/store" }], base);
    expect(entry).toEqual({ url: "https://shop.example/store" });
  });

  it("gives a page whose address is in the language its own address, and leaves it out where it has none", () => {
    // A CMS page in English and Greek only (D80): `/about` and `/σχετικά`.
    const about: SitemapAddress = {
      path: (market) =>
        market.language === "en" ? "/about" : market.language === "el" ? "/σχετικά" : null,
    };
    const [entry] = sitemapEntries(marketOf(seeded, "en-gb"), seeded, [about], base);
    expect(entry?.url).toBe("https://shop.example/gb/about");
    expect(Object.keys(entry?.alternates?.languages ?? {})).toEqual(
      expect.arrayContaining(["el-CY", "en-US", "en-GB"]),
    );
    expect(entry?.alternates?.languages?.["de-DE" as never]).toBeUndefined();
    expect(sitemapEntries(marketOf(seeded, "de-de"), seeded, [about], base)).toEqual([]);
    expect(addressCount(marketOf(seeded, "de-de"), [about])).toBe(0);
    expect(addressCount(marketOf(seeded, "el-cy"), [about])).toBe(1);
  });

  it("splits a generated catalog past 50,000 addresses, every address in exactly one part", () => {
    const catalog = generatedCatalog(SITEMAP_LIMIT + 1_234);
    const us = marketOf(seeded, "en-us");
    const count = addressCount(us, catalog);
    const ids = sitemapIdsByMarket({ [us.key]: count }, seeded)[us.key];
    expect(ids).toEqual(["en-us", "en-us_2"]);
    const parts = (ids ?? []).map((id) => {
      const parsed = parseSitemapId(id);
      return sitemapEntries(us, seeded, catalog, base, { part: parsed?.part ?? 1 });
    });
    expect(parts.map((part) => part.length)).toEqual([SITEMAP_LIMIT, 1_234]);
    const urls = parts.flat().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(catalog.length);
    expect(urls[0]).toBe("https://shop.example/us/products/product-000000");
    expect(urls.at(-1)).toBe(
      `https://shop.example/us/products/product-${String(catalog.length - 1).padStart(6, "0")}`,
    );
    // A part past the last is empty.
    expect(sitemapEntries(us, seeded, catalog, base, { part: 3 })).toEqual([]);
  });
});

describe("newest", () => {
  it("is the latest date, skipping missing and malformed ones", () => {
    expect(
      newest([undefined, "2026-01-02T00:00:00Z", "nope", "2026-03-01T00:00:00Z", "2025-12-31"]),
    ).toBe("2026-03-01T00:00:00Z");
    expect(newest([undefined])).toBeUndefined();
  });
});
