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
      | { getIndex(entity: string): { provider: string } }
      | undefined;
    const locale = chooseSearchLocale(
      (req as { locale?: string }).locale,
      await storeLocales(req.scope.resolve(ContainerRegistrationKeys.QUERY)),
    );

    localizeSearchBody(body, locale, (entity) => {
      try {
        const provider = search?.getIndex(entity).provider ?? "";

        return QUERY_TIME_LOCALE_PROVIDERS.includes(provider);
      } catch {
        // An unknown index: the route answers it with a 404.
        return false;
      }
    });
  }

  next();
}
