import languages from "@shopblok/i18n/languages.json";

import {
  isCountryCode,
  isHostname,
  isLanguageCode,
  isLanguageTag,
  isMarketKey,
  isTimeZone,
  languageOfLocale,
  normalizeHost,
} from "./formats";
import type {
  CountryRow,
  CountrySaveInput,
  LanguageRow,
  MarketsState,
  Problem,
  SettingsRow,
  SettingsSaveInput,
} from "./types";

/**
 * The checks of a save (D91), against Medusa's live data: `state` holds the regions and the
 * store's locales as Medusa has them. Pure: nothing here reads a database, so a unit test can pass
 * any state. They port the storefront's `syncedMarketProblems`, `marketMapProblems` and the
 * validators of Payload's `markets` global. Every problem is listed, not only the first.
 */

/** Payload's content languages: `LANGUAGES` of `@shopblok/i18n`, as JSON (its raw TS can't load here). */
const LANGUAGES: readonly string[] = languages;

const COUNTRY_DEFAULTS: Omit<CountryRow, "code"> = {
  enabled: false,
  languages: [],
  domain: null,
  time_zone: null,
  rank: null,
};

export function findRegionCountry(state: MarketsState, code: string) {
  return state.regionCountries.find((country) => country.code === code);
}

export function findCountryRow(state: MarketsState, code: string): CountryRow | undefined {
  return state.countries.find((country) => country.code === code);
}

/** Open: in one of Medusa's regions and switched on in the module. */
export function isOpen(state: MarketsState, code: string): boolean {
  return (
    findRegionCountry(state, code) !== undefined && findCountryRow(state, code)?.enabled === true
  );
}

/** The store's locales for one language (`de` gives `de-DE` and `de-CH` when it has both). */
export function localesOfLanguage(state: MarketsState, language: string): string[] {
  return state.storeLocales.filter((locale) => languageOfLocale(locale) === language);
}

/** The key of a market: `{language}-{country}`. */
export const marketKey = (language: string, country: string) => `${language}-${country}`;

/**
 * The `market_language` row a country's language needs: the stored one when its locale is still
 * one of the store's, else one filled from the store's single locale of that language. `problem`
 * says why neither exists.
 */
function languageRowFor(
  state: MarketsState,
  language: string,
  pending: LanguageRow[],
): { row?: LanguageRow; created?: boolean; problem?: Problem } {
  const stored =
    pending.find((row) => row.code === language) ??
    state.languages.find((row) => row.code === language);
  const choices = localesOfLanguage(state, language);
  const stores = state.storeLocales.length > 0 ? state.storeLocales.join(", ") : "none";
  if (stored !== undefined) {
    if (state.storeLocales.includes(stored.medusa_locale)) return { row: stored };
    return {
      problem: {
        code: "language_locale_gone",
        path: "languages",
        message: `The language "${language}" is set to the locale ${stored.medusa_locale}, which is not one of the store's locales (${stores}). Choose its locale in the Markets panel on the Store page, or add the locale in Medusa Admin (Settings → Store → Locales).`,
      },
    };
  }
  if (choices.length === 1) {
    return {
      row: { code: language, medusa_locale: choices[0]!, html_lang: null, rank: null },
      created: true,
    };
  }
  if (choices.length === 0) {
    return {
      problem: {
        code: "language_not_in_store",
        path: "languages",
        message: `The language "${language}" is not among the store's locales (${stores}). Add a ${language} locale in Medusa Admin (Settings → Store → Locales) first.`,
      },
    };
  }
  return {
    problem: {
      code: "language_locale_ambiguous",
      path: "languages",
      message: `The store has several locales for "${language}" (${choices.join(", ")}) and no market language says which one the shops use. Choose it in the Markets panel on the Store page first.`,
    },
  };
}

export type CountryPlan = {
  problems: Problem[];
  /** The row to write. */
  country: CountryRow;
  /** Language rows this save fills in. */
  newLanguages: LanguageRow[];
};

/**
 * What saving one country does, and why it is refused if it is: the row after the save (a new
 * country starts closed, with no language), the language rows it fills, and every problem. Fields
 * the input leaves out keep their stored value; `null` clears `domain` and `time_zone`.
 */
