import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { languageFrom } from "../lib/email-copy";
import { sendEmail, storefrontUrl } from "../lib/storefront-mail";

/**
 * The welcome (D122, SPEC §6.2): a customer exists only once the e-mail is verified (D64), so
 * `customer.created` for a customer with an account is the moment to say welcome, in the language
 * and market the storefront stored on the customer when it created it (`metadata: { market,
 * language }`), with a link to the market's catalog. A customer Medusa Admin creates (no account)
 * or a guest's record gets nothing. Once per customer.
 */
export default async function customerCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customer = await container
    .resolve(Modules.CUSTOMER)
    .retrieveCustomer(data.id, { select: ["id", "email", "has_account", "metadata"] })
    .catch(() => null);
  if (customer === null) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`customer.created: no customer ${data.id}, so nothing was sent.`);
    return;
  }
  if (!customer.has_account || !customer.email) return;
  const url = storefrontUrl(container, customer.metadata, "/store", {}, "customer-welcome");
  if (url === undefined) return;
  await sendEmail(container, {
    to: customer.email,
    template: "customer-welcome",
    type: "welcome",
    language: languageFrom(customer.metadata),
    url,
    idempotencyKey: `welcome-${customer.id}`,
  });
}

export const config: SubscriberConfig = {
  event: "customer.created",
};
