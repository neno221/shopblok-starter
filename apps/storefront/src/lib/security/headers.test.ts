import { withPayload } from "@payloadcms/next/withPayload";
import { describe, expect, it } from "vitest";
import { cspSettings } from "./csp";
import {
  ADMIN_POLICY_PATHS,
  HEADER_POLICY_PATHS,
  HSTS,
  hstsEnabled,
  noindexEnabled,
  PAYLOAD_HEADERS_SOURCE,
  PERMISSIONS_POLICY,
  scopePayloadHeaders,
  securityHeaderRules,
  securityHeaders,
} from "./headers";
import { config as proxyConfig } from "../../proxy";

const csp = cspSettings({}, false);

describe("securityHeaders (D137)", () => {
  it("sends D137's headers, without HSTS off production", () => {
    expect(securityHeaders({ production: false })).toEqual([
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
      { key: "Reporting-Endpoints", value: 'csp-endpoint="/next/csp-report"' },
    ]);
  });

  it("adds HSTS for two years with subdomains on production, and no preload before go-live", () => {
    const hsts = securityHeaders({ production: true }).find(
      (header) => header.key === "Strict-Transport-Security",
    );
    expect(hsts?.value).toBe(HSTS);
    expect(HSTS).toBe("max-age=63072000; includeSubDomains");
    expect(HSTS).not.toContain("preload");
  });

  it("turns off the devices and allows payment for the shop and Stripe's frames", () => {
    for (const feature of ["camera", "microphone", "geolocation", "usb"]) {
      expect(PERMISSIONS_POLICY).toContain(`${feature}=()`);
    }
    expect(PERMISSIONS_POLICY).toContain(
      'payment=(self "https://js.stripe.com" "https://*.js.stripe.com")',
    );
    // Chromium warns "Unrecognized feature" on every page for a name it does not know.
    expect(PERMISSIONS_POLICY).not.toContain("bluetooth");
  });
});

describe("securityHeaderRules (D138: one policy per response)", () => {
  const rules = securityHeaderRules({ production: false, csp });

  it("sends the headers on every path", () => {
    expect(rules[0]).toEqual({
      source: "/:path*",
      headers: securityHeaders({ production: false }),
    });
    expect(rules[0]?.headers.some((h) => h.key.startsWith("Content-Security-Policy"))).toBe(false);
  });

  it("sends the static policy only on the paths the proxy's matcher skips", () => {
    const withPolicy = rules.slice(1, 1 + HEADER_POLICY_PATHS.length);
    expect(withPolicy.map((rule) => rule.source)).toEqual([...HEADER_POLICY_PATHS]);
    for (const rule of withPolicy) {
      expect(rule.headers).toEqual([{ key: csp.header, value: csp.policy }]);
    }
    // Each of those paths is one the proxy does not run on, so no response gets the policy twice.
    const [pages] = proxyConfig.matcher;
    const runsOn = new RegExp(`^${pages}$`);
    for (const sample of ["/next/status", "/ingest/e", "/monitoring"]) {
      expect(runsOn.test(sample), sample).toBe(false);
    }
    // The DS pages are the proxy's since T111 (its staff gate, D148), so their policy is its too.
    for (const sample of ["/", "/us", "/products/shirt", "/us/store", "/design-system/en"]) {
      expect(runsOn.test(sample), sample).toBe(true);
    }
  });

  it("sends the admin's policy, and only it, to /admin and Payload's /api (D141)", () => {
    const admin = rules.slice(1 + HEADER_POLICY_PATHS.length);
    expect(admin.map((rule) => rule.source)).toEqual([...ADMIN_POLICY_PATHS]);
    for (const rule of admin) {
      expect(rule.headers).toEqual([{ key: csp.header, value: csp.adminPolicy }]);
    }
    for (const rule of rules.slice(1, 1 + HEADER_POLICY_PATHS.length)) {
      expect(rule.source.startsWith("/admin")).toBe(false);
      expect(rule.source.startsWith("/api")).toBe(false);
    }
    // The proxy's first entry skips both, so neither gets a second policy from it; its third entry
    // (the first-user form, M7 D136) answers without a policy of its own.
    const [pages] = proxyConfig.matcher;
    const runsOn = new RegExp(`^${pages}$`);
    for (const sample of ["/admin", "/admin/collections/pages", "/api/pages", "/api/graphql"]) {
      expect(runsOn.test(sample), sample).toBe(false);
    }
  });
});

