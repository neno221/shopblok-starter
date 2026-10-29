import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { localeHeaders, medusaRequest } from "./sdk";

/** An amount in major units (Medusa v2 returns 12.5 for €12.50: never ÷100) and its currency. */
export type Money = {
  amount: number;
  /** ISO 4217, lowercase as Medusa has it. */
  currencyCode: string;
};

// --- T47: the catalog's product reads (D58, D61) -------------------------------------------------

/** A value of one of the product's options, in the language asked for. */
export type ProductOptionDto = {
  id: string;
  title: string;
  values: { id: string; value: string }[];
};

/** Stock as the storefront shows it (SPEC §8.4): only the three words, and the count when low. */
export type StockDto = { status: "in-stock" | "low" | "out"; quantity?: number };

export type ProductVariantDto = {
  id: string;
  title: string;
  sku: string | null;
  /** Option id to value id, one per option. */
  options: Record<string, string>;
  /** The calculated price in the region, `null` when the variant has none there. */
  price: Money | null;
  /** The price before a sale (`original_amount`), only when it is higher than `price`. */
  compareAt: Money | null;
  stock: StockDto;
  /** Can go in the cart: in stock, not tracked, or sold on backorder. */
  available: boolean;
  thumbnail: string | null;
};

export type ProductDto = {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string;
  thumbnail: string | null;
  images: { id: string; url: string }[];
  options: ProductOptionDto[];
  variants: ProductVariantDto[];
  /** The product's categories, the first one the breadcrumb's (D61). */
  categories: { id: string; handle: string; name: string }[];
  collectionId: string | null;
  tagIds: string[];
};

/** Fewer than this many left is "low" (D61). StockIndicator draws the word; the storefront picks it. */
export const LOW_STOCK_BELOW = 5;

type WireVariant = {
  id: string;
  title?: string | null;
  sku?: string | null;
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_quantity?: number | null;
  thumbnail?: string | null;
  options?: ({ id?: string | null; option_id?: string | null } | null)[] | null;
  calculated_price?: {
    calculated_amount?: number | null;
    original_amount?: number | null;
    currency_code?: string | null;
  } | null;
};

export type WireProduct = {
  id: string;
  handle: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  collection_id?: string | null;
  images?: ({ id?: string | null; url?: string | null } | null)[] | null;
  options?:
    | ({
        id?: string | null;
        title?: string | null;
        values?: ({ id?: string | null; value?: string | null } | null)[] | null;
      } | null)[]
    | null;
  variants?: WireVariant[] | null;
  categories?:
    ({ id?: string | null; handle?: string | null; name?: string | null } | null)[] | null;
  tags?: ({ id?: string | null } | null)[] | null;
};

/** Medusa's stock fields as the three words: an untracked variant or a backorder is never "out". */
export function toStock(variant: WireVariant): StockDto {
  if (variant.manage_inventory !== true) return { status: "in-stock" };
  const quantity = Math.max(0, variant.inventory_quantity ?? 0);
  if (quantity === 0)
    return variant.allow_backorder === true ? { status: "in-stock" } : { status: "out" };
  return quantity < LOW_STOCK_BELOW ? { status: "low", quantity } : { status: "in-stock" };
}

