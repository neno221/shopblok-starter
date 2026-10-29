import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";
import { seeded } from "./lib/markets/test-maps";
import { pathsLeftAlone, storefrontPaths } from "./test-support/proxy-urls";
import { config, proxy } from "./proxy";

// The map comes from `/next/markets` (a fetch); the glue test below gives it directly.
vi.mock("./lib/markets/proxy-market-map", () => ({
  getProxyMarketMap: async () => seeded,
}));
// The redirects come from `/next/redirects` (a fetch) too (T68).
vi.mock("./lib/redirects/proxy-redirects", () => ({
  getProxyRedirects: async () => ({
    redirects: [{ from: "/old", type: "301", to: { url: "/store" } }],
  }),
}));

// (The docs call the helper `unstable_doesProxyMatch`; 16.4.1 still exports it as
// `unstable_doesMiddlewareMatch`.)
const runsOn = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("the proxy matcher", () => {
  it.each(storefrontPaths)("runs on the storefront path %s", (url) => {
    expect(runsOn(url)).toBe(true);
  });

  it.each(pathsLeftAlone)("leaves %s alone", (url) => {
    expect(runsOn(url)).toBe(false);
  });
});

describe("the proxy", () => {
  it("answers a request from the map it reads", async () => {
    const response = await proxy(new NextRequest("https://example.com/ch/fr?page=2"));
    expect(getRewrittenUrl(response)).toBe("https://example.com/fr-ch?page=2");
  });

  it("answers a path with a broken escape with a plain 404, not Next's 500 (PR 78 review)", async () => {
    for (const path of ["/us/collections/%ZZ", "/categories/%E0%A4%A"]) {
      const response = await proxy(new NextRequest(`https://example.com${path}`));
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    }
    const fine = await proxy(new NextRequest("https://example.com/us/collections/caf%C3%A9"));
    expect(fine.status).not.toBe(404);
  });

  it("reads the visitor's chosen market from its cookie for / (D66)", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/", { headers: { cookie: "_shopblok_market=en-us" } }),
    );
    expect([response.status, getRedirectUrl(response)]).toEqual([307, "https://example.com/us"]);
  });
});
