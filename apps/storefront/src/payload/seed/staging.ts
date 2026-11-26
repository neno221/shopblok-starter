import { randomBytes } from "node:crypto";
import { deployEnv } from "../../lib/env";
import { emailTransport } from "../email";

/**
 * The decisions of the staging seed's Payload half (M7 D148, 5; `src/scripts/seed-staging.ts`), as
 * pure functions, so that "it refuses where it must, and prints no secret" is tested without a
 * database.
 */

/** `process.env`, or a test's stand-in. */
export type SeedEnv = Readonly<Record<string, string | undefined>>;

/** How long the first admin's reset link lasts: a build may finish hours before anyone reads it. */
export const RESET_LINK_HOURS = 72;

/** Why the seed must not run here, or `undefined` when it may. */
export function stagingPayloadSeedRefusal(env: SeedEnv): string | undefined {
  let stage: ReturnType<typeof deployEnv>;
  try {
    stage = deployEnv(env);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  if (stage === "production")
    return "seed-staging is staging's first deployment only (D148); production's first admin is GO-LIVE.md's (T117).";
  if (stage !== "staging")
    return "seed-staging runs on staging only (DEPLOY_ENV=staging); in development, `pnpm bootstrap` seeds and makes the admin.";
  // A preview shares staging's database (D132): only the Production build of `main` seeds it.
  if ((env.VERCEL_ENV ?? "").trim() === "preview")
    return "seed-staging runs in staging's Production build only, never in a preview's.";
  if (seedAdminEmail(env) === undefined)
    return "SEED_ADMIN_EMAIL is not an e-mail address, so there is nobody to send the first admin's reset e-mail to.";
  if ((env.PAYLOAD_API_KEY ?? "").trim() === "")
    return "PAYLOAD_API_KEY is not set, so the integrations user cannot be made (`pnpm staging:secrets` sets it).";
  // Without an adapter, Payload writes its e-mails to the log: the reset link, token and all.
  if (emailTransport(env).kind === "none")
    return "seed-staging needs RESEND_API_KEY and RESEND_FROM_EMAIL: without them the reset link, which carries its token, would be printed in the build log instead of e-mailed.";
  return undefined;
}

/** `SEED_ADMIN_EMAIL`, trimmed and lowercased, when it looks like an address. */
export function seedAdminEmail(env: SeedEnv): string | undefined {
  const email = (env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

/** A password nobody sees: the admin sets their own from the reset e-mail. */
export function unusablePassword(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The run's one result line, `{"seedStagingPayload":{…}}`: the steps' outcomes only. Never the
 * password, the reset token, the API key or the admin's address.
 */
export function stagingResultLine(result: {
  admin: "created" | "exists";
  integration: "created" | "unchanged" | "rekeyed";
  content: { created: number; updated: number; unchanged: number; kept: number };
}): string {
  return JSON.stringify({ seedStagingPayload: result });
}
