/**
 * S2 prototype (not for main, D13). Locale helpers for the Meilisearch provider.
 */

/**
 * The ISO 639-1 codes Meilisearch 1.54.3 accepts in `locales` and `localizedAttributes`,
 * copied from its own error message ("expected one of ..."). It also takes the ISO 639-3
 * codes, which this prototype does not need. **Mongolian (`mn`, `mon`) is not in the list**,
 * and neither are many of the languages Medusa has a locale for: a hint for those is
 * dropped, and the text is tokenised without one.
 */
const MEILI_LANGUAGES = new Set(
  (
    "af ak am ar az be bn bg ca cs da de cy el en eo et fi fr gu he hi hr hu hy id it jv ja kn " +
    "ka km ko la lv lt ml mr mk my ne nl nb or pa fa pl pt ro ru si sk sl sn es sr sv ta te tl " +
    "th tk tr uk ur uz vi yi zh zu"
  ).split(" "),
);

/** `el-GR` becomes `el`, or `undefined` when Meilisearch has no such language. */
export function meiliLanguage(localeCode: string): string | undefined {
  const language = localeCode.split(/[-_]/)[0]?.toLowerCase();

  return language && MEILI_LANGUAGES.has(language) ? language : undefined;
}

/** `el-GR` becomes `el_GR`, a name that is safe in an attribute and an index uid. */
export function localeToken(localeCode: string): string {
  return localeCode.replace(/-/g, "_");
}
