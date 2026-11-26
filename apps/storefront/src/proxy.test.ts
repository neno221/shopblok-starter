import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seeded } from "./lib/markets/test-maps";
import {
  firstUserPaths,
  pathsLeftAlone,
  slashRedirects,
  storefrontPaths,
} from "./test-support/proxy-urls";
import { config, proxy, withoutTrailingSlash } from "./proxy";

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

  it.each(slashRedirects)("runs on %s, which ends in a slash (T97)", (url) => {
    expect(runsOn(url)).toBe(true);
  });
});

describe("the trailing-slash redirect, which Next no longer makes (T97)", () => {
  it.each(slashRedirects)("sends %s to %s with a 308", async (from, to) => {
    const response = await proxy(new NextRequest(`https://example.com${from}`));
    expect([response.status, getRedirectUrl(response)]).toEqual([308, `https://example.com${to}`]);
  });

  it("leaves PostHog's paths, the root and a path without a slash alone", () => {
    for (const path of ["/", "/us", "/ingest/", "/ingest/e/", "/ingest/static/array.js"])
      expect(withoutTrailingSlash(path), path).toBeNull();
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

describe("the first-user form and endpoint (M7 D136, 6)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(firstUserPaths)("runs on %s", (url) => {
    expect(runsOn(url)).toBe(true);
  });

  it.each([
    ["DEPLOY_ENV", "staging"],
    ["VERCEL_ENV", "preview"],
    ["VERCEL_ENV", "production"],
  ])("answers 403 with %s=%s", async (name, value) => {
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv(name, value);
    for (const path of firstUserPaths) {
      const response = await proxy(
        new NextRequest(`https://example.com${path}`, { method: "GET" }),
      );
      expect(response.status, path).toBe(403);
      const posted = await proxy(new NextRequest(`https://example.com${path}`, { method: "POST" }));
      expect(posted.status, path).toBe(403);
    }
  });

  it("passes them through untouched in development", async () => {
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    for (const path of firstUserPaths) {
      const response = await proxy(new NextRequest(`https://example.com${path}`));
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
      expect(getRewrittenUrl(response)).toBeNull();
    }
  });
});

describe("the nonce policy on the nine routes (M7 D139, T107)", () => {
  const policyOf = (response: Response) => response.headers.get("content-security-policy") ?? "";
  const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];

  it.each([
    "/us/cart",
    "/cart",
    "/ch/fr/checkout/delivery",
    "/us/account/orders/order_01",
    "/us/order/order_01/confirmed",
    "/us/login",
    "/de/verify",
  ])("sends %s on with a fresh nonce, in its request and in its answer", async (path) => {
    const first = await proxy(new NextRequest(`https://example.com${path}`));
    const second = await proxy(new NextRequest(`https://example.com${path}`));
    const policy = policyOf(first);
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-inline' ");
    expect(nonceOf(policy)).toBeDefined();
    expect(nonceOf(policyOf(second))).not.toBe(nonceOf(policy));
    // The page's request carries the same policy, for Next to read the nonce from.
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(first.headers.get("x-middleware-override-headers")).toContain("content-security-policy");
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(getRewrittenUrl(first)).not.toBeNull();
  });

  it.each(["/us", "/us/store", "/us/products/shirt", "/us/cart/x", "/us/account/x", "/us/order"])(
    "keeps the static policy on %s",
    async (path) => {
      const response = await proxy(new NextRequest(`https://example.com${path}`));
      expect(policyOf(response)).toContain("script-src 'self' 'unsafe-inline'");
      expect(policyOf(response)).not.toContain("'nonce-");
      expect(response.headers.get("x-middleware-request-content-security-policy")).toBeNull();
      expect(response.headers.get("cache-control")).toBeNull();
    },
  );

  it("replaces a policy header the visitor's request brings with its own", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/us/cart", {
        headers: {
          "content-security-policy": "script-src 'nonce-chosen'",
          "content-security-policy-report-only": "script-src 'nonce-chosen'",
        },
      }),
    );
    const sent = response.headers.get("x-middleware-request-content-security-policy") ?? "";
    expect(sent).not.toContain("chosen");
    expect(
      response.headers.get("x-middleware-request-content-security-policy-report-only"),
    ).toBeNull();
  });

  it("sends the report-only header in its place under CSP_MODE=report-only", async () => {
    vi.stubEnv("CSP_MODE", "report-only");
    try {
      const response = await proxy(new NextRequest("https://example.com/us/cart"));
      expect(response.headers.get("content-security-policy")).toBeNull();
      expect(response.headers.get("content-security-policy-report-only")).toContain("'nonce-");
      expect(
        response.headers.get("x-middleware-request-content-security-policy-report-only"),
      ).toContain("'nonce-");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
