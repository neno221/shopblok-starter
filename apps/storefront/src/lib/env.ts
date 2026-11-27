// The one module that reads `process.env` (T12), besides `payload.config.ts` and `src/scripts/`, and
// Sentry's build-time values (T96: `NEXT_PUBLIC_SENTRY_DSN` and what `next.config.ts` inlines), which
// `lib/sentry/`, `instrumentation*.ts` and the tunnel read as literals so that a build without a DSN
// drops their code (a getter here would keep it).
// Nothing here is `server-only`: the proxy imports `env` and has no Payload, and a client module
// must not import it for a secret. Nothing is parsed when this file is imported, so `next build`
// works with no `.env` (CI has none); a value is checked where it is first needed. zod is loaded
// by the check, not by this file (see `medusaEnv`).
//
// M7's names (T105) are read here too, before the tasks that use them exist: `DEPLOY_ENV` (D133,
// `deployEnv()`), `STOREFRONT_SIGNING_SECRET` (D142), `SHOPBLOK_SECRET_FINGERPRINTS` (D134),
// `SEED_ADMIN_EMAIL` and `SEED_ON_BUILD` (D136), `CSP_MODE` (D138), Turnstile's two keys (D143) and
// `S3_PRIVATE_BUCKET` (D146). The files that read `process.env` themselves today keep doing so:
// `payload.config.ts` and `src/payload/` (Payload's own config, R2 and the e-mails),
// `src/scripts/`, Sentry's literals (above) and `next.config.ts`; moving them is not T105's.

// M7 T109 (SPEC §11.1): each server-only secret is tainted where it is read, so rendering it into a
// Client Component throws (`lib/security/taint.ts`; nothing happens outside React's server).
import { taintSecret } from "./security/taint";

