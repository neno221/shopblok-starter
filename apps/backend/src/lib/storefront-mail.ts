import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { storefrontLink } from "./storefront-url";

/**
 * Sends an e-mail whose content is a link to a storefront page in the shopper's market (T44): the
 * verification and the password reset subscribers. The base is the config's `admin.storefrontUrl`
 * (`STOREFRONT_URL`, mapped in `buildConfig`). `idempotencyKey` keeps a redelivered event from
 * sending the e-mail twice.
 */
export async function sendStorefrontLink(
  container: MedusaContainer,
  {
    to,
    template,
    metadata,
    path,
    query,
    data = {},
    idempotencyKey,
  }: {
    to: string;
    template: string;
    metadata: unknown;
    path: `/${string}`;
    query: Record<string, string>;
    data?: Record<string, unknown>;
    idempotencyKey: string;
  },
): Promise<void> {
  const { admin } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
  const url = storefrontLink(admin?.storefrontUrl, metadata, path, query);

  if (!url) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`${template}: STOREFRONT_URL is not an http(s) URL, so no link was sent.`);
    return;
  }

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to,
    channel: "email",
    template,
    data: { ...data, url },
    idempotency_key: idempotencyKey,
  });
}
