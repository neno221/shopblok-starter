import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

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
    // Medusa's image URLs point at localhost in development, which next/image refuses by default.
    images: { dangerouslyAllowLocalIP: phase === PHASE_DEVELOPMENT_SERVER },
  };
}

// `withPayload` takes the config object, so it wraps what the function returns for each phase.
export default function config(phase: string): NextConfig {
  return withPayload(buildConfig(phase), { devBundleServerPackages: false });
}
