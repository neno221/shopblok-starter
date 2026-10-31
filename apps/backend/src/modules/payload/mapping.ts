/**
 * What Medusa's records become in Payload (D75; products, categories and collections only since M4b, D95). Pure: the records arrive as `query.graph`
 * returns them, so the mapping is tested without a database, against the shared fixture
 * (`@shopblok/fixtures/sync/documents.json`) that the storefront's collection test reads too.
 *
 * Default locale only: catalog translations stay in Medusa. `handle` is written on create and on
 * every update, and a product's thumbnail as its URL (the Medusa × Payload guide's two gaps).
 */

import type { SyncCollection, SyncDocument } from "@shopblok/fixtures/sync" with {
  "resolution-mode": "import",
};

export type { SyncCollection, SyncDocument };

export const SYNC_COLLECTIONS: readonly SyncCollection[] = [
  "products",
  "categories",
  "collections",
];

/**
 * A Payload document's synced part: its fields, and its references to other synced documents by
 * Medusa id (written as Payload ids once the document exists, the workflow's second step).
 */

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