export function planCountrySave(state: MarketsState, input: CountrySaveInput): CountryPlan {
  const problems: Problem[] = [];
  const code = input.code.trim().toLowerCase();
  const before = findCountryRow(state, code);
  const base = before ?? { code, ...COUNTRY_DEFAULTS };

  const languages = (input.languages ?? base.languages).map((language) =>
    language.trim().toLowerCase(),
  );
  const enabled = input.enabled ?? base.enabled;
  const timeZone = input.time_zone === undefined ? base.time_zone : input.time_zone?.trim() || null;
  const domain = input.domain === undefined ? base.domain : (normalizeHost(input.domain) ?? null);
  const next: CountryRow = {
    code,
    enabled,
    languages,
    domain,
    time_zone: timeZone,
    rank: base.rank,
  };

  // The country.
  if (!isCountryCode(code)) {
    problems.push({
      code: "country_code_invalid",
      path: "code",
      message: `"${input.code}" is not a country code. Use the two-letter ISO 3166-1 code in lowercase, for example cy.`,
    });
  } else if (findRegionCountry(state, code) === undefined) {
    problems.push({
      code: "country_not_in_region",
      path: "code",
      message: `"${code}" is in no Medusa region. Add it to a region in Medusa Admin (Settings → Regions) first.`,
    });
  }

  // The languages: valid, known to Payload, no duplicate, and each one a locale of the store.
  const newLanguages: LanguageRow[] = [];
  const checkLanguages = input.languages !== undefined || enabled;
  if (checkLanguages) {
    languages.forEach((language, index) => {
      if (languages.indexOf(language) !== index) {
        problems.push({
          code: "language_duplicate",
          path: "languages",
          message: `The language "${language}" is listed twice for "${code}".`,
        });
        return;
      }
      if (!isLanguageCode(language)) {
        problems.push({
          code: "language_code_invalid",
          path: "languages",
          message: `"${language}" is not a language code. Use the two-letter ISO 639-1 code in lowercase, for example el.`,
        });
        return;
      }
      if (!LANGUAGES.includes(language)) {
        problems.push({
          code: "language_not_supported",
          path: "languages",
          message: `"${language}" is not one of the ${LANGUAGES.length} content languages Payload has. Adding one is a line in packages/i18n/src/languages.ts (and languages.json) and a Payload migration.`,
        });
        return;
      }
      const resolved = languageRowFor(state, language, newLanguages);
      if (resolved.problem) problems.push(resolved.problem);
      else if (resolved.created && resolved.row) newLanguages.push(resolved.row);
    });
  }
  if (enabled && languages.length === 0) {
    problems.push({
      code: "country_open_without_language",
      path: "languages",
      message: `"${code}" cannot be opened without a language. Pick at least one of the store's languages, the default first.`,
    });
  }

  // The domain and the time zone.
  if (domain !== null) {
    if (!isHostname(domain)) {
      problems.push({
        code: "domain_invalid",
        path: "domain",
        message: `"${input.domain}" is not a domain. Use a bare host such as shop.example.cy.`,
      });
    } else {
      const owner = state.countries.find((row) => row.code !== code && row.domain === domain);
      if (owner) {
        problems.push({
          code: "domain_duplicate",
          path: "domain",
          message: `The domain ${domain} already belongs to "${owner.code}".`,
        });
      }
    }
  }
  if (timeZone !== null && !isTimeZone(timeZone)) {
    problems.push({
      code: "time_zone_invalid",
      path: "time_zone",
      message: `"${timeZone}" is not a time zone. Use an IANA name such as Europe/Nicosia or America/New_York, or leave it empty.`,
    });
  }

  // What the save must not break: the primary country and the fallback market.
  const wasOpen = before?.enabled === true && findRegionCountry(state, code) !== undefined;
  const { primary_country: primary, fallback_market: fallback } = state.settings;
  if (wasOpen && !enabled && primary === code) {
    problems.push({
      code: "primary_country_closed",
      path: "enabled",
      message: `"${code}" is the primary country (the shop at /). Make another open country the primary country before closing it.`,
    });
  }
  if (fallback !== null && isMarketKey(fallback) && fallback.slice(3) === code) {
    if (wasOpen && !enabled) {
      problems.push({
        code: "fallback_country_closed",
        path: "enabled",
        message: `"${code}" is the fallback market's country (${fallback}, hreflang x-default). Choose another fallback market before closing it.`,
      });
    } else if (wasOpen && !languages.includes(fallback.slice(0, 2))) {
      problems.push({
        code: "fallback_language_removed",
        path: "languages",
        message: `"${code}" would no longer offer "${fallback.slice(0, 2)}", the language of the fallback market ${fallback}. Choose another fallback market first.`,
      });
    }
  }

  return { problems, country: next, newLanguages };
}