/** The variables the app reads. All optional here; `medusaEnv()` says which ones a caller needs. */
export type RawEnv = {
  NODE_ENV?: string | undefined;
  /** `staging` or `production` on a deployment, unset elsewhere (M7 D133; `deployEnv()`). */
  DEPLOY_ENV?: string | undefined;
  /** Vercel's own: `production`, `preview` or `development` on Vercel, unset elsewhere. */
  VERCEL_ENV?: string | undefined;
  NEXT_PHASE?: string | undefined;
  NEXT_PUBLIC_BASE_URL?: string | undefined;
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?: string | undefined;
  MEDUSA_BACKEND_URL?: string | undefined;
  PAYLOAD_DATABASE_URL?: string | undefined;
  E2E_TEST_ROUTES?: string | undefined;
  DESIGN_SYSTEM_ENABLED?: string | undefined;
  REVALIDATE_SECRET?: string | undefined;
  PAYLOAD_SECRET?: string | undefined;
  PREVIEW_SECRET?: string | undefined;
  CRON_SECRET?: string | undefined;
  STOREFRONT_PRERENDER_PRODUCTS?: string | undefined;
  STOREFRONT_LISTING_PAGE_SIZE?: string | undefined;
  STOREFRONT_BUILD_WORKERS?: string | undefined;
  /** Signs the calls to Medusa's rate-limit route and the visitor's address (M7 D142, T108). */
  STOREFRONT_SIGNING_SECRET?: string | undefined;
  /** Written only by `pnpm staging:secrets` (M7 D134, T114): the secrets' fingerprints. */
  SHOPBLOK_SECRET_FINGERPRINTS?: string | undefined;
  /** Staging's first deployment only (M7 D136, T111): the staff account the seed invites. */
  SEED_ADMIN_EMAIL?: string | undefined;
  /** Staging's first deployment only (M7 D136, T111): `payload` seeds Payload during the build. */
  SEED_ON_BUILD?: string | undefined;
  /** The CSP's mode (M7 D138, T106): `enforce` (the default) or `report-only`. */
  CSP_MODE?: string | undefined;
  /**
   * The static policy's header name and value (M7 D138, T106), which `next.config.ts` computes from
   * `CSP_MODE` and the build's keys and writes into the bundles; the proxy reads them
   * (`lib/security/static-csp.ts`). Never set by hand.
   */
  SHOPBLOK_CSP_HEADER?: string | undefined;
  SHOPBLOK_CSP_POLICY?: string | undefined;
  /** The nonce policy's template (M7 D139, T107), written in the same way. Never set by hand. */
  SHOPBLOK_CSP_NONCE_POLICY?: string | undefined;
  /** Turnstile (M7 D143, T108): both or neither. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string | undefined;
  TURNSTILE_SECRET_KEY?: string | undefined;
  /** R2's private bucket, for Payload's CSV exports and imports (M7 D146, T111). */
  S3_PRIVATE_BUCKET?: string | undefined;
  /** Vercel's own (M7 D136, T114): the shortest Production domain, without a scheme. */
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
  /** Vercel's own: a preview's branch domain (stable across its commits), without a scheme. */
  VERCEL_BRANCH_URL?: string | undefined;
  /** Vercel's own: this deployment's own domain, without a scheme. */
  VERCEL_URL?: string | undefined;
  /** Vercel's own, with "Protection Bypass for Automation" on: lets a request past protection. */
  VERCEL_AUTOMATION_BYPASS_SECRET?: string | undefined;
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
  get DEPLOY_ENV() {
    return process.env.DEPLOY_ENV;
  },
  get VERCEL_ENV() {
    return process.env.VERCEL_ENV;
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
    return taintSecret("PAYLOAD_DATABASE_URL", process.env.PAYLOAD_DATABASE_URL);
  },
  get E2E_TEST_ROUTES() {
    return process.env.E2E_TEST_ROUTES;
  },
  get DESIGN_SYSTEM_ENABLED() {
    return process.env.DESIGN_SYSTEM_ENABLED;
  },
  get REVALIDATE_SECRET() {
    return taintSecret("REVALIDATE_SECRET", process.env.REVALIDATE_SECRET);
  },
  get PAYLOAD_SECRET() {
    return taintSecret("PAYLOAD_SECRET", process.env.PAYLOAD_SECRET);
  },
  get PREVIEW_SECRET() {
    return taintSecret("PREVIEW_SECRET", process.env.PREVIEW_SECRET);
  },
  get CRON_SECRET() {
    return taintSecret("CRON_SECRET", process.env.CRON_SECRET);
  },
  get STOREFRONT_PRERENDER_PRODUCTS() {
    return process.env.STOREFRONT_PRERENDER_PRODUCTS;
  },
  get STOREFRONT_LISTING_PAGE_SIZE() {
    return process.env.STOREFRONT_LISTING_PAGE_SIZE;
  },
  get STOREFRONT_BUILD_WORKERS() {
    return process.env.STOREFRONT_BUILD_WORKERS;
  },
  get STOREFRONT_SIGNING_SECRET() {
    return taintSecret("STOREFRONT_SIGNING_SECRET", process.env.STOREFRONT_SIGNING_SECRET);
  },
  get SHOPBLOK_SECRET_FINGERPRINTS() {
    return process.env.SHOPBLOK_SECRET_FINGERPRINTS;
  },
  get SEED_ADMIN_EMAIL() {
    return process.env.SEED_ADMIN_EMAIL;
  },
  get SEED_ON_BUILD() {
    return process.env.SEED_ON_BUILD;
  },
  get CSP_MODE() {
    return process.env.CSP_MODE;
  },
  get SHOPBLOK_CSP_HEADER() {
    return process.env.SHOPBLOK_CSP_HEADER;
  },
  get SHOPBLOK_CSP_POLICY() {
    return process.env.SHOPBLOK_CSP_POLICY;
  },
  get SHOPBLOK_CSP_NONCE_POLICY() {
    return process.env.SHOPBLOK_CSP_NONCE_POLICY;
  },
  get NEXT_PUBLIC_TURNSTILE_SITE_KEY() {
    return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  },
  get TURNSTILE_SECRET_KEY() {
    return taintSecret("TURNSTILE_SECRET_KEY", process.env.TURNSTILE_SECRET_KEY);
  },
  get S3_PRIVATE_BUCKET() {
    return process.env.S3_PRIVATE_BUCKET;
  },
  get VERCEL_PROJECT_PRODUCTION_URL() {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  },
  get VERCEL_BRANCH_URL() {
    return process.env.VERCEL_BRANCH_URL;
  },
  get VERCEL_URL() {
    return process.env.VERCEL_URL;
  },
  get VERCEL_AUTOMATION_BYPASS_SECRET() {
    return taintSecret(
      "VERCEL_AUTOMATION_BYPASS_SECRET",
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    );
  },
};

