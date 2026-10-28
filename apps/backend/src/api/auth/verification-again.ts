import { createHash } from "node:crypto";

import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * How long a used link still answers as it did (W5, finding 1): the token provider's own link
 * lifetime (`ttl_seconds`, 900 by default), counted from when the code was confirmed.
 */
const AGAIN_MS = 900_000;

/**
 * `POST /auth/verification/confirm`, before Medusa's route: a code that is already confirmed answers
 * what its confirmation answered, for a while, instead of "invalid or already used". The link is a
 * plain GET of the storefront's `/verify` page, and that page can be requested more than once for
 * one click (`next dev` renders a page twice, and a mail client's link scanner opens it first), so
 * the shopper would see "this link no longer works" for an address that was just verified.
 *
 * Only the token provider's codes (Medusa's `TokenVerificationProvider` stores the code's SHA-256
 * in `provider_metadata.token_hash` and keeps the row once it is verified); anything else, an
 * unknown code, or one confirmed longer ago than `AGAIN_MS` goes on to Medusa's route, which
 * answers as before. The answer names nothing the first confirmation did not.
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
  const verifiedAt = verification?.verified_at ? new Date(verification.verified_at) : undefined;

  if (!verification || !verifiedAt || Date.now() - verifiedAt.getTime() > AGAIN_MS) {
    return next();
  }

  res.status(200).json({
    entity_id: verification.entity_id,
    entity_type: verification.entity_type,
    code_provider: verification.code_provider,
    verified_at: verification.verified_at,
  });
}
