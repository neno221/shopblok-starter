import type { Env } from "./modules";

/** The two deployments `DEPLOY_ENV` names (M7 D133). Unset in development, tests and CI. */
export type DeployEnv = "staging" | "production";

/**
 * Which deployment this backend is (M7 D133), or `undefined` for none (development, tests, CI). The
 * twin of the storefront's `deployEnv()` (`apps/storefront/src/lib/env.ts`) and of `doctor`'s
 * `productionStage` (`scripts/lib/doctor-checks.ts`), in the same fixed order:
 *
 * 1. `VERCEL_ENV=preview` is always staging (the backend never runs on Vercel, but the three agree
 *    on every input, and a preview's `DEPLOY_ENV=production` must never count);
 * 2. then `DEPLOY_ENV`, `staging` or `production`; any other value throws, so a typo stops the
 *    start instead of opening a live key or the demo (`buildConfig` calls this once at start);
 * 3. then the rule before M7: `VERCEL_ENV=production` where `VERCEL_ENV` is set, else
 *    `NODE_ENV=production`.
 *
 * Staging runs on Railway with `NODE_ENV=production`, so only `DEPLOY_ENV=staging` tells it from
 * the live shop.
 */
export function deployEnv(env: Env): DeployEnv | undefined {
  const vercelEnv = (env.VERCEL_ENV ?? "").trim();
  if (vercelEnv === "preview") return "staging";
  const named = (env.DEPLOY_ENV ?? "").trim();
  if (named === "staging" || named === "production") return named;
  if (named !== "")
    throw new Error(
      `DEPLOY_ENV must be staging or production, or unset outside a deployment (it is "${named}").`,
    );
  if (vercelEnv !== "") return vercelEnv === "production" ? "production" : undefined;
  return (env.NODE_ENV ?? "").trim() === "production" ? "production" : undefined;
}
