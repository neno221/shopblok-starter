/**
 * S2 prototype (not for main, D13). What the index variants and the spec share: the variants'
 * names, the locale list, how a locale becomes a field name, and the search options a query
 * for one locale sends to each variant.
 */
import type { SearchTypes } from "@medusajs/framework/types";

import { SUPPORTED_LOCALES } from "../../config/markets";

/** The language the product rows themselves are written in (D8). */
export const DEFAULT_LOCALE = "en-US";

export type S2Variant = "a" | "ap" | "b";
export type S2Provider = "search-postgres" | "meilisearch";

export type S2Index = {
  name: string;
  provider: S2Provider;
  variant: S2Variant;
};

/** One index definition per candidate and provider, all on the `product` entity. */
export const S2_INDEXES: readonly S2Index[] = [
  { name: "s2_pg_a", provider: "search-postgres", variant: "a" },
  { name: "s2_pg_ap", provider: "search-postgres", variant: "ap" },
  { name: "s2_ms_a", provider: "meilisearch", variant: "a" },
  { name: "s2_ms_b", provider: "meilisearch", variant: "b" },
  { name: "s2_ms_ap", provider: "meilisearch", variant: "ap" },
];

/**
 * The locales candidate A builds its fields for (its schema is static). `S2_LOCALES` stands in
 * for an edit of `SUPPORTED_LOCALES` in `src/config/markets.ts`, which is what a shop owner
 * would do (D17).
 */
export function staticLocales(env: Record<string, string | undefined> = process.env): string[] {
  const configured = env.S2_LOCALES?.split(",")
    .map((locale) => locale.trim())
    .filter(Boolean);

  return configured?.length ? configured : [...SUPPORTED_LOCALES];
}

/** `el-GR` becomes `el_GR`, usable in a field name. */
export function localeToken(locale: string): string {
  return locale.replace(/-/g, "_");
}

/** The per-locale field names of candidate A. */
export function localizedFields(locale: string) {
  const token = localeToken(locale);

  return {
    title: `title_${token}`,
    description: `description_${token}`,
    category: `category_${token}`,
    option_values: `option_values_${token}`,
  };
}

/**
 * The `search_options` a storefront sends to search one locale, per variant and provider. The
 * point of S2 is that these differ:
 *
 * - A, Postgres: the provider has one text-search configuration for the whole index and rejects
 *   `locales`, so the query names the locale's fields in `attributes_to_search_on`.
 * - A, Meilisearch: `locales` is enough; the provider narrows the search to the locale's
 *   attributes and gives Meilisearch the language.
 * - A': nothing to say, the one searchable field holds every language.
 * - B: `locales` picks the index.
 */
export function localizedSearchOptions(
  index: S2Index,
  locale: string,
): SearchTypes.SearchOptions {
  if (index.variant === "ap") {
    return {};
  }

  if (index.variant === "b" || index.provider === "meilisearch") {
    return { locales: [locale] };
  }

  const fields = localizedFields(locale);

  return {
    attributes_to_search_on: [fields.title, fields.description, fields.option_values],
  };
}

/** The events the product index lists, plus the Translation Module's (T4). */
export const S2_EVENTS = [
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
  "sales-channel.deleted",
  "translation.created",
  "translation.updated",
  "translation.deleted",
];
