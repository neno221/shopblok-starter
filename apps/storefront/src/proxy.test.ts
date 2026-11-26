import { NextRequest, type NextResponse } from "next/server";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "./lib/markets/types";
import { seeded, withDomains } from "./lib/markets/test-maps";
import { payloadSigningKey } from "./lib/security/payload-token";
import {
  designSystemPaths,
  firstUserPaths,
  pathsLeftAlone,
  slashRedirects,
  storefrontPaths,
} from "./test-support/proxy-urls";
import { config, isDesignSystemPath, proxy, withoutTrailingSlash } from "./proxy";

// The map comes from `/next/markets` (a fetch); the glue test below gives it directly.
const proxyMap = vi.hoisted(() => ({ current: undefined as MarketMap | undefined }));
vi.mock("./lib/markets/proxy-market-map", () => ({
  getProxyMarketMap: async () => proxyMap.current ?? seeded,
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

  it.each(designSystemPaths)("runs on the design-system page %s (M7 D148, T111)", (url) => {
    expect(runsOn(url)).toBe(true);
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
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
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

/** A token signed the way Payload signs one (`payload-token.test.ts` holds that to Payload's own). */
function staffToken(claims: Record<string, unknown>, secret = "proxy-test-secret"): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "HS256", authVersion: 1, typ: "JWT" })}.${part({
    exp: Math.floor(Date.now() / 1000) + 600,
    ...claims,
  })}`;
  const signature = createHmac("sha256", payloadSigningKey(secret))
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

const editor = () => staffToken({ id: 2, collection: "users", role: "editor" });
const withCookie = (path: string, cookie?: string) =>
  new NextRequest(`https://example.com${path}`, cookie ? { headers: { cookie } } : {});

describe("the design-system gate (M7 D148, 4; T111)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const deployment = () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("DEPLOY_ENV", "staging");
    vi.stubEnv("PAYLOAD_SECRET", "proxy-test-secret");
  };
  const passes = (response: NextResponse) =>
    response.headers.get("x-middleware-next") === "1" && getRewrittenUrl(response) === null;
  const notFound = (response: NextResponse) => getRewrittenUrl(response) === "https://example.com/";

  it("knows the DS's paths, and not the storefront's that look like them", () => {
    for (const path of designSystemPaths) expect(isDesignSystemPath(path), path).toBe(true);
    for (const path of [
      "/design-systems",
      "/design-system-2/en",
      "/us/design-system",
      "/design-system.png",
      "/design-systems.rsc",
    ])
      expect(isDesignSystemPath(path), path).toBe(false);
  });

  it("passes every DS page on untouched off a deployment, with the static policy", async () => {
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    for (const path of designSystemPaths) {
      const response = await proxy(withCookie(path));
      expect(passes(response), path).toBe(true);
      expect(response.headers.get("content-security-policy"), path).toContain("default-src");
    }
  });

  it("is off in next dev, even with DEPLOY_ENV set", async () => {
    deployment();
    vi.stubEnv("NODE_ENV", "development");
    expect(passes(await proxy(withCookie("/design-system/en")))).toBe(true);
  });

  it.each([
    ["DEPLOY_ENV", "staging"],
    ["DEPLOY_ENV", "production"],
    ["DEPLOY_ENV", "Staging"],
    ["VERCEL_ENV", "preview"],
  ])(
    "answers the 404 of any unknown path without a staff sign-in, with %s=%s",
    async (name, value) => {
      deployment();
      vi.stubEnv("DEPLOY_ENV", "");
      vi.stubEnv(name, value);
      for (const path of designSystemPaths) {
        const response = await proxy(withCookie(path));
        expect(notFound(response), path).toBe(true);
        expect(response.headers.get("cache-control"), path).toContain("no-store");
        expect(response.headers.get("content-security-policy"), path).toContain("default-src");
      }
    },
  );

  it("lets an admin and an editor in, never stored by a cache", async () => {
    deployment();
    for (const role of ["admin", "editor"]) {
      const cookie = `payload-token=${staffToken({ id: 1, collection: "users", role })}`;
      const response = await proxy(withCookie("/design-system/en/foundations/colors", cookie));
      expect(passes(response), role).toBe(true);
      expect(response.headers.get("cache-control"), role).toContain("no-store");
    }
  });

  it("refuses an integration, a role that is not staff, an expired, a tampered and a foreign token", async () => {
    deployment();
    const tokens = {
      integration: staffToken({ id: 1, collection: "integrations", role: "medusa-sync" }),
      "integration named admin": staffToken({ id: 1, collection: "integrations", role: "admin" }),
      "no role": staffToken({ id: 1, collection: "users" }),
      expired: staffToken({ id: 1, collection: "users", role: "admin", exp: 1 }),
      tampered: `${editor().slice(0, -2)}xx`,
      "another secret": staffToken({ id: 1, collection: "users", role: "admin" }, "other"),
    };
    for (const [what, token] of Object.entries(tokens)) {
      const response = await proxy(withCookie("/design-system/en", `payload-token=${token}`));
      expect(notFound(response), what).toBe(true);
    }
  });

  it("refuses everyone when the deployment has no PAYLOAD_SECRET", async () => {
    deployment();
    vi.stubEnv("PAYLOAD_SECRET", "");
    expect(
      notFound(await proxy(withCookie("/design-system/en", `payload-token=${editor()}`))),
    ).toBe(true);
  });

  it("still drops a trailing slash first, for anyone", async () => {
    deployment();
    const response = await proxy(withCookie("/design-system/en/"));
    expect([response.status, getRedirectUrl(response)]).toEqual([
      308,
      "https://example.com/design-system/en",
    ]);
  });
});