describe("scopePayloadHeaders (D137)", () => {
  it("moves withPayload's client-hint headers from every path to /admin", async () => {
    const config = scopePayloadHeaders(
      // `poweredByHeader: false` as in next.config.ts: Payload adds its own `X-Powered-By` otherwise.
      withPayload({
        poweredByHeader: false,
        headers: async () => securityHeaderRules({ production: false, csp }),
      }),
    );
    const rules = await config.headers!();
    const payloads = rules.filter((rule) => rule.headers.some((h) => h.key === "Accept-CH"));
    // Fails if a Payload release stops adding the entry, or adds it under another shape.
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.source).toBe(PAYLOAD_HEADERS_SOURCE);
    expect(payloads[0]?.headers.map((h) => h.key).sort()).toEqual([
      "Accept-CH",
      "Critical-CH",
      "Vary",
    ]);
    // Ours are left as they were.
    expect(rules.slice(0, -1)).toEqual(securityHeaderRules({ production: false, csp }));
  });

  it("leaves a config without headers alone", () => {
    const config = { poweredByHeader: false };
    expect(scopePayloadHeaders(config)).toBe(config);
  });
});

describe("hstsEnabled (D137)", () => {
  it("is on only with DEPLOY_ENV=production", () => {
    expect(hstsEnabled({ DEPLOY_ENV: "production" })).toBe(true);
    expect(hstsEnabled({ DEPLOY_ENV: "production", VERCEL_ENV: "production" })).toBe(true);
    expect(hstsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(hstsEnabled({ VERCEL_ENV: "production" })).toBe(false);
    expect(hstsEnabled({ DEPLOY_ENV: "staging", NODE_ENV: "production" })).toBe(false);
    expect(hstsEnabled({ DEPLOY_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
  });

  it("fails on a mistyped DEPLOY_ENV, as the rest of the app does", () => {
    expect(() => hstsEnabled({ DEPLOY_ENV: "Production" })).toThrow(/DEPLOY_ENV/);
  });
});

describe("noindexEnabled and X-Robots-Tag (M7 D147, T110; D133)", () => {
  it("is on on every hosted deployment that is not the live shop", () => {
    expect(noindexEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(noindexEnabled({ DEPLOY_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
    expect(noindexEnabled({ DEPLOY_ENV: "staging", NODE_ENV: "production" })).toBe(true);
    // Vercel's Production before DEPLOY_ENV is set: robots.txt is closed, so the header is sent.
    expect(noindexEnabled({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(true);
    expect(noindexEnabled({ DEPLOY_ENV: "staging", VERCEL_ENV: "production" })).toBe(true);
  });

  it("is off on the live shop, and where nothing is hosted (development, CI, a local next start)", () => {
    expect(noindexEnabled({ DEPLOY_ENV: "production" })).toBe(false);
    expect(noindexEnabled({ DEPLOY_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(noindexEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(noindexEnabled({ VERCEL_ENV: " ", DEPLOY_ENV: "" })).toBe(false);
    expect(noindexEnabled({})).toBe(false);
  });

  it("sends `X-Robots-Tag: noindex` only when asked", () => {
    const tag = (headers: { key: string; value: string }[]) =>
      headers.find((header) => header.key === "X-Robots-Tag")?.value;
    expect(tag(securityHeaders({ production: true, noindex: true }))).toBe("noindex");
    expect(tag(securityHeaders({ production: true }))).toBeUndefined();
    expect(tag(securityHeaders({ production: false, noindex: false }))).toBeUndefined();
  });
});
