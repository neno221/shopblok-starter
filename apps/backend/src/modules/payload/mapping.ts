/**
 * What Medusa's records become in Payload (D75, D76). Pure: the records arrive as `query.graph`
 * returns them, so the mapping is tested without a database, against the shared fixture
 * (`@shopblok/fixtures/sync/documents.json`) that the storefront's collection test reads too.
 *
 * Default locale only: catalog translations stay in Medusa. `handle` is written on create and on
 * every update, and a product's thumbnail as its URL (the Medusa × Payload guide's two gaps).
 */

export type SyncCollection = "products" | "categories" | "collections";

export const SYNC_COLLECTIONS: readonly SyncCollection[] = [
  "products",
  "categories",
  "collections",
];

/**
 * A Payload document's synced part: its fields, and its references to other synced documents by
 * Medusa id (written as Payload ids once the document exists, the workflow's second step).
 */
export type SyncDocument = {
  fields: { medusaId: string } & Record<string, unknown>;
  references: Record<string, string | null>;
};

type Timestamp = Date | string;

export type MedusaProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail?: string | null;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;
};

export type MedusaCategory = {
  id: string;
  handle: string;
  name: string;
  rank?: number | null;
  parent_category_id?: string | null;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;
};

export type MedusaCollection = {
  id: string;
  handle: string;
  title: string;
  updated_at: Timestamp;
  deleted_at?: Timestamp | null;
};

export type MedusaRegion = {
  id: string;
  name: string;
  currency_code: string;
  countries?: ({ iso_2?: string | null } | null)[] | null;
};

export type MedusaStore = {
  supported_currencies?: ({ currency_code: string; is_default?: boolean | null } | null)[] | null;
  supported_locales?: ({ locale_code: string } | null)[] | null;
};

/** The `markets` global's synced part. Medusa 2.21.2's store has no default locale. */
export type MarketsSynced = {
  regions: { medusaId: string; name: string; currency: string; countries: string[] }[];
  currencies: string[];
  defaultCurrency: string | null;
  locales: string[];
};

/** Which Medusa entity each collection follows, for `query.graph`. */
export const ENTITY: Record<SyncCollection, "product" | "product_category" | "product_collection"> =
  {
    products: "product",
    categories: "product_category",
    collections: "product_collection",
  };

/** The fields `query.graph` reads for each collection: exactly what the mapping uses. */
export const QUERY_FIELDS: Record<SyncCollection, string[]> = {
  products: ["id", "handle", "title", "thumbnail", "updated_at", "deleted_at"],
  categories: ["id", "handle", "name", "rank", "parent_category_id", "updated_at", "deleted_at"],
  collections: ["id", "handle", "title", "updated_at", "deleted_at"],
};

export const REGION_FIELDS = ["id", "name", "currency_code", "countries.iso_2"];
export const STORE_FIELDS = [
  "supported_currencies.currency_code",
  "supported_currencies.is_default",
  "supported_locales.locale_code",
];

/** The fields the sync writes in each collection, besides `syncedAt`; the rest are the CMS's. */
export const SYNCED_FIELDS: Record<SyncCollection, string[]> = {
  products: ["medusaId", "title", "handle", "thumbnail", "deletedInMedusa", "medusaUpdatedAt"],
  categories: [
    "medusaId",
    "title",
    "handle",
    "rank",
    "parent",
    "deletedInMedusa",
    "medusaUpdatedAt",
  ],
  collections: ["medusaId", "title", "handle", "deletedInMedusa", "medusaUpdatedAt"],
};

/** Medusa's timestamps arrive as `Date` from a module and as strings over HTTP. */
export const isoTime = (value: Timestamp): string => new Date(value).toISOString();

const deleted = (value: Timestamp | null | undefined): boolean =>
  value !== null && value !== undefined;

export function productDocument(product: MedusaProduct): SyncDocument {
  return {
    fields: {
      medusaId: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail ?? null,
      deletedInMedusa: deleted(product.deleted_at),
      medusaUpdatedAt: isoTime(product.updated_at),
    },
    references: {},
  };
}

export function categoryDocument(category: MedusaCategory): SyncDocument {
  return {
    fields: {
      medusaId: category.id,
      title: category.name,
      handle: category.handle,
      rank: category.rank ?? 0,
      deletedInMedusa: deleted(category.deleted_at),
      medusaUpdatedAt: isoTime(category.updated_at),
    },
    references: { parent: category.parent_category_id ?? null },
  };
}

export function collectionDocument(collection: MedusaCollection): SyncDocument {
  return {
    fields: {
      medusaId: collection.id,
      title: collection.title,
      handle: collection.handle,
      deletedInMedusa: deleted(collection.deleted_at),
      medusaUpdatedAt: isoTime(collection.updated_at),
    },
    references: {},
  };
}

export function documentOf(collection: SyncCollection, record: unknown): SyncDocument {
  switch (collection) {
    case "products":
      return productDocument(record as MedusaProduct);
    case "categories":
      return categoryDocument(record as MedusaCategory);
    case "collections":
      return collectionDocument(record as MedusaCollection);
  }
}

/**
 * Parents before their children, so a bulk run finds each category's parent already in Payload.
 * A parent outside the list (or a cycle, which Medusa does not allow) puts the category last.
 */
export function parentsFirst(documents: SyncDocument[]): SyncDocument[] {
  const byId = new Map(documents.map((document) => [document.fields.medusaId, document]));
  const depth = (document: SyncDocument, seen = new Set<string>()): number => {
    const parent = document.references.parent;
    if (!parent || seen.has(parent)) return 0;
    const parentDocument = byId.get(parent);
    if (parentDocument === undefined) return 0;
    seen.add(document.fields.medusaId);
    return 1 + depth(parentDocument, seen);
  };
  return documents
    .map((document, index) => ({ document, index, depth: depth(document) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map(({ document }) => document);
}

/**
 * The markets' synced part from the regions and the store. Sorted, so the same Medusa data always
 * gives the same value and the reconcile job writes only a real change.
 */
export function marketsSynced(
  regions: MedusaRegion[],
  store: MedusaStore | null | undefined,
): MarketsSynced {
  const currencies = (store?.supported_currencies ?? []).flatMap((currency) =>
    currency ? [currency] : [],
  );
  return {
    regions: regions
      .map((region) => ({
        medusaId: region.id,
        name: region.name,
        currency: region.currency_code,
        countries: (region.countries ?? [])
          .flatMap((country) => (country?.iso_2 ? [country.iso_2.toLowerCase()] : []))
          .sort(),
      }))
      .sort((a, b) => a.medusaId.localeCompare(b.medusaId)),
    currencies: currencies.map((currency) => currency.currency_code).sort(),
    defaultCurrency: currencies.find((currency) => currency.is_default)?.currency_code ?? null,
    locales: (store?.supported_locales ?? [])
      .flatMap((locale) => (locale ? [locale.locale_code] : []))
      .sort(),
  };
}

/** Two synced parts hold the same data (`syncedAt` and Payload's row ids aside). */
export function sameMarkets(a: MarketsSynced, b: MarketsSynced): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