export type SettingsPlan = {
  problems: Problem[];
  settings: SettingsRow;
  /** Language rows to create or replace. */
  languages: LanguageRow[];
  /**
   * The region the store's `default_region_id` is set to: the primary country's, when this save
   * names a primary country. `null`: the save leaves the store alone.
   */
  defaultRegionId: string | null;
};

/**
 * What saving the shop-wide settings does: the primary country and the fallback market, and the
 * language rows (the locale each language uses, and its `<html lang>`). Fields the input leaves
 * out keep their stored value.
 */
export function planSettingsSave(state: MarketsState, input: SettingsSaveInput): SettingsPlan {
  const problems: Problem[] = [];
  const primary = input.primary_country?.trim().toLowerCase();
  const fallback = input.fallback_market?.trim().toLowerCase();

  if (primary !== undefined) {
    if (!isCountryCode(primary)) {
      problems.push({
        code: "primary_country_invalid",
        path: "primary_country",
        message: `"${input.primary_country}" is not a country code. Use the two-letter ISO 3166-1 code in lowercase, for example cy.`,
      });
    } else if (!isOpen(state, primary)) {
      problems.push({
        code: "primary_country_not_open",
        path: "primary_country",
        message: findRegionCountry(state, primary)
          ? `The primary country "${primary}" is not open. Open it in its region's Markets panel first.`
          : `The primary country "${primary}" is in no Medusa region. Add it to a region and open it first.`,
      });
    }
  }

  if (fallback !== undefined) {
    if (!isMarketKey(fallback)) {
      problems.push({
        code: "fallback_market_invalid",
        path: "fallback_market",
        message: `"${input.fallback_market}" is not a market. Use {language}-{country} in lowercase, for example en-us.`,
      });
    } else {
      const country = findCountryRow(state, fallback.slice(3));
      const open = isOpen(state, fallback.slice(3));
      if (!open || country === undefined || !country.languages.includes(fallback.slice(0, 2))) {
        problems.push({
          code: "fallback_market_not_open",
          path: "fallback_market",
          message: `The fallback market "${fallback}" is not an open market: its country must be open and offer ${fallback.slice(0, 2)}.`,
        });
      }
    }
  }

  const languages: LanguageRow[] = [];
  for (const entry of input.languages ?? []) {
    const code = entry.code.trim().toLowerCase();
    const locale = entry.medusa_locale.trim();
    const htmlLang = entry.html_lang?.trim() || null;
    if (!isLanguageCode(code)) {
      problems.push({
        code: "language_code_invalid",
        path: "languages",
        message: `"${entry.code}" is not a language code. Use the two-letter ISO 639-1 code in lowercase, for example el.`,
      });
      continue;
    }
    if (languages.some((row) => row.code === code)) {
      problems.push({
        code: "language_duplicate",
        path: "languages",
        message: `The language "${code}" is listed twice.`,
      });
      continue;
    }
    if (!LANGUAGES.includes(code)) {
      problems.push({
        code: "language_not_supported",
        path: "languages",
        message: `"${code}" is not one of the ${LANGUAGES.length} content languages Payload has. Adding one is a line in packages/i18n/src/languages.ts (and languages.json) and a Payload migration.`,
      });
      continue;
    }
    if (!state.storeLocales.includes(locale)) {
      problems.push({
        code: "language_locale_unknown",
        path: "languages",
        message: `"${locale}" is not one of the store's locales (${state.storeLocales.join(", ") || "none"}). Add it in Medusa Admin (Settings → Store → Locales) first.`,
      });
      continue;
    }
    if (languageOfLocale(locale) !== code) {
      problems.push({
        code: "language_locale_mismatch",
        path: "languages",
        message: `The locale ${locale} is not a locale of the language "${code}".`,
      });
      continue;
    }
    if (htmlLang !== null && !isLanguageTag(htmlLang)) {
      problems.push({
        code: "html_lang_invalid",
        path: "languages",
        message: `"${entry.html_lang}" is not a language tag. Use a code such as pt-BR or de-CH, or leave it empty.`,
      });
      continue;
    }
    languages.push({
      code,
      medusa_locale: locale,
      html_lang: htmlLang,
      rank: state.languages.find((row) => row.code === code)?.rank ?? null,
    });
  }

  return {
    problems,
    settings: {
      primary_country: primary ?? state.settings.primary_country,
      fallback_market: fallback ?? state.settings.fallback_market,
    },
    languages,
    defaultRegionId:
      primary !== undefined && isCountryCode(primary)
        ? (findRegionCountry(state, primary)?.region_id ?? null)
        : null,
  };
}

