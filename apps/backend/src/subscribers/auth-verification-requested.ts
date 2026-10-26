import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { storefrontLink } from "../lib/storefront-url";

type VerificationRequested = {
  entity_id: string;
  entity_type: string;
  code: string;
  metadata?: Record<string, unknown>;
};

/**
 * Required e-mail verification (D64, SPEC §8.4): the code goes out by the Notification Module's
 * `email` channel, as a link to the storefront's `/verify` page in the shopper's market. The local
 * provider prints it in the backend's console in development and M3; Resend sends it from M6.
 * The `/verify` page confirms with the code alone (`POST /auth/verification/confirm`).
 */
export default async function authVerificationRequested({
  event: { data },
  container,
}: SubscriberArgs<VerificationRequested>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (data.entity_type !== "email") {
    return;
  }

  const url = storefrontLink(process.env.STOREFRONT_URL, data.metadata, "/verify", {
    code: data.code,
  });

  if (!url) {
    logger.error("auth.verification_requested: STOREFRONT_URL is not a URL, so no link was sent.");
    return;
  }

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "customer-verification",
    data: { url, code: data.code },
  });
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
};
