import { NextRequest } from "next/server";
import { getRewrittenUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";
import { seeded } from "./lib/markets/test-maps";
import { pathsLeftAlone, storefrontPaths } from "./test-support/proxy-urls";
import { config, proxy } from "./proxy";

// The map comes from `/next/markets` (a fetch); the glue test below gives it directly.
vi.mock("./lib/markets/proxy-market-map", () => ({
  getProxyMarketMap: async () => seeded,
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
});
