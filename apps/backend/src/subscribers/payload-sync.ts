import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { syncRecords } from "../lib/payload-sync";
import type { SyncCollection } from "../modules/payload/mapping";

/**
 * D75's events. Each carries `{ id }` (one or a list), so the record is read again. Products,
 * categories and collections only: the market map is Medusa's, and Payload no longer holds a copy
 * of its regions and locales (M4b, D95), so `region.*` and `store.store-locale.*` are not
 * listened to here (`storefront-revalidate.ts` listens to `region.*` for the storefront's map).
 * The reconcile job covers anything else within ten minutes.
 */
export const PAYLOAD_SYNC_EVENTS: Record<string, SyncCollection> = {
  "product.created": "products",
  "product.updated": "products",
  "product.deleted": "products",
  "product-category.created": "categories",
  "product-category.updated": "categories",
  "product-category.deleted": "categories",
  "product-collection.created": "collections",
  "product-collection.updated": "collections",
  "product-collection.deleted": "collections",
};

export default async function payloadSync({
  event: { name, data },
  container,
}: SubscriberArgs<{ id?: string | string[] }>) {
  const target = PAYLOAD_SYNC_EVENTS[name];
  if (target === undefined) return;
  const ids = [data?.id ?? []].flat().filter((id): id is string => typeof id === "string");
  await syncRecords(container, target, ids);
}

export const config: SubscriberConfig = {
  event: Object.keys(PAYLOAD_SYNC_EVENTS),
};
