/**
 * S2 prototype (not for main, D13). The index definitions of the three candidates, registered
 * only when `S2_SPIKE` is set, so a normal boot sees just `product`. Every definition is on the
 * `product` entity and has its own name, so the spec can run all of them over the same data.
 *
 * - A (`s2_pg_a`, `s2_ms_a`): per-locale fields (`title_el_GR`, ...) in one index, generated
 *   from a static list of locales (`staticLocales()`).
 * - A' (`s2_pg_ap`, `s2_ms_ap`): one searchable field, `search_text`, that holds every
 *   locale's text; facets use category ids.
 * - B (`s2_ms_b`): the base fields, plus the per-locale texts under `_locales`, which the
 *   Meilisearch provider fans out into one index per locale.
 *
 * A needs its locales when the module loads. A' and B read the store's `supported_locales`
 * each time they build a document, so they follow the database.
 */
import type { SearchTypes } from "@medusajs/framework/types";
import {
  defineSearchIndex,
  graphConsume,
  graphSeed,
  isTruthy,
  search,
} from "@medusajs/framework/utils";

import { toOptionValues } from "./helpers/option-values";
import { loadPricing, priceFields, toProductPricing } from "./helpers/pricing";
import { resolveProductIds } from "./helpers/resolve-product-ids";
import {
  DEFAULT_LOCALE,
  localeToken,
  localizedFields,
  S2_EVENTS,
  S2_INDEXES,
  type S2Index,
  staticLocales,
} from "./helpers/s2-shared";

type Named = { id?: string | null; name?: string | null } | null;

type ProductRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  thumbnail?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  sales_channels?: ({ id?: string | null } | null)[] | null;
  categories?: Named[] | null;
  tags?: ({ value?: string | null } | null)[] | null;
  options?: Parameters<typeof toOptionValues>[0];
};

type Texts = {
  title: string;
  description: string;
  category: string[];
  option_values: string[];
};

const GRAPH_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "sales_channels.id",
  "categories.id",
  "categories.name",
  "tags.value",
  "options.title",
  "options.values.value",
];

// Medusa applies a translation to a nested object only when the object carries its `id`, so the
// ids of the categories, options and values are selected even though the document never holds
// them. Without them `categories.name` comes back in the default language.
const TEXT_FIELDS = [
  "id",
  "title",
  "description",
  "categories.id",
  "categories.name",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
];

const unique = <T>(values: T[]) => [...new Set(values)];

// ---- Reading each locale's text ------------------------------------------------------

/** The locales a document is built for, read from the store (A' and B). */
async function storeLocales(query: SearchTypes.SearchContainer["query"]): Promise<string[]> {
  const { data } = await query.graph({
    entity: "store",
    fields: ["supported_locales.locale_code"],
  });
  const fromStore = (data as { supported_locales?: ({ locale_code?: string } | null)[] }[]).flatMap(
    (store) => (store.supported_locales ?? []).flatMap((l) => (l?.locale_code ? [l.locale_code] : [])),
  );

  return unique([DEFAULT_LOCALE, ...staticLocales(), ...fromStore]);
}

/**
 * Each product's texts in each locale: one `query.graph` read per locale, with the locale as
 * the second argument, which makes Medusa apply the translations (the default locale has
 * none, so it comes back as written).
 */
async function readTexts(
  query: SearchTypes.SearchContainer["query"],
  ids: string[],
  locales: string[],
): Promise<Map<string, Record<string, Texts>>> {
  const texts = new Map<string, Record<string, Texts>>();

  for (const locale of locales) {
    const { data } = await query.graph(
      { entity: "product", fields: TEXT_FIELDS, filters: { id: ids } },
      { locale },
    );

    for (const row of data as ProductRow[]) {
      texts.set(row.id, {
        ...texts.get(row.id),
        [locale]: {
          title: row.title?.trim() ?? "",
          description: row.description?.trim() ?? "",
          category: (row.categories ?? []).flatMap((c) => (c?.name?.trim() ? [c.name.trim()] : [])),
          option_values: toOptionValues(row.options),
        },
      });
    }
  }

  return texts;
}

// ---- Documents -------------------------------------------------------------------------

