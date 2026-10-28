import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { createHash } from "node:crypto";

import { sendStorefrontLink } from "../lib/storefront-mail";

type PasswordReset = {
  entity_id: string;
  actor_type: string;
  token: string;
  metadata?: Record<string, unknown>;
};

/**
 * A customer's password reset (D64): the token goes out by the `email` channel as a link to the
 * storefront's `/reset-password` page in the shopper's market, the same way as the verification
 * link. An admin user's reset has no storefront page, so it is left to Medusa (nothing is sent).
 */
export default async function authPasswordReset({
  event: { data },
  container,
}: SubscriberArgs<PasswordReset>) {
  if (data.actor_type !== "customer") {
    return;
  }

  await sendStorefrontLink(container, {
    to: data.entity_id,
    template: "customer-password-reset",
    type: "password-reset",
    metadata: data.metadata,
    path: "/reset-password",
    query: { token: data.token, email: data.entity_id },
    idempotencyKey: `reset-${createHash("sha256").update(data.token).digest("hex")}`,
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