describe("an own-domain market's preview on this host (M7 D148, 3; T111)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    proxyMap.current = undefined;
  });

  const draft = "__prerender_bypass=draft-id";

  it("serves /{key}/… to staff in Draft Mode, noindex and never stored", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "proxy-test-secret");
    proxyMap.current = withDomains;
    const cookie = `${draft}; payload-token=${editor()}`;
    for (const [path, internal] of [
      ["/de-ch/about", "/de-ch/about"],
      ["/fr-ch", "/fr-ch"],
      ["/el-cy/store?page=2", "/el-cy/store?page=2"],
    ] as const) {
      const response = await proxy(withCookie(path, cookie));
      expect(getRewrittenUrl(response), path).toBe(`https://example.com${internal}`);
      expect(response.headers.get("x-robots-tag"), path).toBe("noindex");
      expect(response.headers.get("cache-control"), path).toContain("no-store");
      expect(response.headers.get("content-security-policy"), path).toContain("default-src");
    }
  });

  it("is the key's 404 without Draft Mode, without a staff token, or on the market's own domain", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "proxy-test-secret");
    proxyMap.current = withDomains;
    const integration = staffToken({ id: 1, collection: "integrations", role: "medusa-sync" });
    const refused: [string, string, string?][] = [
      ["no draft", `payload-token=${editor()}`],
      ["no token", draft],
      ["an integration", `${draft}; payload-token=${integration}`],
      ["its own domain", `${draft}; payload-token=${editor()}`, "shop.ch"],
    ];
    for (const [what, cookie, host] of refused) {
      const request = new NextRequest(`https://${host ?? "example.com"}/de-ch/about`, {
        headers: { cookie, host: host ?? "example.com" },
      });
      const response = await proxy(request);
      expect(getRewrittenUrl(response), what).toBe(`https://${host ?? "example.com"}/`);
    }
  });

  it("gives a nonce page the nonce policy, as on the market's own domain (PR 152 review, item 3)", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "proxy-test-secret");
    proxyMap.current = withDomains;
    const cookie = `${draft}; payload-token=${editor()}`;
    const response = await proxy(withCookie("/de-ch/cart", cookie));
    expect(getRewrittenUrl(response)).toBe("https://example.com/de-ch/cart");
    const policy = response.headers.get("content-security-policy") ?? "";
    expect(policy).toMatch(/'nonce-[^']+'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    // A page outside the nine keeps the static policy.
    const about = await proxy(withCookie("/de-ch/about", cookie));
    expect(about.headers.get("content-security-policy") ?? "").not.toContain("'nonce-");
  });

  it("never serves a market on this host at its key, even to staff in Draft Mode", async () => {
    vi.stubEnv("PAYLOAD_SECRET", "proxy-test-secret");
    proxyMap.current = withDomains;
    const response = await proxy(withCookie("/de-de/about", `${draft}; payload-token=${editor()}`));
    expect(getRewrittenUrl(response)).toBe("https://example.com/");
  });
});