function baseDocument(row: ProductRow, pricing: Parameters<typeof toProductPricing>[0]) {
  return {
    id: row.id,
    status: row.status ?? null,
    sales_channel_ids: (row.sales_channels ?? []).flatMap((c) => (c?.id ? [c.id] : [])),
    handle: row.handle ?? null,
    thumbnail: row.thumbnail ?? null,
    created_at: row.created_at ?? null,
    labels: (row.tags ?? []).flatMap((t) => (t?.value?.trim() ? [t.value.trim()] : [])),
    title: row.title ?? null,
    ...toProductPricing(pricing),
  };
}

function documentFor(
  variant: S2Index["variant"],
  row: ProductRow,
  pricing: Parameters<typeof toProductPricing>[0],
  texts: Record<string, Texts>,
  locales: string[],
) {
  const base = baseDocument(row, pricing);

  if (variant === "a") {
    return {
      ...base,
      ...Object.fromEntries(
        locales.flatMap((locale) => {
          const names = localizedFields(locale);
          const t = texts[locale];

          return [
            [names.title, t?.title ?? ""],
            [names.description, t?.description ?? ""],
            [names.category, t?.category ?? []],
            [names.option_values, t?.option_values ?? []],
          ];
        }),
      ),
    };
  }

  if (variant === "ap") {
    return {
      ...base,
      category_ids: (row.categories ?? []).flatMap((c) => (c?.id ? [c.id] : [])),
      search_text: unique(
        locales.flatMap((locale) => {
          const t = texts[locale];

          return t ? [t.title, t.description, ...t.category, ...t.option_values] : [];
        }),
      )
        .filter(Boolean)
        .join("\n"),
    };
  }

  const fallback = texts[DEFAULT_LOCALE];

  return {
    ...base,
    description: fallback?.description ?? "",
    category: fallback?.category ?? [],
    option_values: fallback?.option_values ?? [],
    _locales: Object.fromEntries(
      locales.flatMap((locale) => {
        const t = texts[locale];

        return t
          ? [[locale, { title: t.title, description: t.description, category: t.category, option_values: t.option_values }]]
          : [];
      }),
    ),
  };
}

function transformFor(index: S2Index) {
  return async (rows: ProductRow[], context: SearchTypes.SearchIngestionContext) => {
    // The spec waits for this to reach zero before it measures or mutates anything.
    const activity = ((globalThis as { __s2Activity?: { running: number; lastStart: number } }).__s2Activity ??= {
      running: 0,
      lastStart: 0,
    });

    activity.running += 1;
    activity.lastStart = Date.now();

    try {
      // T8 mutes the handlers while it creates a catalog, so that the cost it measures is the
      // reindex and not a backlog of events. A muted transform yields no documents, which makes
      // the consumer issue a cheap delete for ids that are not there.
      if ((globalThis as { __s2Mute?: boolean }).__s2Mute) {
        return [];
      }

      return await build(index, rows, context);
    } finally {
      activity.running -= 1;
    }
  };
}

async function build(
  index: S2Index,
  rows: ProductRow[],
  context: SearchTypes.SearchIngestionContext,
) {
  const query = context.container.query;
  const ids = rows.map((row) => row.id);
  const locales = index.variant === "a" ? staticLocales() : await storeLocales(query);
  const [pricing, texts] = await Promise.all([
    loadPricing(ids, context),
    readTexts(query, ids, locales),
  ]);

  return rows.map((row) =>
    documentFor(index.variant, row, pricing.get(row.id), texts.get(row.id) ?? {}, locales),
  );
}

// ---- Events: the Translation Module's, mapped to products (T4) ------------------------

