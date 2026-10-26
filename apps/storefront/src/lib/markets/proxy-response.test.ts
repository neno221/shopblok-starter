import type { MarketMap } from "@shopblok/fixtures";
import { NextRequest } from "next/server";
import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listMarkets, primaryMarket } from "./market";
import { NOT_FOUND_PATH, redirectStatus, respondToMarketRequest } from "./proxy-response";
import { allMaps, brazil, germanyClosed, mongolia, seeded, withDomains } from "./test-maps";

function request(target: string, options: { method?: string; host?: string } = {}) {
  const url = new URL(target, "https://example.com");
  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers: { host: options.host ?? "example.com" },
  });
}

/** What the proxy answers: the rewrite target, or the redirect and its status. */
function answer(map: MarketMap, target: string, options: { method?: string; host?: string } = {}) {
  const response = respondToMarketRequest(request(target, options), map);
  if (isRewrite(response)) return { rewrite: getRewrittenUrl(response) };
  return { redirect: getRedirectUrl(response), status: response.status };
}

describe("rewrites: the public URL stays, the internal route is served", () => {
  it.each([
    ["/", "https://example.com/el-cy"],
    ["/us", "https://example.com/en-us"],
    ["/gb", "https://example.com/en-gb"],
    ["/de", "https://example.com/de-de"],
    ["/fr", "https://example.com/fr-fr"],
    ["/ch", "https://example.com/de-ch"],
    ["/ch/fr", "https://example.com/fr-ch"],
  ])("%s is served from %s", (target, internal) => {
    expect(answer(seeded, target)).toEqual({ rewrite: internal });
  });

  it("serves the path below a market's home", () => {
    expect(answer(seeded, "/store")).toEqual({ rewrite: "https://example.com/el-cy/store" });
    expect(answer(seeded, "/us/products/shirt")).toEqual({
      rewrite: "https://example.com/en-us/products/shirt",
    });
    expect(answer(seeded, "/ch/fr/products/shirt")).toEqual({
      rewrite: "https://example.com/fr-ch/products/shirt",
    });
  });

  it("keeps the query string (a filtered store page is still filtered)", () => {
    expect(answer(seeded, "/ch/fr/store?page=2&sort=asc")).toEqual({
      rewrite: "https://example.com/fr-ch/store?page=2&sort=asc",
    });
    expect(answer(seeded, "/?utm_source=mail")).toEqual({
      rewrite: "https://example.com/el-cy?utm_source=mail",
    });
  });

  it("rewrites every method, so a form post or a server action reaches its page", () => {
    expect(answer(seeded, "/us/cart", { method: "POST" })).toEqual({
      rewrite: "https://example.com/en-us/cart",
    });
  });

  it("reads the host from the Host header (a country's own domain)", () => {
    expect(answer(withDomains, "/", { host: "shop.ch" })).toEqual({
      rewrite: "https://example.com/de-ch",
    });
    expect(answer(withDomains, "/fr/store", { host: "shop.ch:443" })).toEqual({
      rewrite: "https://example.com/fr-ch/store",
    });
    // The main host still serves every market.
    expect(answer(withDomains, "/ch", { host: "example.com" })).toEqual({
      rewrite: "https://example.com/de-ch",
    });
  });
});

describe("redirects", () => {
  it.each([
    ["/cy", "https://example.com/"],
    ["/cy/store", "https://example.com/store"],
    ["/cy/el/store", "https://example.com/store"],
    ["/ch/de/store", "https://example.com/ch/store"],
  ])("%s goes to %s with 301", (target, location) => {
    expect(answer(seeded, target)).toEqual({ redirect: location, status: 301 });
  });

  it("keeps the query string and a trailing slash", () => {
    expect(answer(seeded, "/cy/store/?page=2&sort=asc")).toEqual({
      redirect: "https://example.com/store/?page=2&sort=asc",
      status: 301,
    });
    expect(answer(seeded, "/cy?x=1")).toEqual({
      redirect: "https://example.com/?x=1",
      status: 301,
    });
  });

  it("uses 308 for a method other than GET and HEAD, so the method and body survive", () => {
    expect(answer(seeded, "/cy/store", { method: "POST" }).status).toBe(308);
    expect(answer(seeded, "/cy/store", { method: "PUT" }).status).toBe(308);
    expect(answer(seeded, "/cy/store", { method: "GET" }).status).toBe(301);
    expect(answer(seeded, "/cy/store", { method: "HEAD" }).status).toBe(301);
    expect(redirectStatus("DELETE")).toBe(308);
    expect(redirectStatus("GET")).toBe(301);
  });

  it("stays on the host it was asked on", () => {
    // On shop.ch the default language needs no segment, so `/de/store` goes to `/store`.
    expect(answer(withDomains, "/de/store?x=1", { host: "shop.ch" })).toEqual({
      redirect: "https://example.com/store?x=1",
      status: 301,
    });
    const hostile = respondToMarketRequest(request("/cy//evil.example/x"), seeded);
    expect(getRedirectUrl(hostile)).toBe("https://example.com/evil.example/x");
  });
});

