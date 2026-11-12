import type { SearchTypes } from "@medusajs/framework/types";
import {
  defineSearchIndex,
  graphConsume,
  graphSeed,
  search,
} from "@medusajs/framework/utils";

import { toFacetIds, trimmed } from "./helpers/facets";
import { type ProductOptionRow, toOptionValues } from "./helpers/option-values";
import { loadPricing, priceFields, toProductPricing } from "./helpers/pricing";
import { resolveProductIds } from "./helpers/resolve-product-ids";
import {
  DEFAULT_LOCALE,
  type ProductTexts,
  readTexts,
  resolveTranslationProductIds,
  storeLocales,
  toLocaleSearchText,
  toSearchText,
} from "./helpers/translations";
import { MEILISEARCH_PROVIDER_ID } from "../modules/meilisearch-search/locales";

// The ids of categories, options and values are the facets, and selecting them
// is also what makes `query.graph(…, { locale })` translate those objects.
const PRODUCT_GRAPH_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "collection_id",
  "sales_channels.id",
  "categories.id",
  "categories.name",
  "tags.id",
  "tags.value",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
];

type ProductRow = {
  id: string;
  title?: string | null;
  handle?: string | null;
  thumbnail?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  deleted_at?: string | Date | null;
  collection_id?: string | null;
  sales_channels?: ({ id?: string | null } | null)[] | null;
  categories?: ({ id?: string | null; name?: string | null } | null)[] | null;
  tags?: ({ id?: string | null; value?: string | null } | null)[] | null;
  options?: (ProductOptionRow & {
    id?: string | null;
    values?: ({ id?: string | null; value?: string | null } | null)[] | null;
  })[] | null;
};

/**
 * The key under which a document carries each locale's texts for the
 * Meilisearch provider, which writes one copy per locale (ADR 0002's B, D126).
 */
const LOCALIZED_FIELD = "_locales";

/**
 * One multilingual index (ADR 0002's A′, D63) on `search-postgres`, one index
 * per locale on Meilisearch (B, D126), from the same fields and the same
 * reads: on Postgres `search_text` holds every store locale's text, so a query
 * in any language finds the product, and a language added in the store needs
 * no restart or migration; on Meilisearch each locale's copy holds only that
 * locale's `search_text`, `title`, `category`, `option_values` and `labels`
 * (`toDocument`'s `_locales`), and a new locale's index appears with its first
 * write. `title` is the default
 * language's: sortable, and searched with more weight, so a title match ranks
 * above a word in a description; `category`, `option_values` and `labels` are
 * the default language's labels for the hits. The facets are ids, which the
 * storefront labels in the visitor's locale.
 */
const productFields = search.define({
  id: search.keyword().filterable().retrievable(),
  // Read by `/store/search` to scope the index; never returned to hits.
  status: search.keyword().filterable().retrievable(false),
  sales_channel_ids: search.keyword().array().filterable().retrievable(false),
  search_text: search.text().searchable({ weight: 2 }).retrievable(false),
  title: search.text().searchable({ weight: 3 }).sortable().retrievable(),
  handle: search.keyword().retrievable(),
  // Returned on hits only: never filtered, sorted or faceted on.
  thumbnail: search.keyword().retrievable(),
  created_at: search.date().sortable().retrievable(),
  category: search.keyword().array().retrievable(),
  option_values: search.keyword().array().retrievable(),
  category_ids: search.keyword().array().filterable().facetable().retrievable(),
  collection_ids: search
    .keyword()
    .array()
    .filterable()
    .facetable()
    .retrievable(),
  option_value_ids: search
    .keyword()
    .array()
    .filterable()
    .facetable()
    .retrievable(),
  tag_ids: search.keyword().array().filterable().facetable().retrievable(),
  labels: search.keyword().array().retrievable(),
  ...priceFields,
});

type ProductDocument = SearchTypes.InferSearchDocumentType<
  typeof productFields
>;

/** The fields a locale's copy replaces on Meilisearch: what is written in a language. */
function localizedTexts(texts: ProductTexts) {
  return {
    search_text: toLocaleSearchText(texts),
    title: texts.title || null,
    category: texts.categories,
    option_values: texts.option_values,
    labels: texts.tags,
  };
}

