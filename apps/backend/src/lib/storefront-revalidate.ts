import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * The storefront's cache refresh (D58, SPEC §6.2): a catalog event becomes a POST of `{ tags,
 * expire }` to the storefront's `/api/revalidate`, with `REVALIDATE_SECRET` as a bearer token. The
 * storefront's tags are the data layer's (`apps/storefront/src/lib/medusa/`): `medusa:products`
 * marks every product read (the PDP's, the handles', the hits' by id), `product:{handle}` one PDP,
 * `search` the listings, `navigation` the header's menu.
 *
 * `expire: 0` makes the next request wait for fresh data, `"max"` serves the old page while the
 * new one renders. Prices and stock are `0` (SPEC §8.3) but only for the products the event names,
 * because an inventory level changes on every order and a `0` on `medusa:products` would make every
 * product page wait; the listings and the hits then follow with `"max"` (or an hour's `revalidate`
 * for stock, which no listing shows).
 */

export type Expire = 0 | "max";
export type Batch = { tags: string[]; expire: Expire };

/** What each event refreshes, given the handles of the products or the groups it names. */
type Rule = {
  /** The entity whose handle the tags need, read by id, or none. */
  handlesOf?: HandleSource;
  batches: (handles: string[]) => Batch[];
};

type HandleSource =
  "product" | "product_variant" | "inventory_level" | "product_category" | "product_collection";

const productTags = (handles: string[]) => handles.map((handle) => `product:${handle}`);

const CONTENT: Rule["batches"] = (handles) => [
  {
    tags: [...productTags(handles), "medusa:products", "search"],
    expire: "max",
  },
];

/** A variant carries the prices: its product's page now, the rest stale-while-revalidate. */
const PRICES: Rule["batches"] = (handles) => [
  { tags: ["medusa:products", "search"], expire: "max" },
  ...(handles.length > 0 ? [{ tags: productTags(handles), expire: 0 as const }] : []),
];

const STOCK: Rule["batches"] = (handles) =>
  handles.length > 0 ? [{ tags: productTags(handles), expire: 0 }] : [];

const group =
  (kind: "category" | "collection", list: string, extra: string[]): Rule["batches"] =>
  (handles) => [
    {
      tags: [...handles.map((handle) => `${kind}:${handle}`), list, ...extra],
      expire: "max",
    },
  ];

const CATEGORY = group("category", "medusa:categories", ["navigation", "search"]);
const COLLECTION = group("collection", "medusa:collections", ["search"]);

/** A translation's id names no product, so every text the catalog shows is refreshed. */
const TRANSLATION: Rule["batches"] = () => [
  {
    tags: ["medusa:products", "medusa:categories", "medusa:collections", "navigation", "search"],
    expire: "max",
  },
];

/** A region's currency or countries change every price in it. */
const REGION: Rule["batches"] = () => [
  { tags: ["medusa:regions", "medusa:products", "search"], expire: 0 },
];

/**
 * The event-to-tags table. A `*.deleted` event's entity can no longer be read by id (a product's
 * or a group's), so its list tag stands in for the handle; a deleted variant's product is still
 * there (read `withDeleted`). Price lists emit nothing (D58): `jobs/revalidate-catalog.ts` covers
 * them every ten minutes.
 */
export const RULES: Record<string, Rule> = {
  "product.created": { batches: CONTENT },
  "product.updated": { handlesOf: "product", batches: CONTENT },
  "product.deleted": { batches: CONTENT },
  "product-variant.created": { handlesOf: "product_variant", batches: PRICES },
  "product-variant.updated": { handlesOf: "product_variant", batches: PRICES },
  "product-variant.deleted": { handlesOf: "product_variant", batches: PRICES },
  "inventory-level.created": { handlesOf: "inventory_level", batches: STOCK },
  "inventory-level.updated": { handlesOf: "inventory_level", batches: STOCK },
  "inventory-level.deleted": { handlesOf: "inventory_level", batches: STOCK },
  "product-category.created": { batches: CATEGORY },
  "product-category.updated": {
    handlesOf: "product_category",
    batches: CATEGORY,
  },
  "product-category.deleted": { batches: CATEGORY },
  "product-collection.created": { batches: COLLECTION },
  "product-collection.updated": {
    handlesOf: "product_collection",
    batches: COLLECTION,
  },
  "product-collection.deleted": { batches: COLLECTION },
  "translation.created": { batches: TRANSLATION },
  "translation.updated": { batches: TRANSLATION },
  "translation.deleted": { batches: TRANSLATION },
  "region.created": { batches: REGION },
  "region.updated": { batches: REGION },
  "region.deleted": { batches: REGION },
};

export const REVALIDATE_EVENTS = Object.keys(RULES);

/** The batches for one event, `0` last so it wins over a `"max"` on the same entry. */
export function batchesFor(event: string, handles: string[]): Batch[] {
  const rule = RULES[event];
  if (rule === undefined) return [];
  const unique = [...new Set(handles)].sort();
  return rule.batches(unique).sort((a, b) => (a.expire === b.expire ? 0 : a.expire === 0 ? 1 : -1));
}

/** What `query.graph` returns for each entity, and where the handle sits in it. */
const HANDLE_FIELDS: Record<HandleSource, { field: string; pick: (row: any) => unknown[] }> = {
  product: { field: "handle", pick: (row) => [row.handle] },
  product_variant: {
    field: "product.handle",
    pick: (row) => [row.product?.handle],
  },
  inventory_level: {
    field: "inventory_item.variants.product.handle",
    pick: (row) =>
      (row.inventory_item?.variants ?? []).map(
        (variant: { product?: { handle?: unknown } }) => variant?.product?.handle,
      ),
  },
  product_category: { field: "handle", pick: (row) => [row.handle] },
  product_collection: { field: "handle", pick: (row) => [row.handle] },
};

type Query = {
  graph: (options: Record<string, unknown>) => Promise<{ data: unknown[] }>;
};

/** The handles the event's ids lead to; a read that fails gives none (the list tags still go). */
export async function handlesFor(query: Query, event: string, ids: string[]): Promise<string[]> {
  const source = RULES[event]?.handlesOf;
  if (source === undefined || ids.length === 0) return [];
  const { field, pick } = HANDLE_FIELDS[source];
  const { data } = await query.graph({
    entity: source,
    fields: [field],
    filters: { id: ids },
    withDeleted: true,
  });
  return data
    .flatMap((row) => pick(row))
    .filter((handle): handle is string => typeof handle === "string" && handle !== "");
}

export type Logger = {
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type PostOptions = {
  storefrontUrl: string | undefined;
  secret: string | undefined;
  logger: Logger;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

/**
 * POSTs one batch. Never throws: a failure is logged, because a subscriber that threw would have
 * its event retried, and a storefront that is down must not hold Medusa's event queue. The entries
 * then refresh on their own `revalidate` (an hour).
 */
export async function postBatch(batch: Batch, options: PostOptions): Promise<boolean> {
  const { storefrontUrl, secret, logger, fetch: send = fetch, timeoutMs = 5_000 } = options;
  if (!secret?.trim()) {
    logger.error(
      "storefront-revalidate: REVALIDATE_SECRET is not set, so the storefront was not told.",
    );
    return false;
  }
  let url: URL | undefined;
  try {
    url = new URL("/api/revalidate", storefrontUrl);
  } catch {
    url = undefined;
  }
  if (url === undefined || (url.protocol !== "http:" && url.protocol !== "https:")) {
    logger.error(
      "storefront-revalidate: STOREFRONT_URL is not an http(s) URL, so the storefront was not told.",
    );
    return false;
  }
  try {
    const response = await send(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret.trim()}`,
      },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.body?.cancel();
    if (!response.ok) {
      logger.warn(
        `storefront-revalidate: ${url} answered ${response.status} for ${batch.tags.join(", ")}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    logger.warn(
      `storefront-revalidate: ${url} failed for ${batch.tags.join(", ")}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/** The storefront's URL and the secret, from the container's config and the environment. */
export function postOptions(container: MedusaContainer): PostOptions {
  const { admin } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
  return {
    storefrontUrl: admin?.storefrontUrl,
    secret: process.env.REVALIDATE_SECRET,
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),
  };
}
