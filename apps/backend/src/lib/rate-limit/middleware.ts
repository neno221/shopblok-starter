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

export type AuthStep = "login" | "register" | "reset";

type Limited = ReturnType<typeof rateLimit>;

/**
 * Which rule guards an e-mail-and-password step, per actor. Medusa serves these routes from
 * `/auth/[actor_type]/[auth_provider]/…`, and Express matches a path on the raw URL but decodes its
 * parameters: a fixed matcher such as `/auth/customer/emailpass` misses `/auth/customer/%65mailpass`,
 * which Medusa still serves as `emailpass` (the review of PR 153). So the limiter sits on Medusa's
 * own parameterised paths and reads the decoded parameters, as the route does.
 */
const AUTH_RULES = new Map<string, Partial<Record<AuthStep, Limited>>>([
  [
    "customer",
    {
      login: rateLimit("customer-login", emailFrom("email")),
      register: rateLimit("customer-register"),
      reset: rateLimit("customer-reset", emailFrom("identifier")),
    },
  ],
  [
    "user",
    {
      login: rateLimit("admin-login", emailFrom("email")),
      reset: rateLimit("admin-reset", emailFrom("identifier")),
    },
  ],
]);

const lowerParam = (req: MedusaRequest, name: string): string => {
  const value = (req.params as Record<string, unknown> | undefined)?.[name];
  return typeof value === "string" ? value.toLowerCase() : "";
};

/**
 * The limit for `step` on `POST /auth/:actor_type/:auth_provider[/register|/reset-password]`: the
 * decoded actor picks the rule (`customer`, Medusa Admin's `user`) for the `emailpass` provider.
 * Any other actor or provider passes (`/auth/verification/request` has its own rule; Medusa refuses
 * an actor or provider it does not know).
 */
export function authRateLimit(step: AuthStep) {
  return function authLimited(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ): void | Promise<void> {
    if (lowerParam(req, "auth_provider") !== "emailpass") return next();
    const limited = AUTH_RULES.get(lowerParam(req, "actor_type"))?.[step];
    if (limited === undefined) return next();
    return limited(req, res, next);
  };
}

