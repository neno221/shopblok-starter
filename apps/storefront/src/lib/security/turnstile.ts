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
// reached, the post is taken (with one log line a minute), as the rate limits are when Medusa
// cannot be: the check can only add to them.

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

let lastLog = -Infinity;

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
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      cache: "no-store",
    });
    const answer = (await response.json()) as { success?: unknown };
    return answer.success === true ? "passed" : "failed";
  } catch (error) {
    const now = performance.now();
    if (now - lastLog >= 60_000) {
      lastLog = now;
      console.warn(
        `turnstile: Cloudflare's Siteverify could not be reached (${error instanceof Error ? error.name : "error"}); posts are taken under the rate limits alone`,
      );
    }
    return "passed";
  }
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
