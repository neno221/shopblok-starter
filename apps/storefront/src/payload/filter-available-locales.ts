import type { Locale, Payload, PayloadRequest } from "payload";
import { DEFAULT_LOCALE } from "./locales";

type MarketsDoc = {
  countries?: { enabled?: boolean | null; languages?: string[] | null }[] | null;
};

/** The languages of the enabled countries. */
export function enabledLanguages(markets: MarketsDoc): Set<string> {
  const languages = new Set<string>();
  for (const country of markets.countries ?? []) {
    if (country.enabled === false) continue;
    for (const language of country.languages ?? []) languages.add(language);
  }
  return languages;
}

/**
 * The locales the admin offers: the enabled languages and the default one, in the config's order.
 * It never returns `[]` (an empty list is the edge case Payload's admin does not like), and it
 * never hides the default locale, so a fresh database with no markets still shows English.
 */
export function pickAvailableLocales(locales: Locale[], enabled: ReadonlySet<string>): Locale[] {
  const picked = locales.filter(
    (locale) => locale.code === DEFAULT_LOCALE || enabled.has(locale.code),
  );
  return picked.length > 0 ? picked : locales.slice(0, 1);
}

const CONTEXT_KEY = "shopblok.enabledLanguages";

async function readEnabledLanguages(payload: Payload, req: PayloadRequest) {
  try {
    // Not on behalf of the signed-in user: which languages exist is the shop's setting, so an
    // editor who may not read `markets` still gets the same selector.
    const markets = await payload.findGlobal({
      slug: "markets",
      depth: 0,
      overrideAccess: true,
      req,
    });
    return enabledLanguages(markets);
  } catch (error) {
    // A missing table (before `payload migrate`) must not take the admin down.
    payload.logger.warn({ err: error }, "markets: could not read the enabled languages");
    return new Set<string>();
  }
}

/**
 * Payload's `localization.filterAvailableLocales`. It only filters the admin's locale selector,
 * the version view and (experimental) the publish menu; the REST and Local API still accept every
 * preloaded locale, so the storefront enforces markets itself (S3, L8). Payload calls it at least
 * twice per admin page, so the read of `markets` is shared through `req.context`.
 */
export async function filterAvailableLocales({
  locales,
  req,
}: {
  locales: Locale[];
  req: PayloadRequest;
}): Promise<Locale[]> {
  const cached = req.context[CONTEXT_KEY] as Promise<Set<string>> | undefined;
  const enabled = cached ?? readEnabledLanguages(req.payload, req);
  req.context[CONTEXT_KEY] = enabled;
  return pickAvailableLocales(locales, await enabled);
}
