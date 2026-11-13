/**
 * Keeps each store locale's Meilisearch index whole (ADR 0002's B, PR 139's review, item 1). A
 * locale's index is made only by a seed (the provider skips it on a live write), so a locale the
 * store added since has none and searches the default locale's index; a locale dropped and added
 * back can keep an index that lost the copies written while it was away. Medusa emits no event when
 * the store's locales change (`updateStoresWorkflow` in 2.22.6 has neither an event nor a hook), so
 * the `search-locale-indexes` job asks the index itself: each store locale is searched with
 * `take: 0`, and the product index is rebuilt when one is answered by another locale's index or
 * counts fewer documents than the default locale's. On `search-postgres` (one index for every
 * language) it does nothing.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { MEILISEARCH_PROVIDER_ID } from "../modules/meilisearch-search/locales";
import { DEFAULT_LOCALE, storeLocales } from "../search/helpers/translations";

const INDEX = "product";

/** One store locale as the index answers it. */
export type LocaleProbe = {
  locale: string;
  /** The locales whose indexes answered (the provider's `provider_metadata.locales`). */
  answeredBy: readonly string[];
  count: number | null;
};

/** The store locales whose index is missing or holds fewer documents than the default's. */
export function incompleteLocales(
  probes: readonly LocaleProbe[],
  defaultLocale: string = DEFAULT_LOCALE,
): string[] {
  const full = probes.find((probe) => probe.locale === defaultLocale)?.count ?? null;

  return probes
    .filter((probe) => probe.locale !== defaultLocale)
    .filter(
      (probe) =>
        !probe.answeredBy.includes(probe.locale) ||
        (full !== null && probe.count !== null && probe.count < full),
    )
    .map((probe) => probe.locale);
}

type SearchModule = {
  listIndexes(): Promise<{ name: string; provider: string; status: string }[]>;
  search(query: {
    entity: string;
    pagination: { take: number };
    search_options: { locales: string[] };
  }): Promise<{ metadata: { count: number | null }; provider_metadata?: { locales?: unknown } }>;
  reindex(input: { index: string }): Promise<unknown>;
};

/**
 * Rebuilds the product index when a store locale has no whole index of its own. Returns the
 * locales that made it rebuild (none when it did not). Throws only what the reindex throws.
 */
export async function rebuildIncompleteLocaleIndexes(
  container: MedusaContainer,
): Promise<string[]> {
  const search = container.resolve(Modules.SEARCH, { allowUnregistered: true }) as
    SearchModule | undefined;

  if (!search) {
    return [];
  }

  const product = (await search.listIndexes()).find((index) => index.name === INDEX);

  // Only an index that is live on Meilisearch: during a switch or a first seed there is nothing
  // to compare yet, and the seed under way makes every locale's index anyway.
  if (product?.provider !== MEILISEARCH_PROVIDER_ID || product.status !== "ready") {
    return [];
  }

  const locales = await storeLocales(container.resolve(ContainerRegistrationKeys.QUERY));
  const probes = await Promise.all(
    locales.map(async (locale): Promise<LocaleProbe> => {
      const result = await search.search({
        entity: INDEX,
        pagination: { take: 0 },
        search_options: { locales: [locale] },
      });
      const answeredBy = result.provider_metadata?.locales;

      return {
        locale,
        answeredBy: Array.isArray(answeredBy) ? answeredBy.map(String) : [],
        count: result.metadata.count,
      };
    }),
  );
  const incomplete = incompleteLocales(probes);

  if (incomplete.length) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .info(
        `[Search] Rebuilding "${INDEX}": ${incomplete.join(", ")} ${incomplete.length === 1 ? "has" : "have"} no whole Meilisearch index of ${incomplete.length === 1 ? "its" : "their"} own`,
      );
    await search.reindex({ index: INDEX });
  }

  return incomplete;
}
