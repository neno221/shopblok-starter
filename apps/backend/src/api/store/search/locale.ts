import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

import { MEILISEARCH_PROVIDER_ID } from "../../../modules/meilisearch-search/locales";
import { DEFAULT_LOCALE, storeLocales } from "../../../search/helpers/translations";

type SearchQuery = { entity: string; search_options?: Record<string, unknown> };
type SearchBody = SearchQuery | { queries: SearchQuery[] };

/**
 * The locale a search runs in: the request's, if the store supports it, else
 * the default. `req.locale` is the client's `x-medusa-locale` header or
 * `?locale=`, which Medusa's `normalizeLocale` only re-cases (`zz-ZZ` passes
 * through), so it is never used unchecked (ADR 0002, decision 4).
 */
export function chooseSearchLocale(
  requested: string | undefined,
  supported: readonly string[],
  fallback: string = DEFAULT_LOCALE,
): string {
  const match = requested
    ? supported.find((locale) => locale.toLowerCase() === requested.toLowerCase())
    : undefined;

  return match ?? fallback;
}

/**
 * Writes the search's locale into each query's `search_options.locales`,
 * replacing whatever the caller sent, so a caller cannot pick a locale, nor an
 * index name built from one (M6's Meilisearch provider has an index per
 * locale). A provider that does not take query-time locales (`search-postgres`,
 * whose one multilingual index needs none) gets no `locales` at all.
 */
export function localizeSearchBody(
  body: SearchBody,
  locale: string,
  acceptsLocales: (entity: string) => boolean,
): void {
  for (const query of "queries" in body ? body.queries : [body]) {
    const { locales: _ignored, ...options } = query.search_options ?? {};

    query.search_options = acceptsLocales(query.entity)
      ? { ...options, locales: [locale] }
      : options;
  }
}

/**
 * The providers that take `search_options.locales`: Meilisearch (D126), by the
 * identifier the Search Module registers it under, which is what an index's
 * `provider` holds. Any other gets none: `search-postgres` answers a query
 * with `locales` with an HTTP 400, so an unknown provider fails safe.
 */
const QUERY_TIME_LOCALE_PROVIDERS: readonly string[] = [MEILISEARCH_PROVIDER_ID];

type SearchModule = {
  listIndexes(): Promise<{ name: string; entity?: string; provider: string }[]>;
};

/** How long the indexes' active providers are kept: `listIndexes` reads two tables. */
export const ACTIVE_PROVIDERS_TTL_MS = 5_000;

let cached: { search: SearchModule; at: number; providers: Map<string, string> } | undefined;

/**
 * The provider each index's *active version* runs on, by index name and entity. That is the one
 * that answers a search: the registered definition names `default_provider`, which differs while
 * a switch's new version is being filled, and for as long as its seed keeps failing (Meilisearch
 * down at the start) the old version (Postgres) serves on (PR 139's review, item 2).
 */
export async function activeProviders(
  search: SearchModule,
  now: number = Date.now(),
): Promise<Map<string, string>> {
  if (cached?.search === search && now - cached.at < ACTIVE_PROVIDERS_TTL_MS) {
    return cached.providers;
  }

  const providers = new Map<string, string>();

  for (const index of await search.listIndexes()) {
    providers.set(index.name, index.provider);
    if (index.entity) {
      providers.set(index.entity, index.provider);
    }
  }

  cached = { search, at: now, providers };

  return providers;
}

/** Forgets the cached providers, so the next request reads them again (tests). */
export function forgetActiveProviders(): void {
  cached = undefined;
}

/**
 * `POST /store/search`, after `configureStoreSearch` (whose validator fills
 * `validatedBody`): the request's locale reaches the index (D63).
 */
export async function localizeStoreSearch(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const body = req.validatedBody as SearchBody | undefined;

  if (body) {
    const search = req.scope.resolve(Modules.SEARCH, { allowUnregistered: true }) as
      | SearchModule
      | undefined;
    const [locale, providers] = await Promise.all([
      storeLocales(req.scope.resolve(ContainerRegistrationKeys.QUERY)).then((supported) =>
        chooseSearchLocale((req as { locale?: string }).locale, supported),
      ),
      search ? activeProviders(search) : new Map<string, string>(),
    ]);

    // An unknown index gets no locales: the route answers it with a 404.
    localizeSearchBody(body, locale, (entity) =>
      QUERY_TIME_LOCALE_PROVIDERS.includes(providers.get(entity) ?? ""),
    );
  }

  next();
}
