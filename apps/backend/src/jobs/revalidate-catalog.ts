import type { MedusaContainer } from "@medusajs/framework/types";

import { postBatch, postOptions, type Batch } from "../lib/storefront-revalidate";

/**
 * Price lists emit no events (D58; `search/product.ts`'s TODOs): a sale's create, edit, start or
 * end changes prices without a word. Every ten minutes this refreshes every product read and the
 * listings with `"max"`, so such a change shows within about ten minutes and an outage never meets
 * an expired entry. A failure is logged and never thrown (`postBatch`).
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
