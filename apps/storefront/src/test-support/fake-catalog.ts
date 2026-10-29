// A small shop as `CatalogReads` give it (T64), for the commerce blocks' resolver tests: products
// priced per region (EUR in Cyprus, USD in the US) and named per language (Greek, English), a
// category tree, two collections, a tag and a type, and metadata. Each market gets its own reads,
// as `catalogReads` makes them, and each read is recorded. Not a test file.
import type { CatalogReads } from "../lib/cms/resolve/catalog";
import type { CategoryNode } from "../lib/medusa/categories";
import type { ProductDto } from "../lib/medusa/products";
import type { SearchFilters } from "../lib/medusa/search";

export type FakeMarket = { currency: "eur" | "usd"; language: "el" | "en" };

export const cyprus: FakeMarket = { currency: "eur", language: "el" };
export const unitedStates: FakeMarket = { currency: "usd", language: "en" };

type FakeProduct = {
  id: string;
  /** Titles by language. */
  title: { el: string; en: string };
  /** The price by currency, as the data layer's `Money` holds it; `null` where it is not sold. */
  price: { eur: number | null; usd: number | null };
  /** A sale price's original, by currency. */
  compareAt?: { eur?: number; usd?: number };
  categoryIds: string[];
  collectionId: string | null;
  tagIds: string[];
  typeId: string | null;
  metadata: Record<string, string>;
  /** Higher is newer. */
  created: number;
  image: string | null;
  options?: { title: { el: string; en: string }; values: string[] }[];
};

export const fakeProducts: FakeProduct[] = [
  {
    id: "prod_hoodie",
    title: { el: "Φούτερ", en: "Hoodie" },
    price: { eur: 59, usd: 65 },
    categoryIds: ["cat_tops"],
    collectionId: "col_basics",
    tagIds: ["tag_cotton"],
    typeId: "type_top",
    metadata: { material: "Cotton" },
    created: 5,
    image: "https://cdn.example/hoodie.jpg",
    options: [{ title: { el: "Χρώμα", en: "Colour" }, values: ["Black", "Navy"] }],
  },
  {
    id: "prod_tee",
    title: { el: "Μπλουζάκι", en: "T-shirt" },
    price: { eur: 25, usd: 28 },
    compareAt: { eur: 30, usd: 34 },
    categoryIds: ["cat_tops"],
    collectionId: "col_summer",
    tagIds: [],
    typeId: "type_top",
    metadata: {},
    created: 4,
    image: "https://cdn.example/tee.jpg",
  },
  {
    id: "prod_cap",
    title: { el: "Καπέλο", en: "Cap" },
    price: { eur: 19, usd: 21 },
    categoryIds: ["cat_accessories"],
    collectionId: "col_summer",
    tagIds: ["tag_cotton"],
    typeId: null,
    metadata: { material: "Canvas" },
    created: 3,
    image: null,
  },
  {
    id: "prod_mug",
    title: { el: "Κούπα", en: "Mug" },
    price: { eur: 12, usd: 14 },
    categoryIds: ["cat_home"],
    collectionId: null,
    tagIds: [],
    typeId: null,
    metadata: {},
    created: 2,
    image: "https://cdn.example/mug.jpg",
  },
  {
    // Sold in Cyprus only: no USD price, so the US market does not show it.
    id: "prod_lamp",
    title: { el: "Φωτιστικό", en: "Lamp" },
    price: { eur: 80, usd: null },
    categoryIds: ["cat_home"],
    collectionId: null,
    tagIds: [],
    typeId: null,
    metadata: {},
    created: 1,
    image: "https://cdn.example/lamp.jpg",
  },
];

const tree = (language: FakeMarket["language"]): CategoryNode[] => {
  const name = (el: string, en: string) => (language === "el" ? el : en);
  return [
    {
      id: "cat_apparel",
      handle: "apparel",
      name: name("Ρούχα", "Apparel"),
      children: [{ id: "cat_tops", handle: "tops", name: name("Μπλούζες", "Tops"), children: [] }],
    },
    {
      id: "cat_accessories",
      handle: "accessories",
      name: name("Αξεσουάρ", "Accessories"),
      children: [],
    },
    { id: "cat_home", handle: "home", name: name("Σπίτι", "Home"), children: [] },
  ];
};

