import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createHash } from "node:crypto";

import { sendStorefrontLink } from "../lib/storefront-mail";

type TransferRequested = { id: string; order_change_id: string };

type ChangeRow = {
  id: string;
  internal_note?: string | null;
  order?: { display_id?: number | null } | null;
  actions?: ({ action?: string | null; details?: Record<string, unknown> | null } | null)[] | null;
};

/** The market's prefix and language the claim route kept in the change's note (`{"market":"/us","language":"en"}`). */
function metadataOf(note: string | null | undefined): unknown {
  try {
    return JSON.parse(note ?? "");
  } catch {
    return undefined;
  }
}

/**
 * A guest order's claim (T53, D64, SPEC §8.4): the order's own address gets a link to the
 * storefront's `/order/{id}/transfer/{token}` page in the shopper's market, where the order moves to
 * the customer who asked for it (or the claim is declined). It goes by the `email` channel as the
 * verification link does (the local provider prints it in the backend's console in M3).
 */
export default async function orderTransferRequested({
  event: { data },
  container,
}: SubscriberArgs<TransferRequested>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: changes } = (await query.graph({
    entity: "order_change",
    fields: ["id", "internal_note", "order.display_id", "actions.action", "actions.details"],
    filters: { id: data.order_change_id },
  })) as { data: ChangeRow[] };
  const change = changes[0];
  const details = change?.actions?.find(
    (action) => action?.action === "TRANSFER_CUSTOMER",
  )?.details;
  const token = typeof details?.token === "string" ? details.token : undefined;
  const to = typeof details?.original_email === "string" ? details.original_email : undefined;

  if (!change || !token || !to) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(
        `order.transfer_requested: no token or address on ${data.order_change_id}, so nothing was sent.`,
      );
    return;
  }

  // The order's number for the copy (`{{orderNumber}}`); the link uses its id.
  const number = change.order?.display_id;

  await sendStorefrontLink(container, {
    to,
    template: "order-transfer-request",
    type: "order-transfer",
    values: typeof number === "number" ? { orderNumber: String(number) } : {},
    metadata: metadataOf(change.internal_note),
    path: `/order/${encodeURIComponent(data.id)}/transfer/${encodeURIComponent(token)}`,
    query: {},
    data: { order_id: data.id },
    idempotencyKey: `transfer-${createHash("sha256").update(token).digest("hex")}`,
  });
}

export const config: SubscriberConfig = {
  event: "order.transfer_requested",
};
