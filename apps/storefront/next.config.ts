import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { buildWorkers } from "./src/lib/build-workers";
import { deploymentBaseUrl, designSystemBuildFlag } from "./src/lib/env";
import { mediaRemotePatterns } from "./src/lib/media-host";
import { cspSettings } from "./src/lib/security/csp";
import {
  hstsEnabled,
  noindexEnabled,
  scopePayloadHeaders,
  securityHeaderRules,
} from "./src/lib/security/headers";
import { POSTHOG_EU } from "./src/lib/site";

// The repo root. The shared packages are linked from `packages/*` and Next compiles their source
// (D3), so Turbopack and the file tracing must see outside this folder. The Payload templates point
// `turbopack.root` at the app, which is wrong for a monorepo.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function buildConfig(phase: string): NextConfig {
  // M7 D138 (T106): the static policy, computed once from the build's environment; `headers()`
  // sends it on the paths the proxy skips, and `env` writes it into the proxy's bundle.
  const csp = cspSettings(process.env, phase === PHASE_DEVELOPMENT_SERVER);
  return {
    // Both stay on; ADR 0001 says why and what the Payload admin's dev console shows.
    cacheComponents: true,
    partialPrefetching: true,
    typedRoutes: true,
    poweredByHeader: false,
    // T97 (M6 D124): Next's own trailing-slash redirect would answer `posthog-js`'s `/ingest/e/`
    // with a 308 before the `/ingest` rewrite (checked on `next start`). It is off, and the proxy
    // makes the same redirect for every other path (`src/proxy.ts`, its matcher's second entry), so
    // `/us/` and `/admin/` still lose their slash and only `/ingest/…` keeps it.
    skipTrailingSlashRedirect: true,
    experimental: {
      // The app has one root layout per market, so there is no single layout for a 404 page.
      globalNotFound: true,
      // M7 T109 (SPEC §11.1): React's taint API, wired to the server's secrets and the customer
      // object (`lib/security/taint.ts`), and off. Next turns it on only with its React
      // experimental build, for the server and the browser alike: checked here, it throws on a
      // leaked secret or customer and sends nothing, but every first load grows by 6.5 KB gzipped,
      // over the product page's and the listings' budgets. SETUP.md "Payment secrets, the consent
      // record and MFA (T109)" has the numbers; `true` here is the whole switch.
      taint: false,
      // W6 item 7: at most `BUILD_WORKERS_CAP` (3) static-generation workers (or
      // `STOREFRONT_BUILD_WORKERS`), so a PC with many threads builds against a running stack
      // without running Postgres out of connections or Medusa out of time (src/lib/build-workers.ts).
      ...(phase === PHASE_PRODUCTION_BUILD ? { cpus: buildWorkers(availableParallelism()) } : {}),
    },
    // D33: the design-system flag is read when `next build` runs. `env` replaces every
    // `process.env.DESIGN_SYSTEM_ENABLED` in the bundles with this string, so `next start` never
    // reads it. Without this, a build without the flag would still prerender one DS path and render
    // the others on request, reading the runtime environment (`dynamicParams = false` is a build
    // error under Cache Components). It is always `"true"` or `"false"`, never undefined.
    //
    // T96 (M6 D125): Sentry's environment, release (the commit) and traces' rate, written into the
    // server's and the browser's bundles alike, so both report the same; blank without them.
    //
    // M7 D136 (T114): on Vercel without `NEXT_PUBLIC_BASE_URL`, the deployment's own address
    // (`deploymentBaseUrl`: a preview's branch domain, Production's domain), written in as
    // `NEXT_PUBLIC_BASE_URL` so that Payload's `serverURL` and CSRF list, the canonical URLs and the
    // proxy's own reads all name the address the browser is on.
    //
    // M7 D138 (T106): the static policy's header and value, which the proxy sends
    // (`lib/security/static-csp.ts`); computed above, so the two places cannot differ. M7 D139
    // (T107): the nonce policy's template beside it, which the proxy fills in per request.
    env: {
      DESIGN_SYSTEM_ENABLED: designSystemBuildFlag(),
      ...sentryBuildEnv(process.env),
      ...baseUrlBuildEnv(),
      SHOPBLOK_CSP_HEADER: csp.header,
      SHOPBLOK_CSP_POLICY: csp.policy,
      SHOPBLOK_CSP_NONCE_POLICY: csp.noncePolicy,
    },
    // M7 D137 (T106): the headers on every response, HSTS only with `DEPLOY_ENV=production`
    // (`hstsEnabled`, after `deployEnv()`'s checks, D133), and the static policy on the paths the proxy's matcher skips
    // (`lib/security/headers.ts`). `withPayload` adds its own entry after these, which
    // `scopePayloadHeaders` (below) moves to `/admin`.
    // M7 D133 (T110): `X-Robots-Tag: noindex` on every response of staging (`noindexEnabled`).
    headers: async () =>
      securityHeaderRules({
        production: hstsEnabled(process.env),
        noindex: noindexEnabled(process.env),
        csp,
      }),
    turbopack: { root: repoRoot },
    outputFileTracingRoot: repoRoot,
    // `/design-system` has no page of its own; the locale is a path segment (D33). Not permanent: the
    // locale it lands on is a choice that may change. With the pages gated off the target answers 404.
    redirects: async () => [
      {
        source: "/design-system",
        destination: "/design-system/en",
        permanent: false,
      },
    ],
    // D54 (T28): a root path that looks like a file answers a plain-text 404 instead of reaching
    // `[market]`. `afterFiles` rewrites run after `public/` files and the routes without a dynamic
    // segment, so `/favicon.ico` (a file route) and M7's `robots.ts` and `sitemap.ts` still win, and
    // before the dynamic ones, `[market]` among them. The pattern is the proxy matcher's file rule
    // (a last segment ending in `.` and a letter; `/size-8.5` is a slug) on one segment only:
    // `/us/robots.txt` is a market's path, and the page behind it decides. The proxy never sees
    // these paths, because its matcher skips files. The destination has to be a route: a rewrite
    // that resolves to nothing falls through to the dynamic routes, `[market]` again. `.rsc` is left
    // out (PR 50 review): a deployment adapter can address a dynamic page's RSC payload as
    // `/us.rsc`, and that must still reach `[market]`.
    rewrites: async () => ({
      beforeFiles: posthogRewrites(process.env),
      afterFiles: [
        {
          source: "/:file([^/]*\\.(?![Rr][Ss][Cc]$)[A-Za-z][A-Za-z0-9]*)",
          // M7 D147 (T110): the file's name goes along for a host that hands the route the rewritten URL
          // (`next start` hands it the visitor's own, `missing-file/route.ts`).
          destination: "/next/missing-file?file=:file",
        },
      ],
      fallback: [],
    }),
    // Medusa's image URLs point at localhost in development, which next/image refuses by default.
    // M6 D127 (T95): with R2, pictures come from `S3_PUBLIC_URL`'s host (`src/lib/media-host.ts`).
    images: {
      dangerouslyAllowLocalIP: phase === PHASE_DEVELOPMENT_SERVER,
      remotePatterns: mediaRemotePatterns(process.env),
    },
  };
}

