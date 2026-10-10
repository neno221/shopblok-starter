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
    // S1 may change these two (Cache Components x Payload admin).
    cacheComponents: process.env["S1_CC"] !== "off",
    partialPrefetching: process.env["S1_PARTIAL_PREFETCHING"] !== "off" && process.env["S1_CC"] !== "off",
    typedRoutes: true,
    poweredByHeader: false,
    experimental: {
      // The app has one root layout per market, so there is no single layout for a 404 page.
      globalNotFound: process.env["S1_CC"] !== "off",
      // S1 toggle: validate only the segments that opt in with `instant` (dev only).
      ...(process.env["S1_INSIGHTS"] === "manual"
        ? { instantInsights: { validationLevel: "manual-warning" as const } }
        : {}),
    },
    turbopack: { root: repoRoot },
    outputFileTracingRoot: repoRoot,
    // Medusa's image URLs point at localhost in development, which next/image refuses by default.
    images: { dangerouslyAllowLocalIP: phase === PHASE_DEVELOPMENT_SERVER },
  };
}

// `withPayload` takes the config object, so it wraps what the function returns for each phase.
export default function config(phase: string): NextConfig {
  return withPayload(buildConfig(phase), { devBundleServerPackages: false });
}
