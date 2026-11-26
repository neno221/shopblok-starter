// M7 D137 (T106): the headers on every response, and where the static policy goes when the proxy
// does not run. `next.config.ts`'s `headers()` returns `securityHeaderRules(…)`; the proxy sets the
// policy itself on every path its matcher takes (`src/proxy.ts`), so no response carries two
// (D138: "one policy per response"). Pure, so `headers.test.ts` checks the rules without a build.
import type { NextConfig } from "next";
import { deployEnv, type RawEnv } from "../env";
import { REPORTING_ENDPOINTS, type CspSettings } from "./csp";

type Header = { key: string; value: string };
type HeaderRule = Awaited<ReturnType<NonNullable<NextConfig["headers"]>>>[number];

/** Two years (D137; hstspreload.org's minimum is one). `preload` is added at go-live, not before. */
export const HSTS = "max-age=63072000; includeSubDomains";

/**
 * Off for every feature the shop never uses; `payment` for the shop itself and Stripe's frames,
 * which the wallets (Apple Pay, Google Pay) need (D137). Every name is one Chromium knows, since
 * an unknown one prints a console warning on every page, which the suites' console checks fail on
 * (T106's first run: `bluetooth` is not one, "Unrecognized feature: 'bluetooth'").
 */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "hid=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  'payment=(self "https://js.stripe.com" "https://*.js.stripe.com")',
  "serial=()",
  "usb=()",
].join(", ");

/**
 * HSTS only on the production deployment named as such (D137: `DEPLOY_ENV=production`), not on
 * `NODE_ENV=production` alone: CI's `next start` and a PC's are production builds on plain http.
 * `deployEnv()` still decides first, so a Vercel preview with `DEPLOY_ENV=production` is staging,
 * and a mistyped `DEPLOY_ENV` fails the build.
 */
export function hstsEnabled(source: RawEnv): boolean {
  return deployEnv(source) === "production" && (source.DEPLOY_ENV ?? "").trim() === "production";
}

/** D137's headers, the same on every response; HSTS only on the production deployment. */
export function securityHeaders(options: { readonly production: boolean }): Header[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Beside the policy's `frame-ancestors 'self'`, for browsers that read only this one.
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "Reporting-Endpoints", value: REPORTING_ENDPOINTS },
    ...(options.production ? [{ key: "Strict-Transport-Security", value: HSTS }] : []),
  ];
}

/**
 * The paths the proxy's matcher skips that still get the static policy here (D138): the routes
 * under `/next` (the map, status, the report route itself), PostHog's `/ingest`, Sentry's
 * `/monitoring` (the design-system pages are the proxy's since T111, D148). `/admin` and
 * Payload's `/api` get the admin's policy instead (`ADMIN_POLICY_PATHS`, D141); `_next/` and the
 * files get none, since they are scripts, styles and pictures, not documents.
 */
export const HEADER_POLICY_PATHS: readonly string[] = [
  "/next/:path*",
  "/ingest/:path*",
  "/monitoring",
];

/**
 * Payload's admin and its REST and GraphQL API (D141): the admin's policy. The proxy's matcher
 * skips both (but for the first-user form and its endpoint, which it passes through or answers 403
 * without a policy of its own), so `headers()` is the only place either gets one. `/api` also holds
 * the shop's two route handlers (`/api/payment-return`, `/api/revalidate`), which answer redirects
 * and JSON, never a page of the shop.
 */
export const ADMIN_POLICY_PATHS: readonly string[] = ["/admin/:path*", "/api/:path*"];

/** Everything `headers()` returns besides `withPayload`'s own entry. */
export function securityHeaderRules(options: {
  readonly production: boolean;
  readonly csp: CspSettings;
}): HeaderRule[] {
  const policy = { key: options.csp.header, value: options.csp.policy };
  const admin = { key: options.csp.header, value: options.csp.adminPolicy };
  return [
    { source: "/:path*", headers: securityHeaders(options) },
    ...HEADER_POLICY_PATHS.map((source) => ({ source, headers: [policy] })),
    ...ADMIN_POLICY_PATHS.map((source) => ({ source, headers: [admin] })),
  ];
}

/** Where `withPayload`'s client-hint headers belong (D137): Payload's admin, nowhere else. */
export const PAYLOAD_HEADERS_SOURCE = "/admin/:path*";

const isPayloadsRule = (rule: HeaderRule): boolean =>
  rule.source === "/:path*" && rule.headers.some((header) => header.key === "Accept-CH");

/**
 * `withPayload` adds `Accept-CH`, `Critical-CH` and `Vary: Sec-CH-Prefers-Color-Scheme` on
 * `/:path*` (its admin's colour scheme). A `Vary` on every page splits the CDN's cache by a header
 * the shop never reads, so the entry's source becomes `/admin/:path*`. If a Payload release stops
 * adding the entry, `headers.test.ts` says so; one that adds it under another shape is left as it is.
 */
export function scopePayloadHeaders<C extends NextConfig>(config: C): C {
  const inner = config.headers;
  if (inner === undefined) return config;
  return {
    ...config,
    headers: async () =>
      (await inner()).map((rule) =>
        isPayloadsRule(rule) ? { ...rule, source: PAYLOAD_HEADERS_SOURCE } : rule,
      ),
  };
}
