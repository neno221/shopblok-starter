/**
 * Prints the storefront's publishable API key as one line of JSON:
 *
 *   {"publishableKey":"pk_..."}
 *
 *   pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/print-publishable-key.ts
 *
 * T13's `pnpm bootstrap` writes it into the storefront's env. The line shares
 * stdout with Medusa's log output, so find it with `extractPublishableKey`
 * (./lib/publishable-key.ts) or a `grep '^{"publishableKey"'`. This is more
 * robust than create-medusa-app's SQL lookup: it asks the API Key Module, and
 * it fails (exit 1) instead of printing a key the store would reject.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import { PUBLISHABLE_KEY_TITLE } from "./lib/markets";
import { formatPublishableKey } from "./lib/publishable-key";

export default async function printPublishableKey({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "revoked_at", "sales_channels.id"],
    filters: { type: "publishable", title: PUBLISHABLE_KEY_TITLE },
  });
  const key = data.find((k) => !k.revoked_at);

  if (!key?.token) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No active publishable key titled "${PUBLISHABLE_KEY_TITLE}". Run seed-markets.ts first.`,
    );
  }

  // Without a sales channel, /store/products answers 400 "Publishable key needs
  // to have a sales channel configured".
  if (!(key.sales_channels ?? []).some((channel) => channel?.id)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `The publishable key ${key.id} has no sales channel. Run seed-markets.ts to link it.`,
    );
  }

  console.log(formatPublishableKey(key.token));
}
