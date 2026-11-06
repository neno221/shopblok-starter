import type { MedusaContainer } from "@medusajs/framework/types";

import { postBatch, postOptions, type Batch } from "../lib/storefront-revalidate";

/**
 * A sale's start and end change prices without a word (D58, D112): since Medusa 2.22 a price list's
 * edits emit events, which the revalidation subscriber turns into its products' tags at once
 * (`lib/storefront-revalidate.ts`), but nothing is emitted when a list reaches its `starts_at` or
 * `ends_at`. Every ten minutes this refreshes every product read and the listings with `"max"`, so
 * such a change shows within about ten minutes and an outage never meets an expired entry. A
 * failure is logged and never thrown (`postBatch`).
 */
export const CATALOG_REFRESH: Batch = {
  tags: ["medusa:products", "search"],
  expire: "max",
};

export default async function revalidateCatalog(container: MedusaContainer) {
  await postBatch(CATALOG_REFRESH, postOptions(container));
}

export const config = {
  name: "revalidate-catalog",
  schedule: "*/10 * * * *",
};
