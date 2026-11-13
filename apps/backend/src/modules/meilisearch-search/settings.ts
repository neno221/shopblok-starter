/**
 * An index definition as Meilisearch settings, and what a definition says to this provider. Pure.
 */
import type { SearchTypes } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";

import { isLocaleCode } from "./locales";

type Definition = SearchTypes.ResolvedSearchIndexDefinition;
type Field = SearchTypes.SearchFieldDefinition;

/**
 * What a definition says to this provider, under `settings.provider_options.meilisearch`.
 *
 * - `localized_field` (ADR 0002's B): the document key that holds `{ [locale]: { ...texts } }`.
 *   Each locale's copy of a document goes into its own index, `<version>__<locale>`, created by the
 *   seed that fills the version; a query picks the index by `search_options.locales`. Without it the index is one
 *   Meilisearch index, as Medusa's own providers keep it.
 * - `default_locale`: the locale whose index answers a query without one, and a query for a locale
 *   that has no index yet. Required with `localized_field`.
 *
 * There is no list of locales (ADR 0002, T7): the seed makes an index for each store locale, and
 * the `search-locale-indexes` job rebuilds when the store gains one, so adding a language to the
 * store changes neither the definition nor its hash.
 */
export type MeilisearchIndexOptions = {
  localized_field?: string;
  default_locale?: string;
};

export function indexOptionsOf(definition: Definition): MeilisearchIndexOptions & {
  localized: boolean;
} {
  const own = (definition.settings.provider_options?.meilisearch ?? {}) as MeilisearchIndexOptions;

  if (own.localized_field !== undefined) {
    if (!isLocaleCode(own.default_locale)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Search index "${definition.name}": provider_options.meilisearch.localized_field needs a default_locale`,
      );
    }

    return { ...own, localized: true };
  }

  return { ...own, localized: false };
}

function flatten(fields: Record<string, Field>, prefix = ""): { path: string; field: Field }[] {
  return Object.entries(fields).flatMap(([name, field]) => {
    const path = prefix ? `${prefix}.${name}` : name;

    return field.type === "object" && field.fields
      ? flatten(field.fields, path)
      : [{ path, field }];
  });
}

const weightOf = (field: Field) =>
  typeof field.searchable === "object" ? (field.searchable.weight ?? 1) : 1;

const isSearchable = (field: Field) =>
  field.searchable === true || typeof field.searchable === "object";

// Medusa's rule (`listRetrievablePaths`): retrievable unless it says no; vectors only on request.
const isRetrievable = (field: Field) =>
  field.type === "vector" ? field.retrievable === true : field.retrievable !== false;

/** The field paths a hit may hold: the definition's retrievable leaves and the primary key. */
export function retrievablePaths(definition: Definition): string[] {
  return [
    ...new Set([
      definition.primary_key,
      ...flatten(definition.fields)
        .filter(({ field }) => isRetrievable(field))
        .map(({ path }) => path),
    ]),
  ];
}

/**
 * Meilisearch's settings for an index of this definition, in one call (settings first: Meilisearch
 * creates the index with them, ADR 0002 "Found on the way" 6).
 *
 * - `searchableAttributes` by weight, heaviest first: Meilisearch's `attribute` rule ranks by this
 *   order, which is how `title` (3) outranks `search_text` (2).
 * - `rankingRules` start with `sort`, so an explicit order (price, newest, title) is the order, as
 *   on `search-postgres`, and relevance orders only a query without one. With no `sort` in a query
 *   the rule does nothing.
 * - `displayedAttributes` only what the definition lets out: `search_text`, `status` and the sales
 *   channels never leave the engine, even in a highlight.
 * - `sortFacetValuesBy` count, so the 200 values Meilisearch keeps per facet are the most frequent.
 * - `localizedAttributes` the language of the index's locale, where Meilisearch has one.
 */
export function indexSettings(definition: Definition, language?: string) {
  const fields = flatten(definition.fields);
  const typo = definition.settings.typo_tolerance;
  const searchable = fields
    .filter(({ field }) => isSearchable(field))
    .map((entry, order) => ({ ...entry, order }))
    .sort((a, b) => weightOf(b.field) - weightOf(a.field) || a.order - b.order)
    .map(({ path }) => path);

  return {
    searchableAttributes: searchable.length ? searchable : ["*"],
    displayedAttributes: retrievablePaths(definition),
    filterableAttributes: [
      ...new Set([
        definition.primary_key,
        ...fields
          .filter(({ field }) => field.filterable || field.facetable)
          .map(({ path }) => path),
      ]),
    ],
    sortableAttributes: fields.filter(({ field }) => field.sortable).map(({ path }) => path),
    rankingRules: ["sort", "words", "typo", "proximity", "attribute", "exactness"],
    typoTolerance: {
      enabled: typo?.enabled ?? true,
      ...(typo?.min_word_size_for_one_typo !== undefined ||
      typo?.min_word_size_for_two_typos !== undefined
        ? {
            minWordSizeForTypos: {
              ...(typo.min_word_size_for_one_typo !== undefined
                ? { oneTypo: typo.min_word_size_for_one_typo }
                : {}),
              ...(typo.min_word_size_for_two_typos !== undefined
                ? { twoTypos: typo.min_word_size_for_two_typos }
                : {}),
            },
          }
        : {}),
      ...(typo?.disabled_on_attributes?.length
        ? { disableOnAttributes: typo.disabled_on_attributes }
        : {}),
    },
    distinctAttribute: definition.settings.distinct_attribute ?? null,
    faceting: { maxValuesPerFacet: 200, sortFacetValuesBy: { "*": "count" as const } },
    pagination: { maxTotalHits: 10_000 },
    localizedAttributes: language ? [{ locales: [language], attributePatterns: ["*"] }] : [],
  };
}