export function isProduction(source: RawEnv = env): boolean {
  return source.NODE_ENV === "production";
}

/** The two deployments `DEPLOY_ENV` names (M7 D133). */
export type DeployEnv = "staging" | "production";

/**
 * Which deployment this is (M7 D133), or `undefined` for none (development, tests, CI). The order
 * is fixed, and `doctor` (`productionStage`) and the backend (`src/config/deploy-env.ts`) follow
 * the same one:
 *
 * 1. `VERCEL_ENV=preview` is always staging: a `DEPLOY_ENV=production` set for every Vercel
 *    environment by mistake never makes a preview production;
 * 2. then `DEPLOY_ENV`, `staging` or `production`; any other value throws an `EnvError` (a typo
 *    must not open robots or let a live key through), which `doctor` reports first;
 * 3. then the rule before M7: `VERCEL_ENV=production` on Vercel, else `NODE_ENV=production`.
 *
 * Staging runs as Vercel's Production deployment of `main` (D132), so without `DEPLOY_ENV=staging`
 * it would count as production here.
 */
export function deployEnv(source: RawEnv = env): DeployEnv | undefined {
  const vercelEnv = (source.VERCEL_ENV ?? "").trim();
  if (vercelEnv === "preview") return "staging";
  const named = (source.DEPLOY_ENV ?? "").trim();
  if (named === "staging" || named === "production") return named;
  if (named !== "")
    throw new EnvError(
      `DEPLOY_ENV must be staging or production, or unset outside a deployment (it is "${named}")`,
    );
  if (vercelEnv !== "") return vercelEnv === "production" ? "production" : undefined;
  return isProduction(source) ? "production" : undefined;
}

/**
 * The site's address on a deployment (M7 D136, T114): `NEXT_PUBLIC_BASE_URL` when it is set, and on
 * Vercel without it, the address Vercel gives the deployment: a preview's branch domain
 * (`VERCEL_BRANCH_URL`, which stays the same across a branch's commits, else the deployment's own
 * `VERCEL_URL`), and Production's shortest domain (`VERCEL_PROJECT_PRODUCTION_URL`). `undefined`
 * elsewhere, where `siteOrigin()` falls back to the local one. `next.config.ts` writes the answer
 * into the bundle as `NEXT_PUBLIC_BASE_URL` (the canonical URLs, Payload's `serverURL` and its CSRF
 * list), and `payload migrate` and `payload run` outside Next read it from here.
 *
 * Set `NEXT_PUBLIC_BASE_URL` on Production once the shop has a domain of its own: Vercel's
 * shortest domain may be another one than the shop's.
 */
