import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { render, type EmailOrder } from "@shopblok/emails";

import { emailCopyFor, languageFrom, type EmailType } from "./email-copy";
import { storefrontLink } from "./storefront-url";

/** What every e-mail the backend sends needs (D121, D122): the copy's type and its values. */
export type EmailSend = {
  to: string;
  /** The notification's template name (`customer-verification`, `order-placed`…). */
  template: string;
  type: EmailType;
  values?: Record<string, string>;
  /** The copy's language (Payload's locale), already checked (`languageFrom`). */
  language: string;
  /** The button's link: an absolute http(s) URL. */
  url: string;
  /** The order's summary, for the order e-mails. */
  order?: EmailOrder;
  data?: Record<string, unknown>;
  idempotencyKey: string;
};

/**
 * Sends one e-mail (D121, D122): the copy is Payload's `email-templates` for `type` in `language`
 * with `values` (and the recipient as `email`) filled in, or the built-in English (T70, D84); it is
 * laid out by `@shopblok/emails` and goes in the notification's `content` (the subject, the HTML
 * and the text), which the Resend provider sends. The same copy, filled in, and the link go in
 * `data`, so the local provider (no key) prints the subject, the heading and the link, which the
 * e2e suites read. `idempotencyKey` keeps a redelivered event from sending the e-mail twice.
 */
export async function sendEmail(
  container: MedusaContainer,
  { to, template, type, values = {}, language, url, order, data = {}, idempotencyKey }: EmailSend,
): Promise<void> {
  const variables = { ...values, email: to };
  const copy = await emailCopyFor(container).copyFor(type, language, variables);
  const content = await render(type, {
    copy: copy.template,
    variables,
    url,
    language: copy.language,
    shop: { name: await shopName(container) },
    ...(order === undefined ? {} : { order }),
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
    content,
    idempotency_key: idempotencyKey,
  });
}

/**
 * Sends an e-mail whose content is a link to a storefront page in the shopper's market (T44): the
 * verification, password reset and order transfer subscribers. The base is the config's
 * `admin.storefrontUrl` (`STOREFRONT_URL`, mapped in `buildConfig`), the market's prefix and the
 * language come from the request's `metadata` (`{ market, language }`, T70).
 */
export async function sendStorefrontLink(
  container: MedusaContainer,
  {
    metadata,
    path,
    query,
    ...email
  }: Omit<EmailSend, "language" | "url"> & {
    metadata: unknown;
    path: `/${string}`;
    query: Record<string, string>;
  },
): Promise<void> {
  const url = storefrontUrl(container, metadata, path, query, email.template);
  if (url === undefined) return;
  await sendEmail(container, { ...email, language: languageFrom(metadata), url });
}

/**
 * `{STOREFRONT_URL}{market prefix}{path}?{query}`, or `undefined`, logged, when `STOREFRONT_URL` is
 * not an http(s) URL (no e-mail goes out with a link that leads nowhere).
 */
export function storefrontUrl(
  container: MedusaContainer,
  metadata: unknown,
  path: `/${string}`,
  query: Record<string, string>,
  template: string,
): string | undefined {
  const { admin } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
  const url = storefrontLink(admin?.storefrontUrl, metadata, path, query);
  if (url === undefined)
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`${template}: STOREFRONT_URL is not an http(s) URL, so no link was sent.`);
  return url;
}

/** The name in the e-mail's frame when the store has none (a store Medusa created without one). */
const FALLBACK_SHOP_NAME = "Shopblok";

/** The store's name in Medusa (Settings → Store), which the e-mail's frame shows. */
async function shopName(container: MedusaContainer): Promise<string> {
  const [store] = await container
    .resolve(Modules.STORE)
    .listStores({}, { select: ["name"], take: 1 });
  return store?.name?.trim() || FALLBACK_SHOP_NAME;
}
