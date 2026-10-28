import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createHash } from "node:crypto";

import { sendStorefrontLink } from "../lib/storefront-mail";

type VerificationRequested = {
  entity_id: string;
  entity_type: string;
  code: string;
  auth_identity_id: string;
  metadata?: Record<string, unknown>;
};

/**
 * Required e-mail verification (D64, SPEC §8.4): the code goes out by the Notification Module's
 * `email` channel, as a link to the storefront's `/verify` page in the shopper's market. The local
 * provider prints it in the backend's console in development and M3; Resend sends it from M6.
 * The `/verify` page confirms with the code alone (`POST /auth/verification/confirm`).
 *
 * Medusa does not check the request's `entity_id` against the identity, so the e-mail goes only
 * to an address the identity itself signs in with: otherwise any token (one `/register` away)
 * could have the shop e-mail any address. Only customers have a verification rule
 * (`authVerificationsPerActor`); a rule for admin users would need a template of its own.
 */
export default async function authVerificationRequested({
  event: { data },
  container,
}: SubscriberArgs<VerificationRequested>) {
  if (data.entity_type !== "email") {
    return;
  }

  const identity = await container
    .resolve(Modules.AUTH)
    .retrieveAuthIdentity(data.auth_identity_id, { relations: ["provider_identities"] });
  const own = (identity.provider_identities ?? []).some(
    (provider) => provider.entity_id.toLowerCase() === data.entity_id.toLowerCase(),
  );

  if (!own) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(
        "auth.verification_requested: the address is not the identity's own, so nothing was sent.",
      );
    return;
  }

  await sendStorefrontLink(container, {
    to: data.entity_id,
    template: "customer-verification",
    type: "verify-email",
    values: { code: data.code },
    metadata: data.metadata,
    path: "/verify",
    query: { code: data.code },
    data: { code: data.code },
    idempotencyKey: `verification-${createHash("sha256").update(data.code).digest("hex")}`,
  });
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
};