// D62: next-intl's plugin points `next-intl/config` at the request configuration, which reads the
// `[market]` root param (`src/i18n/request.ts`). The path is relative to this folder, which is where
// `next build` and `next dev` run; Turbopack refuses an absolute one.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * M6 D124 (T97): PostHog behind the site's own `/ingest`, so the browser talks to this origin only
 * (PostHog's Next.js guide): `/ingest/static/*` to the region's assets host, the rest to its ingest
 * host (`NEXT_PUBLIC_POSTHOG_HOST`, the EU's when blank). In `beforeFiles`, ahead of every page,
 * `[market]` among them; the proxy's matcher skips `/ingest`. Only in a build with
 * `NEXT_PUBLIC_POSTHOG_KEY`: without it `/ingest` is no route and nothing goes to PostHog.
 */
export function posthogRewrites(source: Record<string, string | undefined>) {
  if (!source.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return [];
  const host = (source.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_EU).replace(/\/+$/, "");
  const assets = host.replace(
    /^https:\/\/(eu|us)\.i\.posthog\.com$/,
    "https://$1-assets.i.posthog.com",
  );
  return [
    { source: "/ingest/static/:path*", destination: `${assets}/static/:path*` },
    { source: "/ingest/:path*", destination: `${host}/:path*` },
  ];
}

/**
 * T96 (M6 D125): the values `lib/sentry/options.ts` reads, fixed at build. The release is
 * `SENTRY_RELEASE`, else the commit Vercel or GitHub Actions builds.
 */
export function sentryBuildEnv(source: NodeJS.ProcessEnv): Record<string, string> {
  return {
    SENTRY_ENVIRONMENT: source.SENTRY_ENVIRONMENT?.trim() ?? "",
    SENTRY_RELEASE:
      source.SENTRY_RELEASE?.trim() ||
      source.VERCEL_GIT_COMMIT_SHA?.trim() ||
      source.GITHUB_SHA?.trim() ||
      "",
    SENTRY_TRACES_SAMPLE_RATE: source.SENTRY_TRACES_SAMPLE_RATE?.trim() ?? "",
  };
}

/**
 * T96 (M6 D125): Sentry's build step, outermost, only for a build with `NEXT_PUBLIC_SENTRY_DSN`; a
 * build without one is exactly what it was before M6. It uploads the source maps only with
 * `SENTRY_AUTH_TOKEN` (and `SENTRY_ORG`, `SENTRY_PROJECT`), and deletes them after, so the site
 * never serves them. The rest is off: no route manifest in the browser's bundle (D129's first load),
 * no build-time instrumentation of server packages (the shop traces nothing by default), no
 * telemetry to Sentry about the build. The tunnel is the shop's own route (`app/monitoring`), not
 * the SDK's rewrite.
 */
export function withSentry<C>(nextConfig: C, source: NodeJS.ProcessEnv): C {
  if (!source.NEXT_PUBLIC_SENTRY_DSN?.trim()) return nextConfig;
  const authToken = source.SENTRY_AUTH_TOKEN?.trim() || undefined;
  return withSentryConfig(nextConfig, {
    org: source.SENTRY_ORG?.trim() || undefined,
    project: source.SENTRY_PROJECT?.trim() || undefined,
    authToken,
    silent: true,
    telemetry: false,
    sourcemaps: { disable: authToken === undefined, deleteSourcemapsAfterUpload: true },
    useRunAfterProductionCompileHook: authToken !== undefined,
    routeManifestInjection: false,
    buildTimeInstrumentation: false,
  });
}

// `withPayload` takes the config object, so it wraps what the function returns for each phase.
export default function config(phase: string): NextConfig {
  return withSentry(
    withNextIntl(
      scopePayloadHeaders(withPayload(buildConfig(phase), { devBundleServerPackages: false })),
    ),
    process.env,
  );
}

/** `NEXT_PUBLIC_BASE_URL` for the bundle when a deployment's address stands in for it (M7 D136). */
function baseUrlBuildEnv(): { NEXT_PUBLIC_BASE_URL?: string } {
  const base = deploymentBaseUrl();
  return base === undefined ? {} : { NEXT_PUBLIC_BASE_URL: base };
}