function toDocument(
  product: ProductRow,
  pricing: Parameters<typeof toProductPricing>[0],
  texts: Map<string, ProductTexts> | undefined,
  perLocale: boolean,
): ProductDocument {
  const searchText = toSearchText(texts);

  return {
    id: product.id,
    status: product.status ?? null,
    sales_channel_ids: trimmed(
      (product.sales_channels ?? []).map((salesChannel) => salesChannel?.id),
    ),
    search_text: searchText,
    title: product.title ?? null,
    handle: product.handle ?? null,
    thumbnail: product.thumbnail ?? null,
    created_at: product.created_at ?? null,
    category: trimmed((product.categories ?? []).map((c) => c?.name)),
    option_values: toOptionValues(product.options),
    ...toFacetIds(product),
    labels: trimmed((product.tags ?? []).map((tag) => tag?.value)),
    ...toProductPricing(pricing),
    // Not a field: the Meilisearch provider fans it out and never stores it.
    // Postgres keeps every document as it is given, so it gets none.
    ...(perLocale && texts
      ? {
          [LOCALIZED_FIELD]: Object.fromEntries(
            [...texts].map(([locale, t]) => [locale, localizedTexts(t)]),
          ),
        }
      : {}),
  } as ProductDocument;
}

/**
 * A row that returns no document leaves
 * the index: the helpers turn it into a delete on `consume` and on the
 * catch-up pass. `seed` and `consume` share it: the store's locales are read
 * once per batch, then each locale's texts once per batch.
 */
const source = {
  fields: PRODUCT_GRAPH_FIELDS,
  transform: async (
    rows: ProductRow[],
    context: SearchTypes.SearchIngestionContext,
  ) => {
    const { query } = context.container;
    const ids = rows.map((row) => row.id);
    const [pricing, texts] = await Promise.all([
      loadPricing(ids, context),
      storeLocales(query).then((locales) => readTexts(query, ids, locales)),
    ]);

    // The provider of the index being written: Medusa hands the definition
    // over with it (`default_provider`, or Meilisearch's once its keys are set).
    const perLocale = context.index.provider === MEILISEARCH_PROVIDER_ID;

    return rows.map((row) =>
      toDocument(row, pricing.get(row.id), texts.get(row.id), perLocale),
    );
  },
};

/** Translations are mapped to products through the `translations` entity. */
function resolveIds(
  event: { name: string; data: unknown },
  context: SearchTypes.SearchIngestionContext,
) {
  return event.name.startsWith("translation.")
    ? resolveTranslationProductIds(event, context)
    : resolveProductIds(event, context);
}

/**
 * Everything a document is built from, so a change to any of it re-indexes the
 * products it touches. Only `product.deleted` removes documents: a deleted
 * variant, option, tag, category or collection means the product has to be
 * re-read. A `translation.*` event re-reads the products whose texts it
 * changes.
 *
 * Each translation row emits its own event, and each event re-reads its
 * products in every locale, so a bulk change of translations (a CSV import, a
 * script) ends with `searchModule.reindex({ index: "product" })` instead of
 * waiting for the backlog (SETUP.md, "Search on Postgres (T43)").
 *
 * TODO: price lists' events (Medusa 2.22: created, updated, deleted, prices_added,
 * prices_updated, prices_removed) are not followed here yet; the storefront's
 * revalidation follows them (`lib/storefront-revalidate.ts`, D112).
 * TODO: price lists crossing their start or end date change prices silently.
 * TODO: linkProductsToSalesChannelWorkflow emits nothing.
 * TODO: batchLinkProductsToCategoryWorkflow emits nothing.
 * TODO: upsertVariantPricesWorkflow emits nothing when called directly.
 */
const PRODUCT_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product-variant.created",
  "product-variant.updated",
  "product-variant.deleted",
  "product-option.created",
  "product-option.updated",
  "product-option.deleted",
  "product-option-value.updated",
  "product-option-value.deleted",
  "product-tag.updated",
  "product-tag.deleted",
  "product-category.updated",
  "product-category.deleted",
  "product-collection.updated",
  "product-collection.deleted",
  "sales-channel.deleted",
  "translation.created",
  "translation.updated",
  "translation.deleted",
];

export default defineSearchIndex({
  name: "product",
  entity: "product",
  primary_key: "id",
  fields: productFields,
  settings: {
    typo_tolerance: { enabled: true },
    // What the Meilisearch provider needs to hold one index per locale, and no
    // list of locales (ADR 0002, T7): a locale's index appears with its first
    // write, so a language added in the store changes nothing here (D126).
    // `search-postgres` ignores it.
    provider_options: {
      meilisearch: {
        localized_field: LOCALIZED_FIELD,
        default_locale: DEFAULT_LOCALE,
      },
    },
  },
  events: PRODUCT_EVENTS,
  consume: graphConsume<typeof productFields, ProductRow>({
    ...source,
    resolve_ids: resolveIds,
    is_delete: (event) => event.name === "product.deleted",
  }),
  seed: graphSeed<typeof productFields, ProductRow>(source),
});
