import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ipAddress } from "@vercel/functions";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { env, type RawEnv } from "../env";

// M7 D142 (T108): the visitor's address, signed for Medusa. Every server-side call the storefront
// makes to Medusa (`lib/medusa/sdk.ts`) carries
//
//     x-shopblok-client: v1;<address>;<unix seconds>;<HMAC-SHA256, hex>
//
// with the HMAC (`STOREFRONT_SIGNING_SECRET`) over the version, the address, the time, the method
// and the path without its query, one per line, so Medusa can keep a counter per visitor although
// every call reaches it from this server's address, and a header taken from one call is refused on
// another. The backend's copy of the scheme is `apps/backend/src/lib/rate-limit/signature.ts`;
// both test the same vector. The header is never put on a browser's request: only this server
// holds the secret, and nothing here runs in a browser (`server-only`).

export const CLIENT_HEADER = "x-shopblok-client";
export const SIGNATURE_VERSION = "v1";
/** What a call with no visitor signs as (the build's prerendering, revalidation, jobs). */
export const SERVER_ADDRESS = "server";
/** CI's `next start` only: the visitor a test speaks for (`visitorAddress`). */
export const E2E_CLIENT_IP_HEADER = "x-e2e-client-ip";

export type SignedInput = { address: string; time: number; method: string; path: string };

export function clientSignature(secret: string, input: SignedInput): string {
  return createHmac("sha256", secret)
    .update(
      [
        SIGNATURE_VERSION,
        input.address,
        String(input.time),
        input.method.toUpperCase(),
        input.path,
      ].join("\n"),
    )
    .digest("hex");
}

export function clientHeader(secret: string, input: SignedInput): string {
  return [SIGNATURE_VERSION, input.address, String(input.time), clientSignature(secret, input)].join(
    ";",
  );
}

/**
 * The wall clock in Unix seconds, from `performance` (Next's Cache Components treats `Date.now()`
 * during a prerender as I/O and aborts it; `performance` is the clock it leaves for measuring).
 */
export function nowSeconds(): number {
  return Math.floor((performance.timeOrigin + performance.now()) / 1000);
}

/**
 * Whether the test header `x-e2e-client-ip` may name the visitor: only with `E2E_TEST_ROUTES=true`
 * and neither `DEPLOY_ENV` nor `VERCEL_ENV` set (CI's `next start`), so the suites can speak for
 * many visitors from one machine and stay under the limits `rate-limit.spec.ts` checks at their
 * real values. A preview or a deployment never takes it.
 */
export function e2eClientIpAllowed(source: RawEnv = env): boolean {
  return (
    source.E2E_TEST_ROUTES === "true" &&
    (source.DEPLOY_ENV ?? "").trim() === "" &&
    (source.VERCEL_ENV ?? "").trim() === ""
  );
}

type HeaderReader = { get(name: string): string | null };

/**
 * The visitor's address for a request's headers. On Vercel (`VERCEL_ENV` set), what Vercel's edge
 * saw (`@vercel/functions`' `ipAddress`, its `x-real-ip`; the first hop of `x-forwarded-for`,
 * which Vercel writes itself, if that is missing); `undefined` when neither is an address, and the
 * call goes unsigned (Medusa then counts it on this server's address). Elsewhere `127.0.0.1` (a
 * PC's `next dev` or `next start`), or `x-e2e-client-ip` where `e2eClientIpAllowed` says.
 */
export function visitorAddress(headers: HeaderReader, source: RawEnv = env): string | undefined {
  const valid = (value: string | null | undefined) => {
    const trimmed = (value ?? "").trim();
    return isIP(trimmed) === 0 ? undefined : trimmed;
  };
  if ((source.VERCEL_ENV ?? "").trim() !== "") {
    return (
      valid(ipAddress(headers as Headers)) ??
      valid(headers.get("x-forwarded-for")?.split(",")[0])
    );
  }
  if (e2eClientIpAllowed(source)) {
    const named = valid(headers.get(E2E_CLIENT_IP_HEADER));
    if (named !== undefined) return named;
  }
  return "127.0.0.1";
}

/**
 * The headers of the visitor's request this code runs for, when there is one: a page or a route
 * handler rendered for a request, a server action, `"use cache: private"`. `undefined` anywhere
 * else (a prerender, `"use cache"`, a job, the build), which signs as `server`. Read from Next's own
 * work-unit store, because `headers()` cannot be called in those places at all.
 */
export function visitorHeaders(): HeaderReader | undefined {
  const store = workUnitAsyncStorage.getStore();
  if (store === undefined) return undefined;
  switch (store.type) {
    case "request":
    case "private-cache":
      return store.headers;
    default:
      return undefined;
  }
}

/**
 * The header for one call to Medusa: the visitor's address when the call is made for one (or the
 * `headers` given, as Payload's hooks pass theirs), `server` when none is. `undefined` without
 * `STOREFRONT_SIGNING_SECRET`, or when Vercel names no address.
 */
export function signedClientHeader(
  call: { method: string; path: string },
  headers: HeaderReader | undefined = visitorHeaders(),
  source: RawEnv = env,
): string | undefined {
  const secret = (source.STOREFRONT_SIGNING_SECRET ?? "").trim();
  if (secret === "") return undefined;
  const address = headers === undefined ? SERVER_ADDRESS : visitorAddress(headers, source);
  if (address === undefined) return undefined;
  return clientHeader(secret, { address, time: nowSeconds(), ...call });
}
