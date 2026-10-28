import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { findMarket, listMarkets } from "./market";
import {
  brazil,
  cyprusGainsEnglish,
  greeceOnly,
  greeceTwoLanguages,
  mongolia,
  seeded,
  usOnly,
  withDomains,
} from "./test-maps";
import { buildPublicUrl, mailTarget, marketPrefix } from "./url";

/** The public URL of `path` in the market with this key. */
function url(map: MarketMap, key: string, path = "/"): string {
  const market = findMarket(map, key);
  if (market === undefined) throw new Error(`no market ${key}`);
  return buildPublicUrl(market, path, map);
}

describe("buildPublicUrl: SPEC §8.5 URL table, on the seeded map", () => {
  // SPEC writes each root as `/us/`; with `trailingSlash` off Next serves `/us`.
  it.each([
    ["el-cy", "/"],
    ["en-us", "/us"],
    ["en-gb", "/gb"],
    ["de-de", "/de"],
    ["fr-fr", "/fr"],
    ["de-ch", "/ch"],
    ["fr-ch", "/ch/fr"],
  ])("%s is %s", (key, expected) => {
    expect(url(seeded, key)).toBe(expected);
    expect(url(seeded, key, "")).toBe(expected);
  });

  it.each([
    ["el-cy", "/products/shirt", "/products/shirt"],
    ["en-us", "/products/shirt", "/us/products/shirt"],
    ["de-ch", "/store", "/ch/store"],
    ["fr-ch", "/store", "/ch/fr/store"],
    ["fr-ch", "/categories/a/b", "/ch/fr/categories/a/b"],
  ])("%s + %s is %s", (key, path, expected) => {
    expect(url(seeded, key, path)).toBe(expected);
  });

  it("keeps the query string, the hash and a trailing slash of the page", () => {
    expect(url(seeded, "en-us", "/store?page=2&sort=asc")).toBe("/us/store?page=2&sort=asc");
    expect(url(seeded, "el-cy", "/store?page=2")).toBe("/store?page=2");
    expect(url(seeded, "el-cy", "/?page=2")).toBe("/?page=2");
    expect(url(seeded, "en-us", "/?utm=a")).toBe("/us?utm=a");
    expect(url(seeded, "fr-ch", "/store#reviews")).toBe("/ch/fr/store#reviews");
    expect(url(seeded, "en-gb", "/store/")).toBe("/gb/store/");
  });

  it("takes a path without its leading slash, and cannot be turned into another origin", () => {
    expect(url(seeded, "en-us", "store")).toBe("/us/store");
    expect(url(seeded, "el-cy", "//evil.example")).toBe("/evil.example");
    expect(url(seeded, "en-us", "//evil.example/x")).toBe("/us/evil.example/x");
  });

  it("treats a backslash or leading whitespace like a slash: `/\\host` is no other origin either", () => {
    expect(url(seeded, "el-cy", "/\\evil.example")).toBe("/evil.example");
    expect(url(seeded, "el-cy", "\\\\evil.example")).toBe("/evil.example");
    expect(url(seeded, "el-cy", "/\t/evil.example")).toBe("/evil.example");
    expect(url(seeded, "el-cy", " \n//evil.example/x?y=1")).toBe("/evil.example/x?y=1");
    expect(url(seeded, "en-us", "/\\evil.example")).toBe("/us/evil.example");
    // Only the start decides the origin; a backslash further in is left as it is.
    expect(url(seeded, "el-cy", "/a\\b")).toBe("/a\\b");
  });
});

describe("buildPublicUrl: Cyprus gains English (SPEC §8.5: /cy/en/)", () => {
  it("keeps the country for the primary country's extra language", () => {
    expect(url(cyprusGainsEnglish, "el-cy")).toBe("/");
    expect(url(cyprusGainsEnglish, "en-cy")).toBe("/cy/en");
    expect(url(cyprusGainsEnglish, "en-cy", "/store")).toBe("/cy/en/store");
  });

  it("changes no existing URL (SPEC §8.5: adding a language never does)", () => {
    for (const market of listMarkets(seeded)) {
      expect(buildPublicUrl(market, "/store", cyprusGainsEnglish)).toBe(
        buildPublicUrl(market, "/store", seeded),
      );
    }
  });
});

describe("buildPublicUrl: a store with one country", () => {
  it("has no country segment, and /{lang}/ for extra languages", () => {
    expect(url(greeceTwoLanguages, "el-gr")).toBe("/");
    expect(url(greeceTwoLanguages, "el-gr", "/store")).toBe("/store");
    expect(url(greeceTwoLanguages, "en-gr")).toBe("/en");
    expect(url(greeceTwoLanguages, "en-gr", "/store?page=2")).toBe("/en/store?page=2");
  });

  it("is /{path} for one language", () => {
    expect(url(usOnly, "en-us", "/products/shirt")).toBe("/products/shirt");
  });
});

describe("buildPublicUrl: a per-country domain", () => {
  it("is absolute on the country's domain, with the country segment dropped", () => {
    expect(url(withDomains, "el-cy")).toBe("https://shop.com.cy/");
    expect(url(withDomains, "el-cy", "/store")).toBe("https://shop.com.cy/store");
    expect(url(withDomains, "de-ch")).toBe("https://shop.ch/");
    expect(url(withDomains, "fr-ch")).toBe("https://shop.ch/fr");
    expect(url(withDomains, "fr-ch", "/store?page=2")).toBe("https://shop.ch/fr/store?page=2");
  });

  it("leaves the countries without a domain as paths", () => {
    expect(url(withDomains, "en-us", "/store")).toBe("/us/store");
    expect(url(withDomains, "fr-fr")).toBe("/fr");
  });
});

describe("D17: any shop's markets, with no change to buildPublicUrl", () => {
  it.each([
    ["Brazil", brazil, "pt-br"],
    ["Mongolia", mongolia, "mn-mn"],
    ["US only", usOnly, "en-us"],
    ["Greece only", greeceOnly, "el-gr"],
  ])("%s has no country or language segment", (_name, map, key) => {
    expect(url(map, key)).toBe("/");
    expect(url(map, key, "/store")).toBe("/store");
    expect(url(map, key, "/products/shirt?variant=1")).toBe("/products/shirt?variant=1");
  });
});

describe("marketPrefix", () => {
  it("is empty for the home market and has at most a country and a language", () => {
    const prefixes = listMarkets(seeded).map((m) => marketPrefix(m, seeded));
    expect(prefixes).toEqual(["", "/us", "/gb", "/de", "/fr", "/ch", "/ch/fr"]);
  });
});

describe("mailTarget (T70)", () => {
  it("gives the backend each market's prefix and the language of its e-mails' copy", () => {
    expect(listMarkets(seeded).map((m) => mailTarget(m, seeded))).toEqual([
      { market: "", language: "el" },
      { market: "/us", language: "en" },
      { market: "/gb", language: "en" },
      { market: "/de", language: "de" },
      { market: "/fr", language: "fr" },
      { market: "/ch", language: "de" },
      { market: "/ch/fr", language: "fr" },
    ]);
  });
});
