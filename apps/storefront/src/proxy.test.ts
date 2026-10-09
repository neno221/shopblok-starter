import { NextRequest } from "next/server";
import { getRewrittenUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";
import { seeded } from "./lib/markets/test-maps";
import { config, proxy } from "./proxy";

// The map comes from `/next/markets` (a fetch); the glue test below gives it directly.
vi.mock("./lib/markets/proxy-market-map", () => ({ getProxyMarketMap: async () => seeded }));

// (The docs call the helper `unstable_doesProxyMatch`; 16.4.0 still exports it as
// `unstable_doesMiddlewareMatch`.)
const runsOn = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("the proxy matcher", () => {
  it.each([
    "/",
    "/us",
    "/us/",
    "/ch/fr/store",
    "/store",
    "/products/shirt",
    "/el-cy", // an internal key: the proxy has to be the one to answer 404
    "/administrator", // starts like /admin, is a storefront path
    "/apis",
    "/nextstep",
    "/_not-found",
    "/cy/store?page=2",
    "/products/1.5l-bottle", // a dot in a slug is not a file
    "/ch/fr/store/size-8.5",
    "/cy/evil.example/x", // the dot is not in the last segment
  ])("runs on the storefront path %s", (url) => {
    expect(runsOn(url)).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/",
    "/admin/collections/pages",
    "/admin/login",
    "/api",
    "/api/pages",
    "/api/users/first-register",
    "/next/preview",
    "/next/exit-preview",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/_next/data/build/index.json",
    "/_vercel/insights/script.js",
    "/_vercel/insights/view", // no dot: only the /_vercel/ rule leaves it alone
    "/_vercel/speed-insights/vitals",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/images/logo.png",
    "/images/logo.min.js",
    "/.well-known/security.txt",
    "/.well-known/apple-app-site-association", // no extension: only the /.well-known/ rule
    "/cy/evil.example", // the last segment is a file name to the matcher
  ])("leaves %s alone", (url) => {
    expect(runsOn(url)).toBe(false);
  });
});

describe("the proxy", () => {
  it("answers a request from the map it reads", async () => {
    const response = await proxy(new NextRequest("https://example.com/ch/fr?page=2"));
    expect(getRewrittenUrl(response)).toBe("https://example.com/fr-ch?page=2");
  });
});