describe("not found: global-not-found answers, not a market page", () => {
  it.each(["/el-cy", "/el-cy/", "/en-us/store", "/fr-ch", "/de-ch/products/x"])(
    "the internal key in %s is never public",
    (target) => {
      expect(answer(seeded, target)).toEqual({ rewrite: `https://example.com${NOT_FOUND_PATH}` });
    },
  );

  it("drops the query string, which means nothing to a 404", () => {
    expect(answer(seeded, "/el-cy?x=1&y=2")).toEqual({ rewrite: "https://example.com/" });
  });

  it("is a path no market route can match", () => {
    // `/` has no segment, so no `[market]/…` route matches it, now or after any page is added.
    expect(NOT_FOUND_PATH).toBe("/");
  });

  it("answers an empty map the same way", () => {
    const empty: MarketMap = {
      countries: [],
      languages: [],
      primaryCountry: "",
      fallbackMarket: "",
    };
    expect(answer(empty, "/us")).toEqual({ rewrite: "https://example.com/" });
  });
});

describe("any shop's markets (D17), with no change to the proxy", () => {
  it.each([
    ["Brazil", brazil, "/pt-br"],
    ["Mongolia", mongolia, "/mn-mn"],
  ])("%s is served at / from %s", (_name, map, key) => {
    expect(answer(map, "/")).toEqual({ rewrite: `https://example.com${key}` });
    expect(answer(map, "/store?page=2")).toEqual({
      rewrite: `https://example.com${key}/store?page=2`,
    });
    expect(answer(map, key)).toEqual({ rewrite: "https://example.com/" });
  });

  it.each(allMaps)("%s: every market's own key is a 404 and its home is served", (_name, map) => {
    for (const market of listMarkets(map)) {
      expect(answer(map, `/${market.key}`)).toEqual({ rewrite: "https://example.com/" });
    }
    const home = primaryMarket(map);
    expect(answer(map, "/")).toEqual({ rewrite: `https://example.com/${home?.key}` });
  });
});

describe("a redirect that would leave the host", () => {
  afterEach(() => {
    vi.doUnmock("./resolve");
    vi.resetModules();
  });

  it("becomes a 404, never an open redirect", async () => {
    vi.resetModules();
    vi.doMock("./resolve", () => ({
      resolve: () => ({ kind: "redirect", status: 301, location: "//evil.example/x" }),
    }));
    const { respondToMarketRequest: guarded } = await import("./proxy-response");
    const response = guarded(request("/cy/x"), seeded);
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://example.com/");
  });
});

describe("the visitor's chosen market (D66, SPEC §8.5)", () => {
  const chosen = (
    target: string,
    market: string | undefined,
    options: { method?: string; host?: string; map?: MarketMap } = {},
  ) => {
    const response = respondToMarketRequest(
      request(target, options),
      options.map ?? seeded,
      market,
    );
    if (isRewrite(response)) return { rewrite: getRewrittenUrl(response) };
    return { redirect: getRedirectUrl(response), status: response.status };
  };

  it("sends / to the chosen market's root with a 307, keeping the query", () => {
    expect(chosen("/", "en-us")).toEqual({ redirect: "https://example.com/us", status: 307 });
    expect(chosen("/?utm_source=x", "fr-ch")).toEqual({
      redirect: "https://example.com/ch/fr?utm_source=x",
      status: 307,
    });
  });

  it("leaves every other URL to the market it names", () => {
    expect(chosen("/store", "en-us")).toEqual({ rewrite: "https://example.com/el-cy/store" });
    expect(chosen("/de", "en-us")).toEqual({ rewrite: "https://example.com/de-de" });
  });

  it("does nothing for the primary market, a market that is not open, or a write", () => {
    expect(chosen("/", "el-cy")).toEqual({ rewrite: "https://example.com/el-cy" });
    expect(chosen("/", "en-zz")).toEqual({ rewrite: "https://example.com/el-cy" });
    expect(chosen("/", "de-de", { map: germanyClosed })).toEqual({
      rewrite: "https://example.com/el-cy",
    });
    expect(chosen("/", "en-us", { method: "POST" })).toEqual({
      rewrite: "https://example.com/el-cy",
    });
  });

  it("never sends / to another host: each host's cookie holds its own choice (PR 73 review)", () => {
    // example.com's cookie says Switzerland and shop.ch's says Cyprus: following both would bounce.
    expect(chosen("/", "de-ch", { map: withDomains, host: "example.com" })).toHaveProperty(
      "rewrite",
    );
    expect(chosen("/", "el-cy", { map: withDomains, host: "shop.ch" })).toEqual({
      rewrite: "https://example.com/de-ch",
    });
    expect(chosen("/", "en-us", { map: withDomains, host: "shop.ch" })).toHaveProperty("rewrite");
    // A choice on the same host still counts.
    expect(chosen("/", "fr-ch", { map: withDomains, host: "shop.ch" })).toEqual({
      redirect: "https://shop.ch/fr",
      status: 307,
    });
  });
});
