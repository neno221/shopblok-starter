import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { listMarkets } from "./market";
import { resolve } from "./resolve";
import {
  allMaps,
  brazil,
  cyprusGainsEnglish,
  germanyClosed,
  greeceOnly,
  greeceTwoLanguages,
  mongolia,
  seeded,
  usOnly,
  withDomains,
} from "./test-maps";
import type { Resolution } from "./types";
import { buildPublicUrl } from "./url";

const HOST = "example.com";

/** `resolve` for a path with an optional query, as the proxy calls it. */
function at(map: MarketMap, target: string, host = HOST): Resolution {
  const { pathname, search } = new URL(target, "https://example.com");
  return resolve({ pathname, search }, host, map);
}

/** The short form of a rewrite, for the tables: the market key and the internal path. */
function served(map: MarketMap, target: string, host = HOST): [string, string] | Resolution {
  const result = at(map, target, host);
  return result.kind === "rewrite" ? [result.market.key, result.internalPath] : result;
}

const redirectTo = (location: string): Resolution => ({ kind: "redirect", status: 301, location });
const NOT_FOUND: Resolution = { kind: "notFound" };

describe("SPEC §8.5 URL table, on the seeded map", () => {
  it.each([
    ["/", "el-cy"],
    ["/us", "en-us"],
    ["/gb", "en-gb"],
    ["/de", "de-de"],
    ["/fr", "fr-fr"],
    ["/ch", "de-ch"],
    ["/ch/fr", "fr-ch"],
  ])("%s is the home of %s", (target, key) => {
    expect(served(seeded, target)).toEqual([key, ""]);
    // Next removes a trailing slash before the proxy; either way it is the same page.
    if (target !== "/") expect(served(seeded, `${target}/`)).toEqual([key, ""]);
  });

  it.each([
    ["/store", "el-cy", "/store"],
    ["/products/shirt", "el-cy", "/products/shirt"],
    ["/us/store", "en-us", "/store"],
    ["/gb/products/shirt", "en-gb", "/products/shirt"],
    ["/ch/store", "de-ch", "/store"],
    ["/ch/fr/store", "fr-ch", "/store"],
    ["/ch/fr/categories/a/b", "fr-ch", "/categories/a/b"],
    ["/store/", "el-cy", "/store/"],
  ])("%s → %s with the page %s", (target, key, internalPath) => {
    expect(served(seeded, target)).toEqual([key, internalPath]);
  });

  it("serves /ch/ and /ch/fr/ as two markets of one country", () => {
    const german = at(seeded, "/ch");
    const french = at(seeded, "/ch/fr");
    expect(german).toMatchObject({ kind: "rewrite", market: { country: "ch", language: "de" } });
    expect(french).toMatchObject({ kind: "rewrite", market: { country: "ch", language: "fr" } });
  });

  it("sends the primary country's own segment to /: /cy/ is a 301 to /", () => {
    expect(at(seeded, "/cy")).toEqual(redirectTo("/"));
    expect(at(seeded, "/cy/")).toEqual(redirectTo("/"));
    expect(at(seeded, "/cy/store")).toEqual(redirectTo("/store"));
    expect(at(seeded, "/cy/el/store")).toEqual(redirectTo("/store"));
  });

  it("sends a default language's segment away: /ch/de/ is a 301 to /ch/", () => {
    expect(at(seeded, "/ch/de")).toEqual(redirectTo("/ch"));
    expect(at(seeded, "/ch/de/store")).toEqual(redirectTo("/ch/store"));
    expect(at(seeded, "/us/en")).toEqual(redirectTo("/us"));
  });

  it("keeps the trailing slash and the query string across a redirect", () => {
    expect(at(seeded, "/cy/store/?page=2&sort=asc")).toEqual(redirectTo("/store/?page=2&sort=asc"));
    expect(at(seeded, "/cy/?utm_source=a")).toEqual(redirectTo("/?utm_source=a"));
    expect(at(seeded, "/cy?x=1")).toEqual(redirectTo("/?x=1"));
    expect(at(seeded, "/ch/de/store/?q=a+b")).toEqual(redirectTo("/ch/store/?q=a+b"));
  });

  it("keeps the trailing slash through a rewrite too", () => {
    expect(served(seeded, "/ch/fr/store/")).toEqual(["fr-ch", "/store/"]);
  });

  it("returns 404 for an internal key, with or without a path", () => {
    for (const target of ["/el-cy", "/el-cy/", "/en-us/store", "/fr-ch", "/de-ch/products/x"]) {
      expect(at(seeded, target)).toEqual(NOT_FOUND);
    }
  });

  it("does not treat a key that no market has as one (it is a CMS page, and the CMS says 404)", () => {
    expect(served(seeded, "/el-us")).toEqual(["el-cy", "/el-us"]);
  });

  it("gives a language segment of another country to the CMS: /fr is France, /en is a slug", () => {
    expect(served(seeded, "/en")).toEqual(["el-cy", "/en"]);
    expect(served(seeded, "/el/store")).toEqual(["el-cy", "/el/store"]);
  });

  it("gives an unknown first segment to the primary country, whole", () => {
    expect(served(seeded, "/about-us")).toEqual(["el-cy", "/about-us"]);
    expect(served(seeded, "/xx/yy")).toEqual(["el-cy", "/xx/yy"]);
  });

  it("matches codes in lowercase only (SPEC §8.5)", () => {
    expect(served(seeded, "/US")).toEqual(["el-cy", "/US"]);
  });

  it("does not serve a closed country", () => {
    expect(served(germanyClosed, "/de")).toEqual(["el-cy", "/de"]);
    expect(served(germanyClosed, "/us")).toEqual(["en-us", ""]);
  });

  it("answers 404 for a map with nothing open", () => {
    const empty: MarketMap = { ...seeded, countries: [] };
    expect(at(empty, "/")).toEqual(NOT_FOUND);
  });
});

