import { createHash } from "node:crypto";

import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * A code's lifetime: Medusa's `TokenVerificationProvider` default (`ttl_seconds`, 900), counted from
 * `requested_at`. `medusa-config.ts` sets no `ttl_seconds`; one that did would have to use this value.
 */
const CODE_TTL_MS = 900_000;

/**
 * `POST /auth/verification/confirm`, before Medusa's route: a code that is already confirmed answers
 * what its confirmation answered, for a while, instead of "invalid or already used". The link is a
 * plain GET of the storefront's `/verify` page, and that page can be requested more than once for
 * one click (`next dev` renders a page twice, and a mail client's link scanner opens it first), so
 * the shopper would see "this link no longer works" for an address that was just verified.
 *
 * Only the token provider's codes (Medusa's `TokenVerificationProvider` stores the code's SHA-256
 * in `provider_metadata.token_hash` and keeps the row once it is verified); anything else, an
 * unknown code, a code not confirmed yet, or one past its own lifetime goes on to Medusa's route,
 * which answers as before (PR 85 review, item 3: a used code answers no longer than an unused one
 * would). A newer link replaces the row's hash, so a superseded code is unknown here as at Medusa.
 * The answer names nothing the first confirmation did not.
 */
export async function confirmVerificationAgain(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const body = req.body as { code?: unknown; code_provider?: unknown } | undefined;
  const code = body?.code;
  const provider = body?.code_provider ?? "token";

  if (typeof code !== "string" || code === "" || provider !== "token") {
    return next();
  }

  const auth = req.scope.resolve(Modules.AUTH);
  const [verification] = await auth.listAuthVerifications({
    provider_metadata: { token_hash: createHash("sha256").update(code).digest("hex") },
  } as Parameters<typeof auth.listAuthVerifications>[0]);
  const requestedAt = verification?.requested_at ? new Date(verification.requested_at) : undefined;

  if (
    !verification?.verified_at ||
    !requestedAt ||
    requestedAt.getTime() + CODE_TTL_MS <= Date.now()
  ) {
    return next();
  }

  res.status(200).json({
    entity_id: verification.entity_id,
    entity_type: verification.entity_type,
    code_provider: verification.code_provider,
    verified_at: verification.verified_at,
  });
}
