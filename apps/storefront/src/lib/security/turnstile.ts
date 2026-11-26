import "server-only";
import { isIP } from "node:net";
import { ActionError, TooManyError } from "../actions/action";
import { env, type RawEnv } from "../env";
import { visitorAddress, visitorHeaders } from "./client-signature";
import { consumeLimit } from "./rate-limit";

// M7 D143 (T108): Cloudflare's Turnstile, optional, by M6's integration rule. With both
// `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` set, the forms, the newsletter
// sign-up and registration carry Cloudflare's widget (`components/security/challenge.tsx`), and
// their actions check its token with Cloudflare's Siteverify **before anything else**. A post with
// no token is one sent without scripts (the widget cannot run there): it is taken under its own
// limit, once an hour per address (`form-no-script`), and the page says so. Without the keys
// nothing loads, nothing is checked, and the rate limits alone apply. If Cloudflare cannot be
// reached, or fails on its side, or refuses the secret, the post is taken (with one log line a
// minute), as the rate limits are when Medusa cannot be: the check can only add to them. Only a
// token Cloudflare refuses (`TOKEN_ERRORS`) refuses the post.

/** The field Cloudflare's widget adds to its form, holding the token. */
export const TURNSTILE_FIELD = "cf-turnstile-response";
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** How long Siteverify gets. */
export const SITEVERIFY_TIMEOUT_MS = 5_000;
/** Cloudflare's own bound on a token (Siteverify refuses longer ones). */
const MAX_TOKEN_LENGTH = 2048;

/** Both keys, trimmed, or `undefined` unless both are set (a half-set Turnstile stays off). */
export function turnstileKeys(
  source: RawEnv = env,
): { siteKey: string; secretKey: string } | undefined {
  const siteKey = (source.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
  const secretKey = (source.TURNSTILE_SECRET_KEY ?? "").trim();
  return siteKey !== "" && secretKey !== "" ? { siteKey, secretKey } : undefined;
}

export type ChallengeOutcome = "off" | "passed" | "failed" | "no-script";

/**
 * Siteverify's error codes that are about the token: only these refuse a post. Cloudflare's own
 * failure (`internal-error`, a non-2xx answer) lets it through, as an unreachable Siteverify does;
 * a secret Cloudflare refuses lets it through with its own log line, so a wrong key does not lock
 * every form (`doctor` cannot test the secret; the log says it). The review of PR 153.
 */
const TOKEN_ERRORS = new Set([
  "invalid-input-response",
  "timeout-or-duplicate",
  "missing-input-response",
  "bad-request",
]);
const SECRET_ERRORS = new Set(["invalid-input-secret", "missing-input-secret"]);

const lastLogs = new Map<string, number>();

/** One line a minute per kind of trouble, so an outage does not flood the log. */
function logOnce(kind: "unreachable" | "secret", message: string): void {
  const now = performance.now();
  if (now - (lastLogs.get(kind) ?? -Infinity) < 60_000) return;
  lastLogs.set(kind, now);
  console.warn(`turnstile: ${message}; posts are taken under the rate limits alone`);
}

/** For the tests: the next trouble logs again. */
export function resetTurnstileLog(): void {
  lastLogs.clear();
}

/** What Cloudflare says about `token` (the post's `cf-turnstile-response`). */
export async function checkChallenge(
  token: unknown,
  source: RawEnv = env,
  fetcher: typeof fetch = fetch,
): Promise<ChallengeOutcome> {
  const keys = turnstileKeys(source);
  if (keys === undefined) return "off";
  if (typeof token !== "string" || token.trim() === "") return "no-script";
  if (token.length > MAX_TOKEN_LENGTH) return "failed";
  const headers = visitorHeaders();
  const address = headers === undefined ? undefined : visitorAddress(headers, source);
  const body = new URLSearchParams({ secret: keys.secretKey, response: token });
  // Cloudflare compares the address it saw the widget from; a local one would only mislead it.
  if (address !== undefined && isIP(address) !== 0 && address !== "127.0.0.1")
    body.set("remoteip", address);
  let answer: { success?: unknown; "error-codes"?: unknown };
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel();
      logOnce("unreachable", `Cloudflare's Siteverify answered ${response.status}`);
      return "passed";
    }
    answer = (await response.json()) as typeof answer;
  } catch (error) {
    logOnce(
      "unreachable",
      `Cloudflare's Siteverify could not be reached (${error instanceof Error ? error.name : "error"})`,
    );
    return "passed";
  }
  if (answer.success === true) return "passed";
  const codes = Array.isArray(answer["error-codes"])
    ? answer["error-codes"].filter((code): code is string => typeof code === "string")
    : [];
  if (codes.some((code) => SECRET_ERRORS.has(code))) {
    logOnce("secret", `Cloudflare refuses TURNSTILE_SECRET_KEY (${codes.join(", ")})`);
    return "passed";
  }
  if (codes.some((code) => TOKEN_ERRORS.has(code))) return "failed";
  logOnce(
    "unreachable",
    `Cloudflare's Siteverify failed on its side (${codes.join(", ") || "no error code"})`,
  );
  return "passed";
}

/**
 * The check a form's action runs first: a token Cloudflare refuses is `challenge`; a post with no
 * token (no scripts) is taken once an hour per address (`too-many` past that).
 */
export async function requireChallenge(token: unknown): Promise<void> {
  const outcome = await checkChallenge(token);
  if (outcome === "failed") throw new ActionError("challenge", "turnstile: the check did not pass");
  if (outcome === "no-script") {
    const limit = await consumeLimit("form-no-script");
    if (!limit.allowed) throw new TooManyError(limit.retryAfter, "turnstile: no-script limit");
  }
}

/** The site key the widget takes, or `undefined`: the page draws no widget then. */
export function turnstileSiteKey(source: RawEnv = env): string | undefined {
  return turnstileKeys(source)?.siteKey;
}
