import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";

import { processLimiter } from "../../../lib/rate-limit/limiter";
import { clientOf } from "../../../lib/rate-limit/middleware";
import { STOREFRONT_RULES, type RuleName } from "../../../lib/rate-limit/rules";

/**
 * M7 D142 (T108): `POST /shopblok/rate-limit`, the storefront's limits kept in Medusa's private
 * Redis, so no data store is ever reachable from the internet. Only a call the storefront's server
 * signed (`x-shopblok-client`, `lib/rate-limit/signature.ts`) is taken; anything else is a 403. The
 * body names one of the storefront's rules (`STOREFRONT_RULES`: the forms, the newsletter, the
 * consent record, Payload's sign-in and reset, Turnstile's no-script path) and its key (an e-mail's
 * SHA-256, a form's id); the rule is consumed for the signed address and the key, and the answer is
 * `{ allowed, retryAfter }` (seconds, 0 when allowed). The storefront waits 2 s for it and lets its
 * request through without an answer (`apps/storefront/src/lib/security/rate-limit.ts`).
 */

const Body = z.object({
  rule: z.enum(STOREFRONT_RULES as [RuleName, ...RuleName[]]),
  key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,128}$/)
    .optional(),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const client = clientOf(req);
  if (!client.signed) {
    res.status(403).json({ type: "not_allowed", message: "Only the storefront's server may ask." });
    return;
  }
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ type: "invalid_data", message: "A storefront rule and its key." });
    return;
  }
  const verdict = await processLimiter().consume(parsed.data.rule, {
    address: client.address,
    key: parsed.data.key,
  });
  res.status(200).json(
    verdict.allowed
      ? { allowed: true, retryAfter: 0 }
      : { allowed: false, retryAfter: verdict.retryAfterSeconds },
  );
}
