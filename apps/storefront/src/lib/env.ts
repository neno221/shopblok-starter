// The one module that reads `process.env` (T12), besides `payload.config.ts` and `src/scripts/`.
// Nothing here is `server-only`: the proxy imports `env` and has no Payload, and a client module
// must not import it for a secret. Nothing is parsed when this file is imported, so `next build`
// works with no `.env` (CI has none); a value is checked where it is first needed. zod is loaded
// by the check, not by this file (see `medusaEnv`).

/** The variables the app reads. All optional here; `medusaEnv()` says which ones a caller needs. */
export type RawEnv = {
  NODE_ENV?: string | undefined;
  NEXT_PHASE?: string | undefined;
  NEXT_PUBLIC_BASE_URL?: string | undefined;
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?: string | undefined;
  MEDUSA_BACKEND_URL?: string | undefined;
  PAYLOAD_DATABASE_URL?: string | undefined;
  E2E_TEST_ROUTES?: string | undefined;
  DESIGN_SYSTEM_ENABLED?: string | undefined;
  REVALIDATE_SECRET?: string | undefined;
  STOREFRONT_PRERENDER_PRODUCTS?: string | undefined;
};

/**
 * A live view of the process environment: each property reads `process.env` when it is read, so a
 * test can change a value with `vi.stubEnv`, and `defaultAllowFallback(env)` sees `NEXT_PHASE` as it
 * is at the time of the call. Every name is a literal `process.env.NAME`: `next build` writes a
 * `NEXT_PUBLIC_*` value into the bundle only where it sees that exact expression, and it does not
 * replace a read through the `process.env` object (`{ ...process.env }` would find nothing in a
 * proxy or a browser bundle).
 */
export const env: RawEnv = {
  get NODE_ENV() {
    return process.env.NODE_ENV;
  },
  get NEXT_PHASE() {
    return process.env.NEXT_PHASE;
  },
  get NEXT_PUBLIC_BASE_URL() {
    return process.env.NEXT_PUBLIC_BASE_URL;
  },
  get NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  },
  get MEDUSA_BACKEND_URL() {
    return process.env.MEDUSA_BACKEND_URL;
  },
  get PAYLOAD_DATABASE_URL() {
    return process.env.PAYLOAD_DATABASE_URL;
  },
  get E2E_TEST_ROUTES() {
    return process.env.E2E_TEST_ROUTES;
  },
  get DESIGN_SYSTEM_ENABLED() {
    return process.env.DESIGN_SYSTEM_ENABLED;
  },
  get REVALIDATE_SECRET() {
    return process.env.REVALIDATE_SECRET;
  },
  get STOREFRONT_PRERENDER_PRODUCTS() {
    return process.env.STOREFRONT_PRERENDER_PRODUCTS;
  },
};

export function isProduction(source: RawEnv = env): boolean {
  return source.NODE_ENV === "production";
}

/**
 * The test-only routes under `/next/e2e` (ADR 0001's checks, plan T17 step 4) answer only when
 * this is exactly `true`. CI's `e2e-smoke` sets it on the server it starts; a deployment never
 * does, and both run a production build, so the gate is read at run time (see `lib/e2e/gate.ts`).
 */
export function e2eRoutesEnabled(source: RawEnv = env): boolean {
  return source.E2E_TEST_ROUTES === "true";
}

/**
 * The design-system pages (`/design-system/[locale]/…`, D33) exist in `next dev`, and in a
 * production build only when `DESIGN_SYSTEM_ENABLED` was exactly `true` while `next build` ran.
 * The value is frozen into the bundle by `next.config.ts` (`designSystemBuildFlag`), which makes
 * `process.env.DESIGN_SYSTEM_ENABLED` a constant at build time: the environment of `next start` is
 * never consulted. That matters because a build without the flag prerenders one param per route and
 * renders every other DS path on request (Cache Components allows no `dynamicParams = false`); a
 * runtime read there would let a server started with the flag answer 200 for those paths and 404
 * for the prerendered one. Reading it per request (as `e2eRoutesEnabled` does) would also make
 * every page dynamic under Cache Components. When it is false every DS route calls `notFound()`.
 * The Payload-login gate SPEC §9.6 asks for moves to M7.
 */
export function designSystemEnabled(source: RawEnv = env): boolean {
  return source.NODE_ENV === "development" || source.DESIGN_SYSTEM_ENABLED === "true";
}

/**
 * What `next.config.ts` writes into the bundle for `process.env.DESIGN_SYSTEM_ENABLED`: `"true"`
 * only for the exact value `true` while `next build` runs, `"false"` otherwise (the variable unset
 * included, so the build never leaves the read to run time).
 */
export function designSystemBuildFlag(source: RawEnv = env): "true" | "false" {
  return source.DESIGN_SYSTEM_ENABLED === "true" ? "true" : "false";
}

/** Where Medusa is, and the key that lets a storefront read its Store API. */
export type MedusaEnv = {
  backendUrl: string;
  publishableKey: string;
};

/** Where `pnpm dev` runs the backend (SPEC §5); used outside production only. */
export const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000";

/** Thrown with every problem found, so one start-up shows them all. */
export class EnvError extends Error {
  override name = "EnvError";
}

// A blank value in `.env` (`KEY=`) is "not set".
const blankIsUnset = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * The Medusa settings, checked. The backend URL defaults to the local one outside production and is
 * required in production, where a missing value would otherwise send the shop to a localhost.
 *
 * Async because zod is imported here, not at the top of the file: `env` is imported by the proxy,
 * which has no use for zod, and a static import would put its 100 KB (and about 45 ms of start-up
 * in Node) into the proxy's bundle on every cold start. A function that never runs there keeps it
 * out (T12 measured the bundle: 247 KB without, 353 KB with).
 */
export async function medusaEnv(source: RawEnv = env): Promise<MedusaEnv> {
  const { z } = await import("zod");
  const schema = z.object({
    MEDUSA_BACKEND_URL: z.preprocess(
      blankIsUnset,
      z
        .url({
          protocol: /^https?$/,
          error: "must be an http(s) URL such as http://localhost:9000",
        })
        .optional(),
    ),
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z.preprocess(
      blankIsUnset,
      z
        .string({
          error:
            "is empty. Run `pnpm bootstrap`, or copy the key that apps/backend/src/scripts/print-publishable-key.ts prints",
        })
        .trim()
        .startsWith("pk_", {
          error: "must be the publishable key's token (pk_…), not its id (apk_…)",
        }),
    ),
  });
  const parsed = schema.safeParse({
    MEDUSA_BACKEND_URL: source.MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: source.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
  const problems = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);
  const url = parsed.success ? parsed.data.MEDUSA_BACKEND_URL : undefined;
  if (parsed.success && url === undefined && isProduction(source)) {
    problems.push("MEDUSA_BACKEND_URL is required in production (https://api.example.com)");
  }
  if (!parsed.success || problems.length > 0) {
    throw new EnvError(`Medusa is not configured:\n- ${problems.join("\n- ")}`);
  }
  return {
    backendUrl: url ?? DEFAULT_MEDUSA_BACKEND_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  };
}
