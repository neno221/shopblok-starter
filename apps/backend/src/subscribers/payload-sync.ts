import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { message, syncMarkets, syncRecords } from "../lib/payload-sync";
import type { SyncCollection } from "../modules/payload/mapping";

/**
 * D75's events. Each carries `{ id }` (one or a list), so the record is read again; a region's
 * countries change through `region.updated`. The store's locales and currencies have no workflow
 * event in 2.21.2 (no `store.updated`); `store-locale.*` below are the store module's own events,
 * which `payload-sync.spec.ts` shows arriving: one per locale row, since the store's update
 * replaces every row (SETUP.md, T60). The reconcile job covers anything
 * else within ten minutes.
 */
export const PAYLOAD_SYNC_EVENTS: Record<string, SyncCollection | "markets"> = {
  "product.created": "products",
  "product.updated": "products",
  "product.deleted": "products",
  "product-category.created": "categories",
  "product-category.updated": "categories",
  "product-category.deleted": "categories",
  "product-collection.created": "collections",
  "product-collection.updated": "collections",
  "product-collection.deleted": "collections",
  "region.created": "markets",
  "region.updated": "markets",
  "region.deleted": "markets",
  "store.store-locale.created": "markets",
  "store.store-locale.updated": "markets",
  "store.store-locale.deleted": "markets",
};

export default async function payloadSync({
  event: { name, data },
  container,
}: SubscriberArgs<{ id?: string | string[] }>) {
  const target = PAYLOAD_SYNC_EVENTS[name];
  if (target === undefined) return;
  if (target === "markets") {
    try {
      await syncMarkets(container);
    } catch (error) {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`payload-sync: markets not written after ${name}: ${message(error)}`);
    }
    return;
  }
  const ids = [data?.id ?? []].flat().filter((id): id is string => typeof id === "string");
  await syncRecords(container, target, ids);
}

export const config: SubscriberConfig = {
  event: Object.keys(PAYLOAD_SYNC_EVENTS),
};