/** `translation.*` carries translation ids; the row says which entity it translates. */
async function resolveS2ProductIds(
  event: { name: string; data: unknown },
  context: SearchTypes.SearchIngestionContext,
): Promise<string[]> {
  if (!event.name.startsWith("translation.")) {
    return resolveProductIds(event, context);
  }

  const ids = (Array.isArray(event.data) ? event.data : [event.data]).flatMap((entry) => {
    const id = (entry as { id?: string } | undefined)?.id;

    return id ? [id] : [];
  });

  if (!ids.length) {
    return [];
  }

  const { data } = await context.container.query.graph({
    entity: "translations",
    fields: ["id", "reference", "reference_id"],
    filters: { id: ids },
    withDeleted: event.name.endsWith(".deleted"),
  });
  const byReference = new Map<string, string[]>();

  for (const row of data as { reference: string; reference_id: string }[]) {
    byReference.set(row.reference, [...(byReference.get(row.reference) ?? []), row.reference_id]);
  }

  const productIds = new Set(byReference.get("product") ?? []);

  for (const [reference, entity] of [
    ["product_category", "product-category"],
    ["product_option", "product-option"],
    ["product_option_value", "product-option-value"],
    ["product_tag", "product-tag"],
  ] as const) {
    const referenceIds = byReference.get(reference);

    if (referenceIds?.length) {
      const related = await resolveProductIds(
        { name: `${entity}.updated`, data: referenceIds.map((id) => ({ id })) },
        context,
      );

      related.forEach((id) => productIds.add(id));
    }
  }

  return [...productIds];
}

// ---- Definitions -----------------------------------------------------------------------

function fieldsFor(index: S2Index) {
  const base = {
    id: search.keyword().filterable().retrievable(),
    status: search.keyword().filterable().retrievable(false),
    sales_channel_ids: search.keyword().array().filterable().retrievable(false),
    handle: search.keyword().retrievable(),
    thumbnail: search.keyword().retrievable(),
    created_at: search.date().sortable().retrievable(),
    labels: search.keyword().array().filterable().facetable().retrievable(),
    ...priceFields,
  };

  if (index.variant === "a") {
    return {
      ...base,
      title: search.text().sortable().retrievable(),
      ...Object.fromEntries(
        staticLocales().flatMap((locale) => {
          const names = localizedFields(locale);

          return [
            [names.title, search.text().searchable({ weight: 3 }).sortable().retrievable()],
            [names.description, search.text().searchable({ weight: 1 }).retrievable()],
            [names.category, search.keyword().array().filterable().facetable().retrievable()],
            [
              names.option_values,
              search.keyword().array().searchable({ weight: 2 }).filterable().facetable().retrievable(),
            ],
          ];
        }),
      ),
    };
  }

  if (index.variant === "ap") {
    return {
      ...base,
      title: search.text().sortable().retrievable(),
      search_text: search.text().searchable({ weight: 3 }),
      category_ids: search.keyword().array().filterable().facetable().retrievable(),
    };
  }

  return {
    ...base,
    title: search.text().searchable({ weight: 3 }).sortable().retrievable(),
    description: search.text().searchable({ weight: 1 }).retrievable(),
    category: search.keyword().array().filterable().facetable().retrievable(),
    option_values: search
      .keyword()
      .array()
      .searchable({ weight: 2 })
      .filterable()
      .facetable()
      .retrievable(),
  };
}

function providerOptionsFor(index: S2Index) {
  if (index.provider !== "meilisearch") {
    return undefined;
  }

  const locales = staticLocales();

  if (index.variant === "b") {
    return {
      meilisearch: {
        locale_mode: "index_per_locale",
        default_locale: DEFAULT_LOCALE,
        locales,
        localized_field: "_locales",
      },
    };
  }

  if (index.variant === "a") {
    return {
      meilisearch: {
        locale_mode: "fields",
        locale_attributes: Object.fromEntries(
          locales.map((locale) => {
            const names = localizedFields(locale);

            return [locale, [names.title, names.description, names.option_values]];
          }),
        ),
        locale_patterns: Object.fromEntries(
          locales.map((locale) => [locale, [`*_${localeToken(locale)}`]]),
        ),
      },
    };
  }

  return { meilisearch: { locale_mode: "fields" } };
}

if (isTruthy(process.env.S2_SPIKE)) {
  for (const index of S2_INDEXES) {
    const fields = search.define(fieldsFor(index) as never) as never;
    const source = {
      fields: GRAPH_FIELDS,
      transform: transformFor(index),
    } as never;

    defineSearchIndex({
      name: index.name,
      entity: "product",
      primary_key: "id",
      provider: index.provider,
      fields,
      settings: {
        typo_tolerance: { enabled: true },
        provider_options: providerOptionsFor(index),
      },
      events: S2_EVENTS,
      consume: graphConsume({
        ...(source as object),
        resolve_ids: resolveS2ProductIds,
        is_delete: (event) => event.name === "product.deleted",
      } as never),
      seed: graphSeed(source),
    } as never);
  }
}
