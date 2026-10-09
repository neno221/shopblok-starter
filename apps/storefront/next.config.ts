import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// The repo root. The shared packages are linked from `packages/*` and Next compiles their source
// (D3), so Turbopack and the file tracing must see outside this folder. The Payload templates point
// `turbopack.root` at the app, which is wrong for a monorepo.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default function config(phase: string): NextConfig {
  return {
    // S1 may change these two (Cache Components x Payload admin).
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
    // Medusa's image URLs point at localhost in development, which next/image refuses by default.
    images: { dangerouslyAllowLocalIP: phase === PHASE_DEVELOPMENT_SERVER },
  };
}
