import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { designSystemBuildFlag } from "./src/lib/env";

// The repo root. The shared packages are linked from `packages/*` and Next compiles their source
// (D3), so Turbopack and the file tracing must see outside this folder. The Payload templates point
// `turbopack.root` at the app, which is wrong for a monorepo.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function buildConfig(phase: string): NextConfig {
  return {
    // Both stay on; ADR 0001 says why and what the Payload admin's dev console shows.
    cacheComponents: true,
    partialPrefetching: true,
    typedRoutes: true,
    poweredByHeader: false,
    experimental: {
      // The app has one root layout per market, so there is no single layout for a 404 page.
      globalNotFound: true,
    },
    // D33: the design-system flag is read when `next build` runs. `env` replaces every
    // `process.env.DESIGN_SYSTEM_ENABLED` in the bundles with this string, so `next start` never
    // reads it. Without this, a build without the flag would still prerender one DS path and render
    // the others on request, reading the runtime environment (`dynamicParams = false` is a build
    // error under Cache Components). It is always `"true"` or `"false"`, never undefined.
    env: { DESIGN_SYSTEM_ENABLED: designSystemBuildFlag() },
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
      beforeFiles: [],
      afterFiles: [
        {
          source: "/:file([^/]*\\.(?![Rr][Ss][Cc]$)[A-Za-z][A-Za-z0-9]*)",
          destination: "/next/missing-file",
        },
      ],
      fallback: [],
    }),
    // Medusa's image URLs point at localhost in development, which next/image refuses by default.
    images: { dangerouslyAllowLocalIP: phase === PHASE_DEVELOPMENT_SERVER },
  };
}

// `withPayload` takes the config object, so it wraps what the function returns for each phase.
export default function config(phase: string): NextConfig {
  return withPayload(buildConfig(phase), { devBundleServerPackages: false });
}
