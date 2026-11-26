import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CSP_HEADER,
  CSP_HOSTS,
  GRAVATAR,
  MONACO_CDN,
  NONCE_PLACEHOLDER,
  REPORTING_ENDPOINTS,
  adminPolicy,
  cspMode,
  cspSettings,
  mediaOrigin,
  newNonce,
  noncePolicy,
  staticPolicy,
  withNonce,
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
      const policy = staticPolicy({ ...keyless, stripe: true, turnstile: true });
      expect(directives(policy).get(host.directive)).toContain(host.source);
    }
  });

  // M7 D143 (T108): Cloudflare's host only in a build with both of Turnstile's keys.
  it("allows Turnstile's script and frame only with both of its keys", () => {
    const off = directives(staticPolicy(keyless));
    expect([...off.values()].flat()).not.toContain("https://challenges.cloudflare.com");
    const on = directives(staticPolicy({ ...keyless, turnstile: true }));
    expect(on.get("script-src")).toContain("https://challenges.cloudflare.com");
    expect(on.get("frame-src")).toContain("https://challenges.cloudflare.com");
    expect(on.get("connect-src")).not.toContain("https://challenges.cloudflare.com");
    const site = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA" };
    const secret = { TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" };
    expect(cspSettings(site, false).policy).not.toContain("challenges.cloudflare.com");
    expect(cspSettings({ ...site, ...secret }, false).policy).toContain(
      "frame-src 'self' https://challenges.cloudflare.com",
    );
    expect(cspSettings({ ...site, ...secret }, false).noncePolicy).toContain(
      "https://challenges.cloudflare.com",
    );
  });
});

describe("noncePolicy (D139)", () => {
  const nonce = "AAAAAAAAAAAAAAAAAAAAAA==";

  it("is the static policy with 'nonce-…' 'strict-dynamic' in place of 'unsafe-inline' in script-src", () => {
    const nonced = directives(noncePolicy({ ...keyless, nonce }));
    const fixed = directives(staticPolicy(keyless));
    expect(nonced.get("script-src")).toEqual(["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]);
    for (const [name, sources] of fixed) {
      if (name !== "script-src") expect(nonced.get(name), name).toEqual(sources);
    }
    expect([...nonced.keys()]).toEqual([...fixed.keys()]);
  });

  it("keeps Stripe's script hosts beside the nonce, and 'unsafe-eval' in next dev only", () => {
    expect(directives(noncePolicy({ ...keyless, stripe: true, nonce })).get("script-src")).toEqual([
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
    ]);
    expect(noncePolicy({ ...keyless, nonce })).not.toContain("'unsafe-eval'");
    expect(directives(noncePolicy({ ...keyless, dev: true, nonce })).get("script-src")).toContain(
      "'unsafe-eval'",
    );
  });

  it("has no 'unsafe-inline' for scripts (styles keep theirs)", () => {
    const d = directives(noncePolicy({ ...keyless, stripe: true, nonce }));
    expect(d.get("script-src")).not.toContain("'unsafe-inline'");
    expect(d.get("style-src")).toContain("'unsafe-inline'");
  });
});

describe("withNonce and newNonce (D139)", () => {
  it("fills the build's template with the request's nonce, everywhere it stands", () => {
    const template = cspSettings({ NEXT_PUBLIC_STRIPE_KEY: "pk_test_x" }, false).noncePolicy;
    expect(template).toContain(`'nonce-${NONCE_PLACEHOLDER}'`);
    const policy = withNonce(template, "abc123+/_-==");
    expect(policy).toContain("'nonce-abc123+/_-=='");
    expect(policy).not.toContain(NONCE_PLACEHOLDER);
  });

  it("refuses a nonce that could break out of the header's value", () => {
    for (const bad of ["", "a'; script-src *", "a b", "a;b"]) {
      expect(() => withNonce(`'nonce-${NONCE_PLACEHOLDER}'`, bad), bad).toThrow(/base64/);
    }
  });

  it("makes 128 random bits, base64, new on every call", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const nonce = newNonce();
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
      expect(atob(nonce)).toHaveLength(16);
      seen.add(nonce);
    }
    expect(seen.size).toBe(100);
  });

  it("is a nonce Next reads back from the policy (Next's own parser)", async () => {
    const { getScriptNonceFromHeader } =
      await import("next/dist/server/app-render/get-script-nonce-from-header.js");
    const nonce = newNonce();
    const policy = withNonce(cspSettings({}, false).noncePolicy, nonce);
    expect(getScriptNonceFromHeader(policy)).toBe(nonce);
  });
});

describe("adminPolicy (D141)", () => {
  const admin = { dev: false, upgradeInsecureRequests: true } as const;

  it("keeps 'unsafe-inline' (no proxy runs there to nonce), and frames only the shop", () => {
    const d = directives(adminPolicy(admin));
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'", MONACO_CDN]);
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'", MONACO_CDN]);
    expect(d.get("worker-src")).toEqual(["'self'", "blob:", MONACO_CDN]);
    expect(d.get("font-src")).toEqual(["'self'", "data:"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:", GRAVATAR]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("frame-src")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(adminPolicy(admin)).not.toMatch(/stripe|youtube|vimeo/);
  });

  it("names jsdelivr only by Monaco's pinned path, never the whole host", () => {
    expect(MONACO_CDN).toBe("https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/");
    const policy = adminPolicy(admin);
    expect(policy.match(/https:\/\/cdn\.jsdelivr\.net[^\s;]*/g)).toEqual([
      MONACO_CDN,
      MONACO_CDN,
      MONACO_CDN,
    ]);
    expect(staticPolicy({ ...keyless, stripe: true })).not.toContain("jsdelivr");
  });

  it("is the Monaco path Payload's own bundle asks for (fails when a Payload release moves it)", () => {
    // `@payloadcms/ui` bundles `@monaco-editor/loader` into its client chunks; its default path
    // is what the editor loads.
    const ui = realpathSync(
      fileURLToPath(new URL("../../../node_modules/@payloadcms/ui", import.meta.url)),
    );
    const dir = join(ui, "dist", "exports", "client");
    const paths = new Set<string>();
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".js"))) {
      for (const match of readFileSync(join(dir, file), "utf8").matchAll(
        /https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[^/"']+\/min\/vs/g,
      )) {
        paths.add(match[0]);
      }
    }
    expect([...paths]).toEqual([`${MONACO_CDN}min/vs`]);
  });

  it("allows R2's public origin for pictures and its S3 endpoint for the admin's uploads", () => {
    const d = directives(
      adminPolicy({
        ...admin,
        media: "https://media.example.com",
        uploads: "https://account.r2.cloudflarestorage.com",
      }),
    );
    expect(d.get("img-src")).toContain("https://media.example.com");
    expect(d.get("connect-src")).toEqual(["'self'", "https://account.r2.cloudflarestorage.com"]);
  });

  it("has 'unsafe-eval' only in next dev", () => {
    expect(adminPolicy(admin)).not.toContain("'unsafe-eval'");
    expect(adminPolicy({ ...admin, dev: true })).toContain("'unsafe-eval'");
  });

  it("comes from the build's S3_PUBLIC_URL and S3_ENDPOINT", () => {
    const { adminPolicy: policy } = cspSettings(
      { S3_PUBLIC_URL: "https://m.example.com/x", S3_ENDPOINT: "https://r2.example.com" },
      false,
    );
    expect(directives(policy).get("connect-src")).toEqual(["'self'", "https://r2.example.com"]);
    expect(directives(policy).get("img-src")).toContain("https://m.example.com");
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
