import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { storefrontLink } from "../lib/storefront-url";

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
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (data.actor_type !== "customer") {
    return;
  }

  const url = storefrontLink(process.env.STOREFRONT_URL, data.metadata, "/reset-password", {
    token: data.token,
    email: data.entity_id,
  });

  if (!url) {
    logger.error("auth.password_reset: STOREFRONT_URL is not a URL, so no link was sent.");
    return;
  }

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "customer-password-reset",
    data: { url },
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
