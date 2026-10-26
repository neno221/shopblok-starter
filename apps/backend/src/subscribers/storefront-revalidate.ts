import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  REVALIDATE_EVENTS,
  batchesFor,
  handlesFor,
  postBatch,
  postOptions,
} from "../lib/storefront-revalidate";

/**
 * Tells the storefront which cached catalog reads a change made stale (D58, SPEC §6.2): the event's
 * ids become handles (`query.graph`), the handles and the event become tags
 * (`lib/storefront-revalidate.ts`), and each batch is one POST to `/api/revalidate`. Nothing here
 * throws: a failed read still sends the list tags, and a failed POST is logged.
 */
export default async function storefrontRevalidate({
  event: { name, data },
  container,
}: SubscriberArgs<{ id?: string | string[] }>) {
  const options = postOptions(container);
  const ids = [data?.id ?? []].flat().filter((id): id is string => typeof id === "string");
  let handles: string[] = [];
  try {
    handles = await handlesFor(container.resolve(ContainerRegistrationKeys.QUERY), name, ids);
  } catch (error) {
    options.logger.warn(
      `storefront-revalidate: could not read the handles for ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  for (const batch of batchesFor(name, handles)) {
    await postBatch(batch, options);
  }
}

export const config: SubscriberConfig = {
  event: REVALIDATE_EVENTS,
};
