import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { createHash } from "node:crypto";

import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { adminLink } from "../lib/admin-url";
import { sendEmail, sendStorefrontLink } from "../lib/storefront-mail";

type PasswordReset = {
  entity_id: string;
  actor_type: string;
  token: string;
  metadata?: Record<string, unknown>;
};

/**
 * A password reset (D64, D122): a customer's token goes out by the `email` channel as a link to the
 * storefront's `/reset-password` page in the shopper's market, the same way as the verification
 * link; a Medusa Admin user's (T99) as a link to the admin's own reset page
 * (`MEDUSA_BACKEND_URL/app/reset-password?token=…`), in English. Any other actor gets nothing.
 */
export default async function authPasswordReset({
  event: { data },
  container,
}: SubscriberArgs<PasswordReset>) {
  const idempotencyKey = `reset-${createHash("sha256").update(data.token).digest("hex")}`;
  if (data.actor_type === "user") {
    const url = adminLink(process.env["MEDUSA_BACKEND_URL"], "/reset-password", data.token);
    if (url === undefined) {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .error(
          "admin-password-reset: MEDUSA_BACKEND_URL is not an http(s) URL, so no link was sent.",
        );
      return;
    }
    await sendEmail(container, {
      to: data.entity_id,
      template: "admin-password-reset",
      type: "password-reset",
      language: "en",
      url,
      idempotencyKey,
    });
    return;
  }
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
    idempotencyKey,
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
