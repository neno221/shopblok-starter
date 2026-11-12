// The keyless check's rule (M6 D114, T93): which of the browser's requests go to a third party that
// an M6 integration talks to. Pure, so Vitest tests it (`third-party-hosts.test.ts`); the Playwright
// fixture that applies it is `third-party.ts`.
//
// Without keys the shop must run exactly as at M5's end, so a keyless suite (e2e-smoke's) that sees
// one of these requests has found an integration whose code loads without its keys. The hosts are
// the services' own; the two paths are the site's same-origin tunnels (Sentry's `/monitoring`, D125,
// and PostHog's `/ingest`, D124), which a host list alone would miss, since they go to the shop's
// own origin and the server passes them on.

/** A host, and every host below it (`stripe.com` covers `js.stripe.com` and `api.stripe.com`). */
export const THIRD_PARTY_DOMAINS: readonly string[] = [
  // Stripe: Stripe.js and the Elements' iframes (`js.stripe.com`), the API, `m.stripe.network`.
  "stripe.com",
  "stripe.network",
  // Resend's API (the browser never calls it; a request would be a key in the page).
  "api.resend.com",
  // Sentry's ingest (`o….ingest.de.sentry.io`) and its CDN.
  "sentry.io",
  "sentry-cdn.com",
  // PostHog's EU and US hosts and their assets (`eu.i.posthog.com`, `eu-assets.i.posthog.com`).
  "posthog.com",
  // Cloudflare R2's S3 endpoint and its public development URLs.
  "r2.cloudflarestorage.com",
  "r2.dev",
];

/** The site's own tunnels to Sentry and PostHog: these paths and everything below them. */
export const SAME_ORIGIN_TUNNELS: readonly string[] = ["/monitoring", "/ingest"];

const under = (host: string, domain: string): boolean =>
  host === domain || host.endsWith(`.${domain}`);

const below = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Why `url` counts as a request to a third party, or `undefined` when it does not. `siteOrigin` is
 * the storefront's origin (the suites' `baseURL`): only there do the tunnels count.
 */
export function thirdPartyReason(url: string, siteOrigin: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.protocol !== "wss:") {
    return undefined;
  }
  const host = parsed.hostname.toLowerCase();
  const domain = THIRD_PARTY_DOMAINS.find((d) => under(host, d));
  if (domain !== undefined) return `a third-party host (${domain})`;
  let site: URL | undefined;
  try {
    site = new URL(siteOrigin);
  } catch {
    site = undefined;
  }
  if (site !== undefined && parsed.origin === site.origin) {
    const tunnel = SAME_ORIGIN_TUNNELS.find((p) => below(parsed.pathname, p));
    if (tunnel !== undefined) return `the site's ${tunnel} tunnel`;
  }
  return undefined;
}

/**
 * How a request is named in the failure: its method, origin and path, never its query or body, which
 * could carry a token (a verification code, a client secret).
 */
export function describeRequest(method: string, url: string): string {
  try {
    const parsed = new URL(url);
    return `${method} ${parsed.origin}${parsed.pathname}`;
  } catch {
    return `${method} (an unreadable URL)`;
  }
}