/**
 * Warnings about what is stored, for `GET /admin/markets` (D91): the things Medusa's own screens
 * can change under the markets without a check (a region loses the primary country, a store
 * locale a market uses is removed). Medusa's forms are not blocked; the Store page's panel shows
 * these, and doctor fails on them.
 */
export function marketsProblems(state: MarketsState): Problem[] {
  const problems: Problem[] = [];
  const { primary_country: primary, fallback_market: fallback } = state.settings;
  const listed = state.countries.filter((row) => findRegionCountry(state, row.code) !== undefined);
  const open = listed.filter((row) => row.enabled);

  if (open.length === 0) {
    problems.push({
      code: "no_open_country",
      message: "No country is open. Open one in its region's Markets panel.",
    });
  }
  for (const row of state.countries) {
    if (findRegionCountry(state, row.code) === undefined && row.enabled) {
      problems.push({
        code: "open_country_not_in_region",
        path: row.code,
        message: `"${row.code}" is switched on but is in no Medusa region, so it is left out of the shop. Add it to a region again, or close it.`,
      });
    }
  }
  for (const row of open) {
    if (row.languages.length === 0) {
      problems.push({
        code: "country_open_without_language",
        path: row.code,
        message: `"${row.code}" is open but has no language.`,
      });
    }
  }

  const used = new Set(open.flatMap((row) => row.languages));
  for (const language of used) {
    const row = state.languages.find((candidate) => candidate.code === language);
    if (!LANGUAGES.includes(language)) {
      problems.push({
        code: "language_not_supported",
        path: language,
        message: `The language "${language}" is not one of the content languages Payload has.`,
      });
    } else if (row === undefined) {
      problems.push({
        code: "language_without_locale",
        path: language,
        message: `The language "${language}" has no locale chosen. Choose one in the Markets panel on the Store page.`,
      });
    } else if (!state.storeLocales.includes(row.medusa_locale)) {
      problems.push({
        code: "language_locale_gone",
        path: language,
        message: `The language "${language}" uses the locale ${row.medusa_locale}, which is no longer one of the store's locales (${state.storeLocales.join(", ") || "none"}). Add it back in Settings → Store → Locales, or choose another in the Markets panel on the Store page.`,
      });
    }
  }

  if (primary === null) {
    problems.push({
      code: "no_primary_country",
      path: "primary_country",
      message:
        "No primary country is set (the shop at /). Choose one in the Markets panel on the Store page.",
    });
  } else if (findRegionCountry(state, primary) === undefined) {
    problems.push({
      code: "primary_country_not_in_region",
      path: "primary_country",
      message: `The primary country "${primary}" is in no Medusa region any more. Add it to a region again, or choose another in the Markets panel on the Store page.`,
    });
  } else if (!isOpen(state, primary)) {
    problems.push({
      code: "primary_country_not_open",
      path: "primary_country",
      message: `The primary country "${primary}" is not open. Open it, or choose another primary country.`,
    });
  }
  const primaryRegion = primary === null ? undefined : findRegionCountry(state, primary)?.region_id;
  if (primaryRegion !== undefined && state.defaultRegionId !== primaryRegion) {
    problems.push({
      code: "default_region_differs",
      path: "primary_country",
      message: `The store's default region is not the primary country's region (${findRegionCountry(state, primary!)?.region_name}). Set it in the Store page, or save the primary country again.`,
    });
  }

  if (fallback === null) {
    problems.push({
      code: "no_fallback_market",
      path: "fallback_market",
      message:
        "No fallback market is set (hreflang x-default). Choose one in the Markets panel on the Store page.",
    });
  } else {
    const row = isMarketKey(fallback) ? findCountryRow(state, fallback.slice(3)) : undefined;
    if (
      !isMarketKey(fallback) ||
      !isOpen(state, fallback.slice(3)) ||
      !row?.languages.includes(fallback.slice(0, 2))
    ) {
      problems.push({
        code: "fallback_market_not_open",
        path: "fallback_market",
        message: `The fallback market "${fallback}" is not an open market. Choose another in the Markets panel on the Store page.`,
      });
    }
  }
  return problems;
}
