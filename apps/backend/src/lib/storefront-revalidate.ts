import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * The storefront's cache refresh (D58, SPEC §6.2): a catalog event becomes a POST of `{ tags,
 * expire }` to the storefront's `/api/revalidate`, with `REVALIDATE_SECRET` as a bearer token. The
 * storefront's tags are the data layer's (`apps/storefront/src/lib/medusa/`): `medusa:products`
 * marks every product read (the PDP's, the handles', the hits' by id), `product:{handle}` one PDP,
 * `search` the listings, `navigation` the header's menu, `medusa:markets` the market map (D94).
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
  /** Where the event's data holds those ids: `id` (the default) or a price list's `price_set_ids`. */
  idsIn?: "id" | "price_set_ids";
  batches: (handles: string[]) => Batch[];
};

type HandleSource =
  | "product"
  | "product_variant"
  | "product_option"
  | "product_option_value"
  | "product_tag"
  | "inventory_level"
  | "product_category"
  | "product_collection"
  | "price_set"
  | "price_list";

const productTags = (handles: string[]) => handles.map((handle) => `product:${handle}`);

const CONTENT: Rule["batches"] = (handles) => [
  {
    tags: [...productTags(handles), "medusa:products", "search"],
    expire: "max",
  },
];

/**
 * A variant carries the prices, and a price list's prices are its variants': the products' pages
 * now, the rest stale-while-revalidate. With no handle (a deleted list whose prices could not be
 * read) only the second half goes, the list-wide rule of a `*.deleted` event.
 */
const PRICES: Rule["batches"] = (handles) => [
  { tags: ["medusa:products", "search"], expire: "max" },
  ...(handles.length > 0 ? [{ tags: productTags(handles), expire: 0 as const }] : []),
];

/**
 * Stock for the products the event names. With none (the read failed, or the level's item has no
 * variant left) every product read is marked stale instead, with `"max"` for the reason above.
 */
const STOCK: Rule["batches"] = (handles) => [
  handles.length > 0
    ? { tags: productTags(handles), expire: 0 }
    : { tags: ["medusa:products"], expire: "max" },
];

const group =
  (kind: "category" | "collection", list: string, extra: string[]): Rule["batches"] =>
  (handles) => [
    {
      tags: [...handles.map((handle) => `${kind}:${handle}`), list, ...extra],
      expire: "max",
    },
  ];

// A product page's breadcrumbs carry its categories' and collection's names and handles, so a
// group's change refreshes the product reads too.
const CATEGORY = group("category", "medusa:categories", [
  "medusa:products",
  "navigation",
  "search",
]);
const COLLECTION = group("collection", "medusa:collections", ["medusa:products", "search"]);

/** A translation's id names no product, so every text the catalog shows is refreshed. */
const TRANSLATION: Rule["batches"] = () => [
  {
    tags: ["medusa:products", "medusa:categories", "medusa:collections", "navigation", "search"],
    expire: "max",
  },
];

/**
 * A region's currency or countries change every price in it, and its countries decide which
 * markets exist (the map lists every country of a region, D90), so the market map follows: `0`,
 * since a map read stale for a request would show a country as unknown.
 */
const REGION: Rule["batches"] = () => [
  { tags: ["medusa:regions", "medusa:markets", "medusa:products", "search"], expire: 0 },
];

/**
 * A saved market (D94): the markets plugin's workflows emit this after every save of a country or
 * the settings (`@shopblok/medusa-markets`, `MARKETS_UPDATED_EVENT`). The storefront's next read
 * waits for the new map (`expire: 0`); its proxy has it within its own 30 s.
 */
export const MARKETS_UPDATED = "shopblok.markets.updated";
const MARKETS: Rule["batches"] = () => [{ tags: ["medusa:markets"], expire: 0 }];

/**
 * The event-to-tags table. A `*.deleted` event's entity can no longer be read by id (a product's
 * or a group's), so its list tag stands in for the handle; a deleted variant's product is still
 * there (read `withDeleted`).
 *
 * Price lists emit since Medusa 2.22 (#17067, D112): `prices_added`, `prices_updated` and
 * `prices_removed` carry `{ id, price_set_ids }` (a removed price's set still links its variant),
 * `created` and `updated` only the list's `{ id }`, whose prices name the sets. `deleted` is emitted
 * after the list and its prices are soft-deleted: the prices are read `withDeleted`, and if none is
 * left the list-wide half of `PRICES` goes alone. A sale reaching its `starts_at` or `ends_at`
 * emits nothing, so `jobs/revalidate-catalog.ts` still refreshes every ten minutes.
 */
export const RULES: Record<string, Rule> = {
  "product.created": { batches: CONTENT },
  "product.updated": { handlesOf: "product", batches: CONTENT },
  "product.deleted": { batches: CONTENT },
  "product-variant.created": { handlesOf: "product_variant", batches: PRICES },
  "product-variant.updated": { handlesOf: "product_variant", batches: PRICES },
  "product-variant.deleted": { handlesOf: "product_variant", batches: PRICES },
  "price-list.created": { handlesOf: "price_list", batches: PRICES },
  "price-list.updated": { handlesOf: "price_list", batches: PRICES },
  "price-list.deleted": { handlesOf: "price_list", batches: PRICES },
  "price-list.prices_added": {
    handlesOf: "price_set",
    idsIn: "price_set_ids",
    batches: PRICES,
  },
  "price-list.prices_updated": {
    handlesOf: "price_set",
    idsIn: "price_set_ids",
    batches: PRICES,
  },
  "price-list.prices_removed": {
    handlesOf: "price_set",
    idsIn: "price_set_ids",
    batches: PRICES,
  },
  // An option can be shared by many products since 2.16; the search index follows the same events
  // (`search/product.ts`). A sales channel's deletion unlinks its products, so none can be read.
  "product-option.created": { handlesOf: "product_option", batches: CONTENT },
  "product-option.updated": { handlesOf: "product_option", batches: CONTENT },
  "product-option.deleted": { handlesOf: "product_option", batches: CONTENT },
  "product-option-value.updated": { handlesOf: "product_option_value", batches: CONTENT },
  "product-option-value.deleted": { handlesOf: "product_option_value", batches: CONTENT },
  "product-tag.updated": { handlesOf: "product_tag", batches: CONTENT },
  "product-tag.deleted": { handlesOf: "product_tag", batches: CONTENT },
  "sales-channel.deleted": { batches: CONTENT },
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
  [MARKETS_UPDATED]: { batches: MARKETS },
};

export const REVALIDATE_EVENTS = Object.keys(RULES);

/** The batches for one event, `0` last so it wins over a `"max"` on the same entry. */
export function batchesFor(event: string, handles: string[]): Batch[] {
  const rule = RULES[event];
  if (rule === undefined) return [];
  const unique = [...new Set(handles)].sort();
  return rule.batches(unique).sort((a, b) => (a.expire === b.expire ? 0 : a.expire === 0 ? 1 : -1));
}

const handlesOf = (products: { handle?: unknown }[] | null | undefined) =>
  (products ?? []).map((product) => product?.handle);

/**
 * What `query.graph` reads for each entity (`entity` and the ids' `key` when they differ from the
 * source and `id`), and where the handle sits in it.
 */
type HandleRead = { entity?: string; key?: string; field: string; pick: (row: any) => unknown[] };

const HANDLE_FIELDS: Record<Exclude<HandleSource, "price_list">, HandleRead> = {
  product: { field: "handle", pick: (row) => [row.handle] },
  product_variant: {
    field: "product.handle",
    pick: (row) => [row.product?.handle],
  },
  product_option: { field: "products.handle", pick: (row) => handlesOf(row.products) },
  product_option_value: {
    field: "option.products.handle",
    pick: (row) => handlesOf(row.option?.products),
  },
  product_tag: { field: "products.handle", pick: (row) => handlesOf(row.products) },
  inventory_level: {
    field: "inventory_item.variants.product.handle",
    pick: (row) =>
      (row.inventory_item?.variants ?? []).map(
        (variant: { product?: { handle?: unknown } }) => variant?.product?.handle,
      ),
  },
  product_category: { field: "handle", pick: (row) => [row.handle] },
  product_collection: { field: "handle", pick: (row) => [row.handle] },
  // A price set's variant is a link (`product_variant_price_set`), not a field of the set.
  price_set: {
    entity: "product_variant_price_set",
    key: "price_set_id",
    field: "variant.product.handle",
    pick: (row) => [row.variant?.product?.handle],
  },
};

type Query = {
  graph: (options: Record<string, unknown>) => Promise<{ data: unknown[] }>;
};

/** The ids the event names for its rule's handle read: its `id`, or the field the rule names. */
export function idsFor(event: string, data: unknown): string[] {
  const key = RULES[event]?.idsIn ?? "id";
  const value = (data as Record<string, unknown> | null | undefined)?.[key];
  return [value ?? []].flat().filter((id): id is string => typeof id === "string" && id !== "");
}

const strings = (values: unknown[]) =>
  values.filter((value): value is string => typeof value === "string" && value !== "");

/** The handles the event's ids lead to; a read that fails gives none (the list tags still go). */
export async function handlesFor(query: Query, event: string, ids: string[]): Promise<string[]> {
  let source = RULES[event]?.handlesOf;
  if (source === undefined || ids.length === 0) return [];
  if (source === "price_list") {
    // A list's prices name its sets; a deleted list's prices are soft-deleted with it.
    const { data } = await query.graph({
      entity: "price",
      fields: ["price_set_id"],
      filters: { price_list_id: ids },
      withDeleted: true,
    });
    ids = [...new Set(strings(data.map((row: any) => row?.price_set_id)))];
    if (ids.length === 0) return [];
    source = "price_set";
  }
  const { entity = source, key = "id", field, pick } = HANDLE_FIELDS[source];
  const { data } = await query.graph({
    entity,
    fields: [field],
    filters: { [key]: ids },
    withDeleted: true,
  });
  return strings(data.flatMap((row) => pick(row)));
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
    if (!response.ok) {
      await response.body?.cancel();
      logger.warn(
        `storefront-revalidate: ${url} answered ${response.status} for ${batch.tags.join(", ")}`,
      );
      return false;
    }
    // The storefront skips a tag it does not know (a handle outside its pattern) and says which.
    const answer = (await response.json().catch(() => null)) as { skipped?: unknown } | null;
    if (Array.isArray(answer?.skipped) && answer.skipped.length > 0) {
      logger.warn(`storefront-revalidate: ${url} skipped ${answer.skipped.join(", ")}`);
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