describe("Cyprus gains English (SPEC §8.5: /cy/en/)", () => {
  const map = cyprusGainsEnglish;

  it("serves the extra language of the primary country under /cy/en/", () => {
    expect(served(map, "/cy/en")).toEqual(["en-cy", ""]);
    expect(served(map, "/cy/en/")).toEqual(["en-cy", ""]);
    expect(served(map, "/cy/en/store")).toEqual(["en-cy", "/store"]);
  });

  it("still sends /cy/ to / and keeps / in Greek", () => {
    expect(at(map, "/cy")).toEqual(redirectTo("/"));
    expect(at(map, "/cy/el/store")).toEqual(redirectTo("/store"));
    expect(served(map, "/")).toEqual(["el-cy", ""]);
  });

  it("leaves /en/ to the CMS: a language alone is no segment of a multi-country store", () => {
    expect(served(map, "/en")).toEqual(["el-cy", "/en"]);
  });

  it("returns 404 for the new internal key, and nothing else changed", () => {
    expect(at(map, "/en-cy")).toEqual(NOT_FOUND);
    expect(served(map, "/us")).toEqual(["en-us", ""]);
    expect(served(map, "/ch/fr")).toEqual(["fr-ch", ""]);
  });
});

describe("a per-country domain (SPEC §8.5)", () => {
  const map = withDomains;

  it("drops the country segment on the country's domain", () => {
    expect(served(map, "/", "shop.com.cy")).toEqual(["el-cy", ""]);
    expect(served(map, "/store", "shop.com.cy")).toEqual(["el-cy", "/store"]);
    expect(served(map, "/", "shop.ch")).toEqual(["de-ch", ""]);
    expect(served(map, "/store", "shop.ch")).toEqual(["de-ch", "/store"]);
  });

  it("uses /{lang}/ for the extra languages there", () => {
    expect(served(map, "/fr", "shop.ch")).toEqual(["fr-ch", ""]);
    expect(served(map, "/fr/store", "shop.ch")).toEqual(["fr-ch", "/store"]);
    expect(at(map, "/de/store", "shop.ch")).toEqual(redirectTo("/store"));
  });

  it("matches the host without case, port or trailing dot", () => {
    expect(served(map, "/", "SHOP.ch")).toEqual(["de-ch", ""]);
    expect(served(map, "/", "shop.ch:443")).toEqual(["de-ch", ""]);
    expect(served(map, "/", "shop.ch.")).toEqual(["de-ch", ""]);
  });

  it("serves the one country there and no other: /us is a CMS page of Switzerland", () => {
    expect(served(map, "/us", "shop.ch")).toEqual(["de-ch", "/us"]);
  });

  it("returns 404 for any internal key on a domain too", () => {
    expect(at(map, "/de-ch", "shop.ch")).toEqual(NOT_FOUND);
    expect(at(map, "/el-cy/store", "shop.com.cy")).toEqual(NOT_FOUND);
  });

  it("serves every market under the usual segments on any other host", () => {
    expect(served(map, "/", "example.com")).toEqual(["el-cy", ""]);
    expect(served(map, "/ch/fr", "example.com")).toEqual(["fr-ch", ""]);
    expect(served(map, "/us", "localhost:8000")).toEqual(["en-us", ""]);
  });

  it("ignores the domain of a country that is closed", () => {
    const closed: MarketMap = {
      ...map,
      countries: map.countries.map((c) => (c.code === "ch" ? { ...c, enabled: false } : c)),
    };
    expect(served(closed, "/", "shop.ch")).toEqual(["el-cy", ""]);
  });
});

