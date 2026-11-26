import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { emailKey, processLimiter, type Verdict } from "./limiter";
import type { RuleName } from "./rules";
import { CLIENT_HEADER, requestPath, verifyClientHeader } from "./signature";

/**
 * M7 D142 (T108): the limiter as Medusa middlewares (`api/middlewares.ts` says which route has
 * which rule). A refusal is a 429 with `Retry-After` and `{ type: "too_many_requests" }`; its
 * message ends in `retry after <seconds> s.`, which the storefront reads back (the SDK keeps only
 * an error's message and status), so it can say how long to wait.
 */

export type Client = {
  /** The address the counters are kept for: the signed one, `server`, or the request's own. */
  address: string;
  /** Whether the storefront's server signed this call. */
  signed: boolean;
};

const clients = new WeakMap<MedusaRequest, Client>();

/**
 * The request's own address: Express's `req.ip`. Medusa 2.23 sets `trust proxy` to 1 itself
 * (`express-loader.js`), so behind Railway's one proxy hop it is the address that hop saw (T116
 * checks it on staging).
 */
function ownAddress(req: MedusaRequest): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/** Who is calling, once per request: the address the header signs for this call, or the caller's. */
export function clientOf(req: MedusaRequest): Client {
  const known = clients.get(req);
  if (known !== undefined) return known;
  const verified = verifyClientHeader(
    req.headers[CLIENT_HEADER],
    { method: req.method, path: requestPath(req.originalUrl ?? req.url) },
    process.env.STOREFRONT_SIGNING_SECRET,
  );
  const client: Client =
    verified === undefined
      ? { address: ownAddress(req), signed: false }
      : { address: verified.address, signed: true };
  clients.set(req, client);
  return client;
}

/** The message's end the storefront reads the wait from (`lib/medusa/sdk.ts`, `RETRY_AFTER`). */
export const retryAfterMessage = (seconds: number): string =>
  `Too many requests: retry after ${seconds} s.`;

/** Answers a refusal: 429, `Retry-After`, `{ type: "too_many_requests", message, retry_after }`. */
export function refuse(res: MedusaResponse, seconds: number): void {
  res.setHeader("Retry-After", String(seconds));
  res.status(429).json({
    type: "too_many_requests",
    message: retryAfterMessage(seconds),
    retry_after: seconds,
  });
}

type KeyOf = (req: MedusaRequest) => string | undefined;

/** The request body's field, as a string (the routes are parsed as JSON before this runs). */
const bodyField = (req: MedusaRequest, name: string): unknown =>
  (req.body as Record<string, unknown> | undefined)?.[name];

/** An e-mail in the body's `field`, hashed; `undefined` without one (the route answers 400 itself). */
export const emailFrom =
  (field: string): KeyOf =>
  (req) => {
    const value = bodyField(req, field);
    return typeof value === "string" && value.trim() !== "" ? emailKey(value) : undefined;
  };

/** A route parameter, as the key (`/store/carts/:id/complete`'s cart). */
export const paramFrom =
  (name: string): KeyOf =>
  (req) => {
    const value = (req.params as Record<string, unknown> | undefined)?.[name];
    return typeof value === "string" ? value : undefined;
  };

/** The rule `name` before a route: the caller's counters are hit, and over a limit it answers 429. */
export function rateLimit(name: RuleName, keyOf?: KeyOf) {
  return async function rateLimited(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ): Promise<void> {
    const verdict: Verdict = await processLimiter().consume(name, {
      address: clientOf(req).address,
      key: keyOf?.(req),
    });
    if (verdict.allowed) return next();
    refuse(res, verdict.retryAfterSeconds);
  };
}