const asDto = (product: FakeProduct, { currency, language }: FakeMarket): ProductDto => {
  const amount = product.price[currency];
  const original = product.compareAt?.[currency];
  return {
    id: product.id,
    handle: product.id.replace("prod_", ""),
    title: product.title[language],
    subtitle: null,
    description: "",
    thumbnail: product.image,
    images: product.image === null ? [] : [{ id: `img_${product.id}`, url: product.image }],
    options: (product.options ?? []).map((option, index) => ({
      id: `opt_${product.id}_${index}`,
      title: option.title[language],
      values: option.values.map((value) => ({ id: `${product.id}_${value}`, value })),
    })),
    variants: [
      {
        id: `var_${product.id}`,
        title: "Default",
        sku: null,
        options: {},
        price: amount === null ? null : { amount, currencyCode: currency },
        compareAt: original === undefined ? null : { amount: original, currencyCode: currency },
        stock: { status: "in-stock" },
        available: true,
        thumbnail: null,
      },
    ],
    categories: [],
    collectionId: product.collectionId,
    tagIds: product.tagIds,
  };
};

const matches = (product: FakeProduct, filters: SearchFilters) =>
  (filters.productIds === undefined || filters.productIds.includes(product.id)) &&
  (filters.categoryIds === undefined ||
    product.categoryIds.some((id) => filters.categoryIds?.includes(id))) &&
  (filters.collectionIds === undefined ||
    (product.collectionId !== null && filters.collectionIds.includes(product.collectionId))) &&
  (filters.tagIds === undefined || product.tagIds.some((id) => filters.tagIds?.includes(id))) &&
  (filters.onSale !== true || product.compareAt !== undefined);

export type FakeCatalog = {
  reads: CatalogReads;
  /** Every read, by name, with its arguments. */
  calls: { read: keyof CatalogReads; args: unknown[] }[];
  /** Products Medusa has deleted since: gone from every read, as from the Store API. */
  deleted: Set<string>;
};

/** One market's reads of the fake shop: its region's prices, its language's names. */
export function fakeCatalog(market: FakeMarket): FakeCatalog {
  const calls: FakeCatalog["calls"] = [];
  const deleted = new Set<string>();
  // The Store API's rule: only products with a price in the region, and not deleted.
  const live = () =>
    fakeProducts.filter((each) => !deleted.has(each.id) && each.price[market.currency] !== null);
  const record =
    <A extends unknown[], R>(read: keyof CatalogReads, fn: (...args: A) => R) =>
    (...args: A): R => {
      calls.push({ read, args });
      return fn(...args);
    };
  const reads: CatalogReads = {
    search: record("search", async ({ filters, sort, limit }) => {
      const price = (each: FakeProduct) => each.price[market.currency] ?? 0;
      const order: Record<typeof sort, (a: FakeProduct, b: FakeProduct) => number> = {
        newest: (a, b) => b.created - a.created,
        "price-asc": (a, b) => price(a) - price(b),
        "price-desc": (a, b) => price(b) - price(a),
        title: (a, b) => a.title[market.language].localeCompare(b.title[market.language]),
      };
      return live()
        .filter((each) => matches(each, filters))
        .sort(order[sort])
        .slice(0, limit)
        .map((each) => each.id);
    }),
    products: record("products", async (ids) =>
      ids.flatMap((id) => {
        const found = live().find((each) => each.id === id);
        return found === undefined ? [] : [asDto(found, market)];
      }),
    ),
    categories: record("categories", async () => tree(market.language)),
    collections: record("collections", async () => [
      {
        id: "col_basics",
        handle: "everyday-basics",
        title: market.language === "el" ? "Βασικά" : "Basics",
      },
      {
        id: "col_summer",
        handle: "summer-edit",
        title: market.language === "el" ? "Καλοκαίρι" : "Summer",
      },
    ]),
    metadata: record("metadata", async (ids, keys) =>
      Object.fromEntries(
        live()
          .filter((each) => ids.includes(each.id))
          .map((each) => [
            each.id,
            Object.fromEntries(Object.entries(each.metadata).filter(([key]) => keys.includes(key))),
          ]),
      ),
    ),
    tagId: record("tagId", async (value) => (value === "cotton" ? "tag_cotton" : null)),
    typeProductIds: record("typeProductIds", async (value) =>
      fakeProducts.filter((each) => each.typeId === `type_${value}`).map((each) => each.id),
    ),
  };
  return { reads, calls, deleted };
}

/** A synced document as a reference populates it (D75): its Medusa id, deleted or not. */
export const synced = (medusaId: string, deletedInMedusa = false) => ({
  id: `doc_${medusaId}`,
  medusaId,
  deletedInMedusa,
});