const present = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/** The Store API's product as the DTO: ids and texts only, nothing of the SDK's shape kept. */
export function toProductDto(product: WireProduct): ProductDto {
  const variants = (product.variants ?? []).map((variant): ProductVariantDto => {
    const price = variant.calculated_price;
    const currencyCode = price?.currency_code ?? undefined;
    const amount = price?.calculated_amount;
    const original = price?.original_amount;
    const stock = toStock(variant);
    return {
      id: variant.id,
      title: variant.title ?? "",
      sku: variant.sku ?? null,
      options: Object.fromEntries(
        (variant.options ?? [])
          .filter(present)
          .flatMap((value) => (value.id && value.option_id ? [[value.option_id, value.id]] : [])),
      ),
      price: typeof amount === "number" && currencyCode ? { amount, currencyCode } : null,
      compareAt:
        typeof amount === "number" &&
        typeof original === "number" &&
        original > amount &&
        currencyCode
          ? { amount: original, currencyCode }
          : null,
      stock,
      available: stock.status !== "out",
      thumbnail: variant.thumbnail ?? null,
    };
  });
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? "",
    thumbnail: product.thumbnail ?? null,
    images: (product.images ?? [])
      .filter(present)
      .flatMap((image) => (image.id && image.url ? [{ id: image.id, url: image.url }] : [])),
    options: (product.options ?? []).filter(present).flatMap((option) =>
      option.id && option.title
        ? [
            {
              id: option.id,
              title: option.title,
              values: (option.values ?? [])
                .filter(present)
                .flatMap((value) =>
                  value.id && value.value ? [{ id: value.id, value: value.value }] : [],
                ),
            },
          ]
        : [],
    ),
    variants,
    categories: (product.categories ?? [])
      .filter(present)
      .flatMap((category) =>
        category.id && category.handle && category.name
          ? [{ id: category.id, handle: category.handle, name: category.name }]
          : [],
      ),
    collectionId: product.collection_id ?? null,
    tagIds: (product.tags ?? []).filter(present).flatMap((tag) => (tag.id ? [tag.id] : [])),
  };
}

/** What a product page and a card read: every variant with its price and stock, and the options. */
export const PRODUCT_DETAIL_FIELDS = [
  "id",
  "handle",
  "title",
  "subtitle",
  "description",
  "thumbnail",
  "collection_id",
  "*images",
  "*options",
  "*options.values",
  "*variants",
  "*variants.options",
  "*variants.calculated_price",
  "+variants.inventory_quantity",
  "*categories",
  "*tags",
].join(",");

export type ProductQuery = {
  /** The region prices are calculated for. */
  regionId: string;
  /** The market's Medusa locale (D8). */
  locale: string;
};

async function fetchProduct(
  handle: string,
  { regionId, locale }: ProductQuery,
): Promise<ProductDto | null> {
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list(
      { handle, region_id: regionId, limit: 1, fields: PRODUCT_DETAIL_FIELDS },
      localeHeaders(locale),
    ),
  );
  const [product] = products as unknown as WireProduct[];
  return product === undefined ? null : toProductDto(product);
}

/**
 * One product by its handle, in the region's prices and the locale's texts, or `null` when the
 * key's sales channel has no published product with it (the page's `notFound()`). Tagged with the
 * handle, so the revalidation subscriber (T49) refreshes this product alone.
 */
export const getProduct = cached(fetchProduct, {
  name: "medusa:products:one",
  tags: ["medusa:products"],
  tagsFor: (handle) => [`product:${handle}`],
  life: CATALOG_LIFE,
});

/** Ids per request: the Store API caps `limit`, and a cart or a search page has fewer. */
const IDS_PER_REQUEST = 100;

/**
 * Products by id as `listProductsByIds` reads them, uncached: a cart's lines (PR 73 review), whose
 * stock must be the current one, since a product's revalidation by its handle does not reach a
 * cached set of ids. A cart read is per visitor anyway.
 */
export async function readProductsByIds(
  ids: readonly string[],
  { regionId, locale }: ProductQuery,
): Promise<ProductDto[]> {
  const unique = [...new Set(ids)];
  const pages: string[][] = [];
  for (let start = 0; start < unique.length; start += IDS_PER_REQUEST)
    pages.push(unique.slice(start, start + IDS_PER_REQUEST));
  const answers = await Promise.all(
    pages.map((page) =>
      medusaRequest((sdk) =>
        sdk.store.product.list(
          { id: page, region_id: regionId, limit: page.length, fields: PRODUCT_DETAIL_FIELDS },
          localeHeaders(locale),
        ),
      ),
    ),
  );
  const byId = new Map(
    answers.flatMap(({ products }) =>
      (products as unknown as WireProduct[]).map(
        (product) => [product.id, toProductDto(product)] as const,
      ),
    ),
  );
  // In the order asked for (a search's ranking), without the ids the channel does not sell.
  return unique.flatMap((id) => {
    const product = byId.get(id);
    return product === undefined ? [] : [product];
  });
}

