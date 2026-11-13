/**
 * Locales and index names for the Meilisearch provider (D126, ADR 0002 decision 1). Pure: no
 * client, no container, so the search middleware, the product index and the tests can import it.
 */

/** The provider's identifier: `default_provider`, an index's `provider` and the middleware's check. */
export const MEILISEARCH_PROVIDER_ID = "meilisearch";

/**
 * The ISO 639-1 codes Meilisearch v1.56.2 accepts in `locales` and `localizedAttributes`, copied
 * from its own error message ("expected one of ...", checked 2026-11-12; the same list as v1.54.3's
 * in ADR 0002). It takes the ISO 639-3 codes too, which Medusa's locales never need. **Mongolian
 * (`mn`) is not in it**, nor are Malay, Swahili, Icelandic and others Medusa has a locale for: their
 * text is tokenised without a hint, and the provider says so once per locale.
 */
const MEILISEARCH_LANGUAGES = new Set(
  (
    "af ak am ar az be bn bg ca cs da de cy el en eo et fi fr gu he hi hr hu hy id it jv ja kn " +
    "ka km ko la lv lt ml mr mk my ne nl nb or pa fa pl pt ro ru si sk sl sn es sr sv ta te tl " +
    "th tk tr uk ur uz vi yi zh zu"
  ).split(" "),
);

/** `el-GR` becomes `el`; `undefined` when Meilisearch has no such language (`mn-MN`). */
export function meilisearchLanguage(locale: string): string | undefined {
  const language = locale.split(/[-_]/)[0]?.toLowerCase();

  return language && MEILISEARCH_LANGUAGES.has(language) ? language : undefined;
}

// A BCP 47-like code as Medusa writes its locales: `en-US`, `pt-BR`, `zh-Hans-CN`. Only these
// characters reach an index uid, which Meilisearch limits to letters, digits, `-` and `_`.
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/;

export function isLocaleCode(value: unknown): value is string {
  return typeof value === "string" && LOCALE_PATTERN.test(value);
}

/** Between a version's physical name and the locale: `product_v3__el-GR`. */
export const LOCALE_SEPARATOR = "__";

/** The index of one locale of a physical (versioned) index. */
export function localeIndexUid(physicalName: string, locale: string): string {
  return `${physicalName}${LOCALE_SEPARATOR}${locale}`;
}

/**
 * The physical index and the locale of a Meilisearch uid. The physical name ends in `_v<N>`
 * (Medusa's version suffix), which is what makes the split safe when a prefix or an index name
 * holds `__` itself. A uid with no locale part is returned whole.
 */
export function splitLocaleIndex(uid: string): { physical: string; locale?: string } {
  const at = uid.lastIndexOf(LOCALE_SEPARATOR);

  if (at > 0) {
    const physical = uid.slice(0, at);
    const locale = uid.slice(at + LOCALE_SEPARATOR.length);

    if (/_v\d+$/.test(physical) && isLocaleCode(locale)) {
      return { physical, locale };
    }
  }

  return { physical: uid };
}