export function deploymentBaseUrl(source: RawEnv = env): string | undefined {
  const explicit = (source.NEXT_PUBLIC_BASE_URL ?? "").trim();
  if (explicit !== "") return explicit;
  const vercelEnv = (source.VERCEL_ENV ?? "").trim();
  const host = (value: string | undefined) => {
    const trimmed = (value ?? "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    return trimmed === "" ? undefined : `https://${trimmed}`;
  };
  if (vercelEnv === "production") return host(source.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelEnv === "preview") return host(source.VERCEL_BRANCH_URL) ?? host(source.VERCEL_URL);
  return undefined;
}

/**
 * The origins one deployment answers on, beyond `siteOrigin()` (PR 149's review, item 6): on a
 * preview, its own deployment address (`VERCEL_URL`, which Vercel's dashboard links) and its
 * branch's (`VERCEL_BRANCH_URL`), so Payload's CSRF and CORS lists accept the admin opened at
 * either. Empty elsewhere: Production answers on its domain.
 */
export function previewOrigins(source: RawEnv = env): string[] {
  if ((source.VERCEL_ENV ?? "").trim() !== "preview") return [];
  return [source.VERCEL_URL, source.VERCEL_BRANCH_URL].flatMap((value) => {
    const host = (value ?? "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    return host === "" ? [] : [`https://${host}`];
  });
}

/**
 * The header that lets the app's own requests to itself past Vercel's Deployment Protection (M7
 * D136): the proxy reads `/next/markets` and `/next/redirects` from its own origin, which a
 * protected preview would otherwise answer with Vercel's login page. Empty without the secret
 * (development, CI, an unprotected deployment). Never sent anywhere but this app's own origin.
 */
export function protectionBypassHeaders(source: RawEnv = env): Record<string, string> {
  const secret = (source.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
  return secret === "" ? {} : { "x-vercel-protection-bypass": secret };
}

/**
 * Payload's first-user form (`/admin/create-first-user`) and its endpoint
 * (`/api/users/first-register`) are closed on every deployment (M7 D136, 6): with `DEPLOY_ENV` or
 * `VERCEL_ENV` set, an empty `users` table must not let the first visitor become an admin. The
 * staging seed makes the first admin instead (`src/scripts/seed-staging.ts`).
 */
export function firstUserClosed(source: RawEnv = env): boolean {
  return (source.DEPLOY_ENV ?? "").trim() !== "" || (source.VERCEL_ENV ?? "").trim() !== "";
}

/**
 * The test-only routes under `/next/e2e` (ADR 0001's checks, plan T17 step 4) answer only when
 * this is exactly `true`. CI's `e2e-smoke` sets it on the server it starts; a deployment never
 * does, and both run a production build, so the gate is read at run time (see `lib/e2e/gate.ts`).
 * Never on a production deployment by name (M0's F6, M7 D133: `DEPLOY_ENV=production` or
 * `VERCEL_ENV=production`, staging's Vercel deployment included, unless it is a preview), whatever
 * `E2E_TEST_ROUTES` says; `doctor` calls that an error. A Vercel preview may open them (T116).
 */
export function e2eRoutesEnabled(source: RawEnv = env): boolean {
  if (source.E2E_TEST_ROUTES !== "true") return false;
  const vercelEnv = (source.VERCEL_ENV ?? "").trim();
  if (vercelEnv === "preview") return true;
  if (vercelEnv === "production") return false;
  // Fails closed (PR 147 review, item 3): a `DEPLOY_ENV` other than `staging` (`production`, or a
  // typo such as `Production`, which `deployEnv()` would refuse) keeps the routes shut. Not
  // `deployEnv()` itself: CI's `next start` has `NODE_ENV=production` and no `DEPLOY_ENV`.
  const named = (source.DEPLOY_ENV ?? "").trim();
  return named === "" || named === "staging";
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
 * On a deployment the pages a build has are also behind Payload's staff login (M7 D148, 4; T111):
 * `designSystemGated` below, checked per request in `proxy.ts`, so the pages stay prerendered.
 */
export function designSystemEnabled(source: RawEnv = env): boolean {
  return source.NODE_ENV === "development" || source.DESIGN_SYSTEM_ENABLED === "true";
}

/**
 * Whether the design-system pages answer only to a signed-in staff member (M7 D148, 4; T111): on
 * every deployment, as `firstUserClosed` names one (`DEPLOY_ENV` or `VERCEL_ENV` set, whatever
 * their value, so a typo keeps the gate shut), and never in `next dev`. Read at run time by
 * `proxy.ts`, which checks Payload's `payload-token` cookie without Payload
 * (`lib/security/payload-token.ts`) and answers 404 to anyone else. CI's `next start` has neither
 * variable, so its DS checks run without a sign-in; `e2e/ds-gate.spec.ts` starts one with
 * `DEPLOY_ENV=staging`.
 */
export function designSystemGated(source: RawEnv = env): boolean {
  return source.NODE_ENV !== "development" && firstUserClosed(source);
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
