import type {
  RemoteQueryFunction,
  SearchTypes,
} from "@medusajs/framework/types";

import { SUPPORTED_LOCALES } from "../../config/markets";
import { type ProductOptionRow, toOptionValues } from "./option-values";
import { resolveProductIds } from "./resolve-product-ids";

/** The language the product rows themselves are written in (D8). */
export const DEFAULT_LOCALE: string = SUPPORTED_LOCALES[0];

type Named = { id?: string | null; name?: string | null } | null;

type TextRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  categories?: Named[] | null;
  collection?: { id?: string | null; title?: string | null } | null;
  tags?: ({ id?: string | null; value?: string | null } | null)[] | null;
  options?: ProductOptionRow[] | null;
};

/** One product's texts in one locale. */
export type ProductTexts = {
  title: string;
  description: string;
  categories: string[];
  collection: string;
  tags: string[];
  option_values: string[];
};

// `query.graph(…, { locale })` translates a nested object only when its `id` is
// selected (ADR 0002, "Found on the way" 2): without `categories.id`, the
// category names come back in the default language, with no error.
const TEXT_GRAPH_FIELDS = [
  "id",
  "title",
  "description",
  "categories.id",
  "categories.name",
  "collection.id",
  "collection.title",
  "tags.id",
  "tags.value",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
];

const trimmed = (values: (string | null | undefined)[]) =>
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

/**
 * The locales a document is built from: the store's `supported_locales`, read
 * once per batch, with the default locale first. A locale added in the admin
 * is picked up by the next write, with no restart (D17, ADR 0002 decision 2).
 */
export async function storeLocales(
  query: RemoteQueryFunction,
): Promise<string[]> {
  const { data } = await query.graph({
    entity: "store",
    fields: ["supported_locales.locale_code"],
  });
  const fromStore = (
    data as { supported_locales?: ({ locale_code?: string | null } | null)[] }[]
  ).flatMap((store) =>
    trimmed((store.supported_locales ?? []).map((l) => l?.locale_code)),
  );

  return [...new Set([DEFAULT_LOCALE, ...fromStore])];
}

function toTexts(row: TextRow): ProductTexts {
  return {
    title: row.title?.trim() ?? "",
    description: row.description?.trim() ?? "",
    categories: trimmed((row.categories ?? []).map((c) => c?.name)),
    collection: row.collection?.title?.trim() ?? "",
    tags: trimmed((row.tags ?? []).map((t) => t?.value)),
    option_values: toOptionValues(row.options),
  };
}

/**
 * Each product's texts in each locale: one `query.graph` read per locale for
 * the whole batch. The default locale has no translations, so it comes back as
 * written; a locale with none for a field falls back to the default text.
 */
export async function readTexts(
  query: RemoteQueryFunction,
  ids: string[],
  locales: string[],
): Promise<Map<string, Map<string, ProductTexts>>> {
  const texts = new Map<string, Map<string, ProductTexts>>();

  if (!ids.length) {
    return texts;
  }

  for (const locale of locales) {
    const { data } = await query.graph(
      { entity: "product", fields: TEXT_GRAPH_FIELDS, filters: { id: ids } },
      { locale },
    );

    for (const row of data as TextRow[]) {
      const byLocale = texts.get(row.id) ?? new Map<string, ProductTexts>();

      byLocale.set(locale, toTexts(row));
      texts.set(row.id, byLocale);
    }
  }

  return texts;
}

/**
 * `search_text`: every locale's title, description, category names, collection
 * title, tags and option values, each line once. A text shared by two locales
 * (an untranslated field) is written once.
 */
export function toSearchText(byLocale: Map<string, ProductTexts> | undefined) {
  const lines = [...(byLocale?.values() ?? [])].flatMap((t) => [
    t.title,
    t.description,
    ...t.categories,
    t.collection,
    ...t.tags,
    ...t.option_values,
  ]);

  return [...new Set(lines.filter(Boolean))].join("\n");
}

/** What a translation row translates, mapped to the event that entity emits. */
const TRANSLATED_ENTITIES: Record<string, string> = {
  product_category: "product-category",
  product_collection: "product-collection",
  product_option: "product-option",
  product_option_value: "product-option-value",
  product_tag: "product-tag",
};

/**
 * The products behind a `translation.*` event. The event carries translation
 * ids; the `translations` entity says what each row translates (`reference`,
 * `reference_id`), read `withDeleted` for a deletion since the row is
 * soft-deleted by then. A product is listed once, however many of the event's
 * rows touch it, so the batch re-reads each product once.
 */
export async function resolveTranslationProductIds(
  event: { name: string; data: unknown },
  context: SearchTypes.SearchIngestionContext,
): Promise<string[]> {
  const ids = trimmed(
    (Array.isArray(event.data) ? event.data : [event.data]).map(
      (entry) => (entry as { id?: string } | undefined)?.id,
    ),
  );

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

  for (const row of data as ({ reference?: string; reference_id?: string } | null)[]) {
    if (row?.reference && row.reference_id) {
      byReference.set(row.reference, [
        ...(byReference.get(row.reference) ?? []),
        row.reference_id,
      ]);
    }
  }

  const productIds = new Set(byReference.get("product") ?? []);

  for (const [reference, entity] of Object.entries(TRANSLATED_ENTITIES)) {
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