describe("D17: any shop's markets, with no change to resolve", () => {
  // A single-country store, whatever its country and language (SPEC §8.5): no country segment,
  // and the key and <html lang> come from the map alone.
  it.each([
    ["Brazil", brazil, "pt", "br", "pt-br", "pt-BR"],
    ["Mongolia", mongolia, "mn", "mn", "mn-mn", "mn-MN"],
    ["US only", usOnly, "en", "us", "en-us", "en-US"],
    ["Greece only", greeceOnly, "el", "gr", "el-gr", "el-GR"],
  ])("%s", (_name, map, language, country, key, htmlLang) => {
    expect(listMarkets(map).map((m) => [m.key, m.htmlLang])).toEqual([[key, htmlLang]]);
    expect(served(map, "/")).toEqual([key, ""]);
    expect(served(map, "/store")).toEqual([key, "/store"]);
    expect(served(map, "/products/shirt/")).toEqual([key, "/products/shirt/"]);
    expect(served(map, "/categories/a/b?page=2")).toEqual([key, "/categories/a/b"]);
    // The country's own code is no segment here, so a page may be called that. Mongolia's language
    // is `mn` too, and a language segment wins over a page of the same name (SPEC §8.5).
    if (country !== language) expect(served(map, `/${country}`)).toEqual([key, `/${country}`]);
    // The only language is the default, so its segment is redundant.
    expect(at(map, `/${language}`)).toEqual(redirectTo("/"));
    expect(at(map, `/${language}/store/?a=1`)).toEqual(redirectTo("/store/?a=1"));
    // The internal key is never public.
    expect(at(map, `/${key}`)).toEqual(NOT_FOUND);
    expect(at(map, `/${key}/store`)).toEqual(NOT_FOUND);
    // And a market of some other shop is just a page.
    expect(served(map, "/el-cy")).toEqual([key, "/el-cy"]);
  });

  it("serves the extra languages of a single-country store at /{lang}/ (SPEC §8.5)", () => {
    const map = greeceTwoLanguages;
    expect(served(map, "/")).toEqual(["el-gr", ""]);
    expect(served(map, "/store")).toEqual(["el-gr", "/store"]);
    expect(served(map, "/en")).toEqual(["en-gr", ""]);
    expect(served(map, "/en/")).toEqual(["en-gr", ""]);
    expect(served(map, "/en/products/shirt")).toEqual(["en-gr", "/products/shirt"]);
    expect(at(map, "/el/store/?a=1")).toEqual(redirectTo("/store/?a=1"));
    expect(at(map, "/en-gr")).toEqual(NOT_FOUND);
    expect(at(map, "/el-gr/store")).toEqual(NOT_FOUND);
  });

  it("works for a Brazilian shop that also sells in English", () => {
    const map: MarketMap = {
      ...brazil,
      countries: [{ code: "br", enabled: true, languages: ["pt", "en"] }],
      languages: [
        { code: "pt", medusaLocale: "pt-BR" },
        { code: "en", medusaLocale: "en-US" },
      ],
    };
    expect(served(map, "/")).toEqual(["pt-br", ""]);
    expect(served(map, "/en/store")).toEqual(["en-br", "/store"]);
    expect(listMarkets(map).map((m) => m.htmlLang)).toEqual(["pt-BR", "en-BR"]);
  });
});

describe("a redirect never leaves the host", () => {
  it("collapses empty segments, so //host after a stripped segment is no other origin", () => {
    expect(at(seeded, "/cy//evil.example")).toEqual(redirectTo("/evil.example"));
    expect(at(seeded, "/cy///evil.example/x")).toEqual(redirectTo("/evil.example/x"));
    expect(at(seeded, "/ch/de//evil.example")).toEqual(redirectTo("/ch/evil.example"));
  });

  it("encodes a backslash, which some browsers read as a slash", () => {
    expect(at(seeded, "/cy/%5Cevil.example")).toEqual(redirectTo("/%5Cevil.example"));
    const raw = resolve({ pathname: "/cy/\\evil.example" }, HOST, seeded);
    expect(raw).toEqual(redirectTo("/%5Cevil.example"));
  });

  it("starts every redirect location with exactly one slash", () => {
    for (const [, map] of allMaps) {
      for (const target of ["/cy", "/cy/", "/cy//x", "/ch/de", "/en/", "/pt//a", "/gr/el/"]) {
        const result = at(map, target);
        if (result.kind === "redirect") expect(result.location).toMatch(/^\/(?![/\\])/);
      }
    }
  });
});

describe("resolve is the inverse of buildPublicUrl, on every map", () => {
  const paths = ["/", "/store", "/products/shirt", "/categories/a/b", "/store?page=2&sort=asc"];

  it.each(allMaps)("%s", (_name, map) => {
    for (const market of listMarkets(map)) {
      for (const path of paths) {
        const url = new URL(buildPublicUrl(market, path, map), "https://example.com");
        // On a country's own domain the request arrives with that host, else with the main one.
        const result = resolve({ pathname: url.pathname, search: url.search }, url.host, map);
        const [pathname = "", search = ""] = path.split(/(?=\?)/);
        expect(result).toEqual({
          kind: "rewrite",
          market,
          internalPath: pathname === "/" ? "" : pathname,
        });
        expect(url.search).toBe(search);
      }
    }
  });
});
