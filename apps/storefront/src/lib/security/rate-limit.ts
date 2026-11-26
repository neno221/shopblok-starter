import "server-only";
import { createHash } from "node:crypto";
import { medusaEnv } from "../env";
import { addressKey } from "./address-key";
import { CLIENT_HEADER, signedClientHeader, visitorHeaders } from "./client-signature";

// M7 D142 (T108): the storefront's own rate limits. Their counters are Medusa's, in its private
// Redis (no data store is reachable from the internet): the storefront's server asks
// `POST /shopblok/rate-limit` with a rule's name and its key, signed for the visitor
// (`client-signature.ts`), and Medusa answers `{ allowed, retryAfter }`. **When Medusa does not
// answer within 2 s, or answers anything else, the request is let through** (a form must not
// stop working with the backend), with one log line a minute. Without `STOREFRONT_SIGNING_SECRET`
// Medusa refuses every such call, so they are let through too; `doctor` calls that an error on a
// deployment.
//
// `/next/csp-report` keeps its own limit in memory, per instance (`memoryLimit`): reports come in
// bursts from browsers, and it must not call Medusa for each one.

/** The storefront's rules in Medusa's table (`apps/backend/src/lib/rate-limit/rules.ts`). */
export type StorefrontRule =
  "form" | "newsletter" | "consent" | "payload-login" | "payload-reset" | "form-no-script";

export type LimitAnswer = { allowed: true } | { allowed: false; retryAfter: number };

/** How long the storefront waits for Medusa's answer before letting the request through. */
export const RATE_LIMIT_TIMEOUT_MS = 2_000;
export const RATE_LIMIT_PATH = "/shopblok/rate-limit";

/** An e-mail as a rule's key: trimmed, lower case, its SHA-256. Medusa never sees the address. */
export const emailKey = (email: string): string =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

let lastLog = -Infinity;
/** One line a minute at most, so an outage does not flood the log. */
function logOnce(message: string): void {
  const now = performance.now();
  if (now - lastLog < 60_000) return;
  lastLog = now;
  console.warn(`rate-limit: ${message}; requests pass without the storefront's limits`);
}

/** For the tests: the next failure logs again. */
export function resetRateLimitLog(): void {
  lastLog = -Infinity;
}

type HeaderReader = { get(name: string): string | null };

/**
 * Consumes `rule` for the visitor this code runs for (or for `headers`, the request Payload's hooks
 * hand over) and `key`. `{ allowed: false, retryAfter }` only when Medusa says so.
 */
export async function consumeLimit(
  rule: StorefrontRule,
  key?: string,
  headers: HeaderReader | undefined = visitorHeaders(),
  fetcher: typeof fetch = fetch,
): Promise<LimitAnswer> {
  let backendUrl: string;
  try {
    ({ backendUrl } = await medusaEnv());
  } catch (error) {
    logOnce(`Medusa's address is not set (${error instanceof Error ? error.message : "error"})`);
    return { allowed: true };
  }
  // Medusa's address may carry a base path, which the route sits under (as `requestPath` in
  // `lib/medusa/sdk.ts` keeps it); the signature covers the path Medusa sees.
  let url: URL;
  try {
    const base = new URL(backendUrl);
    url = new URL(`${base.pathname.replace(/\/$/, "")}${RATE_LIMIT_PATH}`, base.origin);
  } catch {
    logOnce("Medusa's address is not a URL");
    return { allowed: true };
  }
  const signature = signedClientHeader({ method: "POST", path: url.pathname }, headers);
  if (signature === undefined) {
    logOnce("STOREFRONT_SIGNING_SECRET is not set, so Medusa cannot take the call");
    return { allowed: true };
  }
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: { "content-type": "application/json", [CLIENT_HEADER]: signature },
      body: JSON.stringify(key === undefined ? { rule } : { rule, key }),
      signal: AbortSignal.timeout(RATE_LIMIT_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel();
      logOnce(`Medusa answered ${response.status} for "${rule}"`);
      return { allowed: true };
    }
    const answer = (await response.json()) as { allowed?: unknown; retryAfter?: unknown };
    if (answer.allowed === false && typeof answer.retryAfter === "number")
      return { allowed: false, retryAfter: Math.max(1, Math.ceil(answer.retryAfter)) };
    return { allowed: true };
  } catch (error) {
    logOnce(
      `Medusa did not answer for "${rule}" (${error instanceof Error ? error.name : "error"})`,
    );
    return { allowed: true };
  }
}

/** How many live windows `memoryLimit` keeps before the oldest give way. */
export const MEMORY_LIMIT_KEYS = 5_000;

/**
 * A fixed-window limit kept in this instance's memory, for `/next/csp-report`: `hit(address)` counts
 * one for the address (IPv6 by its /64, as Medusa counts, `addressKey`) and answers whether it is
 * still within `limit` per `windowMs`. The map is swept as it grows; when every window is still
 * live, those hit longest ago are dropped, so a flood of addresses cannot hold memory or reset the others.
 */
export function memoryLimit(limit: number, windowMs: number, now: () => number = Date.now) {
  // A `Map` keeps insertion order, and each hit moves its window to the end, so the first entries
  // are the ones hit longest ago: an address that keeps posting keeps its count.
  const windows = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(address: string | undefined): boolean {
      const key = addressKey(address);
      const at = now();
      const current = windows.get(key);
      if (current !== undefined && current.resetAt > at) {
        current.count += 1;
        windows.delete(key);
        windows.set(key, current);
        return current.count <= limit;
      }
      windows.delete(key);
      if (windows.size >= MEMORY_LIMIT_KEYS) {
        for (const [name, window] of windows) if (window.resetAt <= at) windows.delete(name);
        for (const name of windows.keys()) {
          if (windows.size < MEMORY_LIMIT_KEYS) break;
          windows.delete(name);
        }
      }
      windows.set(key, { count: 1, resetAt: at + windowMs });
      return true;
    },
  };
}