/**
 * Products by id, in the order of `ids`, with prices and texts: the search's hits (ADR 0002: one
 * `/store/products?id[]=` call with the locale header), a cart's lines' options and pictures, the
 * related products. Pass the ids sorted when their order does not matter, so equal sets share an
 * entry.
 */
export const listProductsByIds = cached(readProductsByIds, {
  name: "medusa:products:by-id",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});

async function fetchProductHandles(limit: number): Promise<string[]> {
  const handles: string[] = [];
  let offset = 0;
  while (handles.length < limit) {
    const take = Math.min(IDS_PER_REQUEST, limit - handles.length);
    const page = await medusaRequest((sdk) =>
      sdk.store.product.list({ fields: "handle", order: "handle", limit: take, offset }),
    );
    handles.push(...page.products.map((product) => product.handle));
    offset += page.products.length;
    if (page.products.length === 0 || offset >= page.count) break;
  }
  return handles;
}

/**
 * The first `limit` published handles in handle order (D58: `generateStaticParams` of the PDP, up
 * to `STOREFRONT_PRERENDER_PRODUCTS`), so which products a build left out is known.
 */
export const listProductHandles = cached(fetchProductHandles, {
  name: "medusa:products:handles",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});

/** An option value with its option, in a locale: what a facet's checkbox or swatch is labelled with. */
export type OptionValueLabel = {
  optionId: string;
  optionTitle: string;
  valueId: string;
  value: string;
};

async function fetchOptionValueLabels(locale: string): Promise<OptionValueLabel[]> {
  const labels = new Map<string, OptionValueLabel>();
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.product.list(
        {
          fields: "id,options.id,options.title,options.values.id,options.values.value",
          limit: IDS_PER_REQUEST,
          offset,
        },
        localeHeaders(locale),
      ),
    );
    for (const product of page.products as unknown as WireProduct[])
      for (const option of toProductDto({ ...product, handle: "", title: "" }).options)
        for (const value of option.values)
          labels.set(value.id, {
            optionId: option.id,
            optionTitle: option.title,
            valueId: value.id,
            value: value.value,
          });
    offset += page.products.length;
    if (page.products.length === 0 || offset >= page.count) return [...labels.values()];
  }
}

/**
 * Every option value of the published products, translated: the labels of the search's
 * `option_value_ids` facet (D63). `/store/product-options` does not translate in Medusa 2.21.2
 * (checked: `x-medusa-locale: el-GR` answered "Color" and "Black"), while the products' own options
 * do, so the labels are read through the products, a page of 100 at a time, once per locale.
 */
export const listOptionValueLabels = cached(fetchOptionValueLabels, {
  name: "medusa:option-values",
  tags: ["medusa:products", "search"],
  life: CATALOG_LIFE,
});

/** A scalar `metadata` value as text; anything else (an object, a list, nothing) is no value. */
function metadataText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return undefined;
}

async function fetchProductMetadata(
  ids: readonly string[],
  keys: readonly string[],
): Promise<Record<string, Record<string, string>>> {
  const unique = [...new Set(ids)].slice(0, IDS_PER_REQUEST);
  if (unique.length === 0 || keys.length === 0) return {};
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list({ id: unique, limit: unique.length, fields: "id,metadata" }),
  );
  return Object.fromEntries(
    (products as unknown as { id: string; metadata?: Record<string, unknown> | null }[]).map(
      (product) => [
        product.id,
        Object.fromEntries(
          keys.flatMap((key) => {
            const text = metadataText(product.metadata?.[key]);
            return text === undefined ? [] : [[key, text]];
          }),
        ),
      ],
    ),
  );
}

/**
 * The `metadata` values a comparison names (T64, SPEC §7.4 `comparison`), by product id: only the
 * keys asked for, and only scalar values, as text. The product DTO keeps no metadata (a shop may
 * hold anything there); this read brings out what an editor chose to show, nothing else.
 */
export const listProductMetadata = cached(fetchProductMetadata, {
  name: "medusa:products:metadata",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});
