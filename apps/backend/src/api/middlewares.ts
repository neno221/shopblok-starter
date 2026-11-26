import {
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  errorHandler,
  validateAndTransformBody,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { createHash } from "node:crypto";

import { paymentSessionFilter } from "../lib/payment-session-filter";
import { processLimiter } from "../lib/rate-limit/limiter";
import { authRateLimit, emailFrom, paramFrom, rateLimit } from "../lib/rate-limit/middleware";
import { reportRequestError } from "../lib/sentry";
import { securityHeaders } from "./security-headers";
import { confirmVerificationAgain } from "./auth/verification-again";
import { StoreCreateCustomerReturn, StoreRequestOrderClaim } from "./store/customers/me/validators";
import { requireVerifiedCustomer } from "./store/customers/verified";
import { StorePaymentToken } from "./store/carts/[id]/payment-token/route";
import { guardPaymentSession } from "./store/payment-sessions/guard";
import { localizeStoreSearch } from "./store/search/locale";

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
// `localizeStoreSearch` then gives the index the request's locale, checked
// against the store's (D63).
//
// M6 D125 (T96): Medusa's own error handler answers every error; before it, a 5xx goes to Sentry
// when `SENTRY_DSN` is set (`lib/sentry.ts`; without it nothing is sent).
const medusaErrorHandler = errorHandler();

// M7 D142 (T108): the limiter (and its Redis connection) is made as the routes load, so it is
// connected before the first request (the review of PR 153).
processLimiter();

export default defineMiddlewares({
  // Express 5's `ErrorRequestHandler` returns `unknown` (Medusa 2.23); Medusa's handler answers
  // synchronously, so nothing is returned.
  errorHandler: (error, req, res, next) => {
    reportRequestError(error, req);
    medusaErrorHandler(error, req, res, next);
  },
  routes: [
    // M7 D137 (T106): no `X-Powered-By`, and `nosniff`, on every answer (`./security-headers.ts`).
    // `/*` is Medusa's wildcard, which it turns into Express 5's `/{*splat}`.
    {
      matcher: "/*",
      middlewares: [securityHeaders],
    },
    // M7 D142 (T108): the rate limits (`lib/rate-limit/rules.ts` has the numbers), before the routes
    // they guard. The customer's five auth routes (SETUP T44's list), Medusa Admin's sign-in and
    // reset, cart completion per cart, and the rest of `/store/*`. Each keys on the address the
    // storefront signed (`x-shopblok-client`), or on the caller's own; an e-mail is hashed first.
    // T109 attaches `admin-code-check` to the routes Medusa's MFA adds.
    // The sign-ins, the customer's register and the resets sit on Medusa's own parameterised paths
    // and pick their rule from the decoded `actor_type` (`authRateLimit`), so a percent-encoded path
    // such as `/auth/customer/%65mailpass` is counted too (the review of PR 153).
    {
      method: ["POST"],
      matcher: "/auth/:actor_type/:auth_provider",
      middlewares: [authRateLimit("login")],
    },
    {
      method: ["POST"],
      matcher: "/auth/:actor_type/:auth_provider/register",
      middlewares: [authRateLimit("register")],
    },
    {
      method: ["POST"],
      matcher: "/auth/:actor_type/:auth_provider/reset-password",
      middlewares: [authRateLimit("reset")],
    },
    {
      method: ["POST"],
      matcher: "/auth/verification/request",
      middlewares: [rateLimit("verification-request", verificationSubject)],
    },
    {
      method: ["POST"],
      matcher: "/auth/verification/confirm",
      middlewares: [rateLimit("verification-confirm")],
    },
    {
      method: ["POST"],
      matcher: "/store/carts/:id/complete",
      middlewares: [rateLimit("cart-complete", paramFrom("id"))],
    },
    {
      matcher: "/store/*",
      middlewares: [rateLimit("store")],
    },
    // M7 D144 (T109): a cart's payment secrets only for its owner, and a customer's cart changed
    // only by that customer (`lib/payment-session-filter.ts`), on every store route.
    {
      matcher: "/store/*",
      middlewares: [paymentSessionFilter],
    },
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
        localizeStoreSearch,
      ],
    },
    // Required e-mail verification (D64): no account for an unverified e-mail.
    {
      method: ["POST"],
      matcher: "/store/customers",
      middlewares: [requireVerifiedCustomer],
    },
    // W5: a verification link opened twice answers as it did the first time.
    {
      method: ["POST"],
      matcher: "/auth/verification/confirm",
      middlewares: [confirmVerificationAgain],
    },
    // T53: a signed-in customer's claim of a guest order and return from their own order.
    // `/store/customers/me*` is authenticated by Medusa's own middleware.
    {
      method: ["POST"],
      matcher: "/store/customers/me/order-transfers",
      middlewares: [validateAndTransformBody(StoreRequestOrderClaim)],
    },
    {
      method: ["POST"],
      matcher: "/store/customers/me/returns",
      middlewares: [validateAndTransformBody(StoreCreateCustomerReturn)],
    },
    // T60 (D75): Settings → Payload's bulk sync. Medusa's own `/admin` middleware also takes a
    // secret API key; this one asks again for an admin's session or token only.
    {
      matcher: "/admin/payload/sync",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    // M6 D117 (T100): "Pay later" only for a zero total while Stripe is on, and only the session
    // `data` the shop sends (`store/payment-sessions/guard.ts`).
    {
      method: ["POST"],
      matcher: "/store/payment-collections/:id/payment-sessions",
      middlewares: [guardPaymentSession],
    },
    {
      method: ["POST"],
      matcher: "/store/carts/:id/payment-token",
      middlewares: [validateAndTransformBody(StorePaymentToken)],
    },
    // Medusa's own return route answers anyone who has an order's id (SPEC §11.1); returns go
    // through `/store/customers/me/returns`, which checks the order is the customer's.
    {
      method: ["POST"],
      matcher: "/store/returns",
      middlewares: [closedRoute],
    },
  ],
});

/**
 * Whose verification is asked for: the body's `entity_id` (the e-mail) when it names one, else the
 * identity the restricted token belongs to (a hash of the `Authorization` header), never nobody's.
 */
function verificationSubject(req: MedusaRequest): string | undefined {
  const email = emailFrom("entity_id")(req);
  if (email !== undefined) return email;
  const authorization = req.headers.authorization;
  return typeof authorization === "string"
    ? createHash("sha256").update(authorization).digest("hex")
    : undefined;
}

function closedRoute(_req: MedusaRequest, _res: MedusaResponse, _next: MedusaNextFunction) {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Returns are requested from the account: POST /store/customers/me/returns.",
  );
}
