import { describe, expect, it } from "vitest";
import {
  CSP_HEADER,
  CSP_HOSTS,
  REPORTING_ENDPOINTS,
  cspMode,
  cspSettings,
  mediaOrigin,
  staticPolicy,
} from "./csp";

const directives = (policy: string): Map<string, string[]> =>
  new Map(
    policy.split(";").map((part) => {
      const [name = "", ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );

const keyless = { dev: false, stripe: false, upgradeInsecureRequests: true } as const;

describe("staticPolicy (D138)", () => {
  it("is D138's policy for a keyless build", () => {
    const d = directives(staticPolicy(keyless));
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(d.get("media-src")).toEqual(["'self'", "data:"]);
    expect(d.get("font-src")).toEqual(["'self'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("frame-src")).toEqual([
      "'self'",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
    ]);
    expect(d.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
    expect(d.get("upgrade-insecure-requests")).toEqual([]);
    expect(d.get("report-uri")).toEqual(["/next/csp-report"]);
    expect(d.get("report-to")).toEqual(["csp-endpoint"]);
  });

  it("adds Stripe's hosts only in a build with its key (D114)", () => {
    const d = directives(staticPolicy({ ...keyless, stripe: true }));
    expect(d.get("script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
    ]);
    expect(d.get("connect-src")).toEqual(["'self'", "https://api.stripe.com"]);
    expect(d.get("frame-src")).toEqual([
      "'self'",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://hooks.stripe.com",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
    ]);
    // The guide's `img-src https://*.stripe.com` is for Checkout and Connect, which the shop does
    // not use; the keyed run's Elements drew every picture inside Stripe's own frames.
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(staticPolicy(keyless)).not.toContain("stripe");
  });

  it("allows R2's public origin for pictures and videos, and nothing else", () => {
    const policy = staticPolicy({ ...keyless, media: "https://media.example.com" });
    expect(directives(policy).get("img-src")).toContain("https://media.example.com");
    expect(directives(policy).get("media-src")).toContain("https://media.example.com");
    expect(policy.match(/media\.example\.com/g)).toHaveLength(2);
  });

  it("has 'unsafe-eval' only in next dev (Next's guide, React's debugging)", () => {
    expect(staticPolicy(keyless)).not.toContain("'unsafe-eval'");
    expect(directives(staticPolicy({ ...keyless, dev: true })).get("script-src")).toContain(
      "'unsafe-eval'",
    );
  });

  it("names no PostHog or Sentry host: the browser uses /ingest and /monitoring", () => {
    const policy = staticPolicy({ ...keyless, stripe: true, media: "https://m.example.com" });
    expect(policy).not.toMatch(/posthog|sentry/);
  });

  it("lists each host with its source and a directive the builder reads", () => {
    for (const host of CSP_HOSTS) {
      expect(host.why.length, host.source).toBeGreaterThan(20);
      expect(host.source).toMatch(/^https:\/\/(\*\.)?[a-z0-9.-]+$/);
      const policy = staticPolicy({ ...keyless, stripe: true });
      expect(directives(policy).get(host.directive)).toContain(host.source);
    }
  });
});

describe("cspMode (D140)", () => {
  it("is enforce when blank, and the mode named otherwise", () => {
    expect(cspMode(undefined)).toBe("enforce");
    expect(cspMode(" ")).toBe("enforce");
    expect(cspMode("enforce")).toBe("enforce");
    expect(cspMode("report-only")).toBe("report-only");
  });

  it("refuses a typo instead of turning the policy off", () => {
    expect(() => cspMode("reportonly")).toThrow(/CSP_MODE must be enforce or report-only/);
    expect(() => cspMode("off")).toThrow();
  });
});

describe("mediaOrigin", () => {
  it("is the URL's origin, or nothing", () => {
    expect(mediaOrigin("https://media.example.com/shop/")).toBe("https://media.example.com");
    expect(mediaOrigin("http://127.0.0.1:9100/bucket")).toBe("http://127.0.0.1:9100");
    expect(mediaOrigin("")).toBeUndefined();
    expect(mediaOrigin(undefined)).toBeUndefined();
    expect(mediaOrigin("not a url")).toBeUndefined();
    expect(mediaOrigin("ftp://media.example.com")).toBeUndefined();
  });
});

describe("cspSettings", () => {
  it("picks the header by CSP_MODE", () => {
    expect(cspSettings({}, false).header).toBe(CSP_HEADER.enforce);
    expect(cspSettings({ CSP_MODE: "report-only" }, false).header).toBe(
      "Content-Security-Policy-Report-Only",
    );
  });

  it("reads the keys of the build", () => {
    const { policy } = cspSettings(
      { NEXT_PUBLIC_STRIPE_KEY: "pk_test_x", S3_PUBLIC_URL: "https://m.example.com/x" },
      false,
    );
    expect(policy).toContain("https://js.stripe.com");
    expect(policy).toContain("https://m.example.com");
  });
});

describe("upgrade-insecure-requests", () => {
  it("is off only for a site on plain http (Chromium upgrades a redirect's target on localhost)", () => {
    expect(cspSettings({}, false).policy).toContain("upgrade-insecure-requests");
    expect(
      cspSettings({ NEXT_PUBLIC_BASE_URL: "https://shop.example.com" }, false).policy,
    ).toContain("upgrade-insecure-requests");
    expect(
      cspSettings({ NEXT_PUBLIC_BASE_URL: "http://localhost:8000" }, false).policy,
    ).not.toContain("upgrade-insecure-requests");
  });
});

describe("REPORTING_ENDPOINTS", () => {
  it("names the group report-to uses, at the shop's own route", () => {
    expect(REPORTING_ENDPOINTS).toBe('csp-endpoint="/next/csp-report"');
  });
});
