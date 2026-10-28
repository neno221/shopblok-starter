import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { emailCopyFor, languageFrom, type EmailType } from "./email-copy";
import { storefrontLink } from "./storefront-url";

/**
 * Sends an e-mail whose content is a link to a storefront page in the shopper's market (T44): the
 * verification, password reset and order transfer subscribers. The base is the config's
 * `admin.storefrontUrl` (`STOREFRONT_URL`, mapped in `buildConfig`). The copy is Payload's
 * `email-templates` for `type` in the language the storefront sent (`metadata.language`), with
 * `values` (and the recipient as `email`) filled in, or the built-in English (T70, D84); it goes in
 * the notification's `data` with the link, so the local provider prints the subject, the heading
 * and the link. `idempotencyKey` keeps a redelivered event from sending the e-mail twice.
 */
export async function sendStorefrontLink(
  container: MedusaContainer,
  {
    to,
    template,
    type,
    values = {},
    metadata,
    path,
    query,
    data = {},
    idempotencyKey,
  }: {
    to: string;
    template: string;
    type: EmailType;
    values?: Record<string, string>;
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

  const copy = await emailCopyFor(container).copyFor(type, languageFrom(metadata), {
    ...values,
    email: to,
  });

  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to,
    channel: "email",
    template,
    data: {
      ...data,
      url,
      subject: copy.subject,
      preheader: copy.preheader,
      heading: copy.heading,
      text: copy.text,
      cta: copy.cta,
      language: copy.language,
    },
    idempotency_key: idempotencyKey,
  });
}
