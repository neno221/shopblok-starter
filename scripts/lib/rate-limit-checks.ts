// M7 T108: what `doctor` says about the rate limits (D142) and Turnstile (D143), as pure functions:
// the env and Cloudflare's answer come in, `Check`s come out. Never prints a key.
import type { AppEnvs, AppName } from "@shopblok/integrations";
import { describeUnreachable, jsonOf, type HttpResult } from "./http.ts";
import type { Check } from "./report.ts";

const SIGNING = { id: "storefront-signing", title: "Rate limits' signed address" } as const;
const TURNSTILE_KEYS = { id: "turnstile-keys", title: "Turnstile keys" } as const;
const TURNSTILE_ONLINE = { id: "turnstile-secret", title: "Cloudflare accepts Turnstile's secret" } as const;

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare's published test keys (Turnstile's "Testing" page): a site key `1x…AA`, `2x…AB`,
 * `3x…FF` and the like, a secret key `1x…AA`, `2x…AA`, `3x…AA`. They are public: a challenge with
 * one always passes or always fails, whoever answers it.
 */
export const TURNSTILE_TEST_KEY = /^[1-3]x0{20,}[A-F]{2}$/;

/**
 * `STOREFRONT_SIGNING_SECRET` (D142) in each app the run looks at. Without it the storefront's
 * calls to Medusa go unsigned, so Medusa counts every visitor on the storefront's own address
 * (one bucket for the whole shop), and it refuses `POST /shopblok/rate-limit`, so the forms', the
 * newsletter's and Payload's limits are let through. An error on a deployment, a warning elsewhere
 * (`pnpm bootstrap` writes one). That the two apps hold the same value is the fingerprints' check
 * on a deployment (D134); in development, bootstrap writes one value into both.
 */
export function signingSecretCheck(
  envs: AppEnvs,
  apps: readonly AppName[],
  deployed: boolean,
): Check {
  const missing = apps.filter((app) => (envs[app].STOREFRONT_SIGNING_SECRET ?? "").trim() === "");
  if (missing.length === 0)
    return { ...SIGNING, level: "ok", message: "STOREFRONT_SIGNING_SECRET is set." };
  return {
    ...SIGNING,
    level: deployed ? "error" : "warn",
    message:
      "STOREFRONT_SIGNING_SECRET is blank: Medusa counts every visitor on the storefront's own address, and the storefront's form, newsletter and Payload sign-in limits are not kept.",
    details: missing.map((app) => `not set: STOREFRONT_SIGNING_SECRET (apps/${app})`),
    fix: deployed
      ? "Run `pnpm staging:secrets` (DEPLOY.md), which generates it for both apps."
      : "Run `pnpm bootstrap`, which writes the same value into both apps' .env.",
  };
}

/**
 * Turnstile's keys in production (D143): Cloudflare's test keys make every challenge pass (or every
 * one fail), so production must hold its own widget's. Staging and CI use the test keys. Half-set
 * keys are `integration-turnstile`'s warning.
 */
export function turnstileKeyChecks(
  env: Readonly<Record<string, string | undefined>>,
  production: boolean,
): Check[] {
  const named = ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"].filter((name) =>
    TURNSTILE_TEST_KEY.test((env[name] ?? "").trim()),
  );
  if (!production || named.length === 0) return [];
  return [
    {
      ...TURNSTILE_KEYS,
      level: "error",
      message:
        "Production holds one of Cloudflare's published Turnstile test keys, so the challenge proves nothing.",
      details: named.map((name) => `${name} is a test key (apps/storefront)`),
      fix: "Create a widget for the shop's domain in Cloudflare's dashboard (Turnstile) and set its site key and secret key.",
    },
  ];
}

/**
 * `doctor --online`: does Cloudflare's Siteverify take `TURNSTILE_SECRET_KEY`? doctor posts the
 * secret with a token that is not one, so Cloudflare answers `success: false` either way, and its
 * `error-codes` say which part it refused: `invalid-input-secret` is the secret (an error: every
 * form would be refused), `invalid-input-response` only the token (the secret is good).
 */
export function turnstileSecretCheck(answer: HttpResult): Check {
  if (answer.kind !== "response")
    return {
      ...TURNSTILE_ONLINE,
      level: "warn",
      message: `not checked: Cloudflare's Siteverify ${describeUnreachable(answer)}.`,
    };
  const body = jsonOf(answer) as { success?: unknown; "error-codes"?: unknown } | undefined;
  const codes = Array.isArray(body?.["error-codes"]) ? (body["error-codes"] as unknown[]) : [];
  if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret"))
    return {
      ...TURNSTILE_ONLINE,
      level: "error",
      message:
        "Cloudflare refuses TURNSTILE_SECRET_KEY (invalid-input-secret): every form with the widget would be refused.",
      fix: "Copy the secret key again from the widget's page in Cloudflare's dashboard (Turnstile), the pair of NEXT_PUBLIC_TURNSTILE_SITE_KEY.",
    };
  if (answer.status === 200 && body !== undefined)
    return {
      ...TURNSTILE_ONLINE,
      level: "ok",
      message: "Cloudflare's Siteverify takes the secret key.",
    };
  return {
    ...TURNSTILE_ONLINE,
    level: "warn",
    message: `not checked: Cloudflare's Siteverify answered HTTP ${answer.status}.`,
  };
}
