import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

import { DEFAULT_LOCALE } from "../../../search/helpers/translations";

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
 * locale). A provider that refuses query-time locales (`search-postgres`, whose
 * one multilingual index needs none) gets no `locales` at all.
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

/** Providers that answer a query with `locales` with an error. */
const NO_QUERY_TIME_LOCALES = ["search-postgres"];

// The store's locales, read once per request.
const localesByRequest = new WeakMap<MedusaRequest, Promise<string[]>>();

async function supportedLocales(req: MedusaRequest): Promise<string[]> {
  let locales = localesByRequest.get(req);

  if (!locales) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    locales = query
      .graph({ entity: "store", fields: ["supported_locales.locale_code"] })
      .then(({ data }) =>
        (data as { supported_locales?: ({ locale_code?: string } | null)[] }[]).flatMap(
          (store) =>
            (store.supported_locales ?? []).flatMap((l) =>
              l?.locale_code ? [l.locale_code] : [],
            ),
        ),
      );
    localesByRequest.set(req, locales);
  }

  return locales;
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
      | { getIndex(entity: string): { provider: string } }
      | undefined;
    const locale = chooseSearchLocale(
      (req as { locale?: string }).locale,
      await supportedLocales(req),
    );

    localizeSearchBody(body, locale, (entity) => {
      try {
        const provider = search?.getIndex(entity).provider ?? "";

        return !NO_QUERY_TIME_LOCALES.some((id) => provider.startsWith(id));
      } catch {
        // An unknown index: the route answers it with a 404.
        return false;
      }
    });
  }

  next();
}
