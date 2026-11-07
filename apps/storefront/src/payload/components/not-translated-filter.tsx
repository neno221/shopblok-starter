import type { Payload } from "payload";
import { languagesBesidesEnglish } from "../filter-available-locales";
import { DEFAULT_LOCALE, languageLabel } from "../locales";
import "./translation-status.css";

type SearchParams = Record<string, string | string[] | undefined | unknown>;

/** The condition the filter puts in the list's URL, in the form Payload's own filter UI writes. */
const CONDITION = "where[or][0][and][0][value][exists]";

/**
 * The list of the messages `language` has no text of its own for (D107, T89): the list in that
 * language (`locale`) with `value` not set. A message emptied in the language is stored as `null`
 * (`ui-strings.ts`), and a language never written has no row; `exists: false` finds both. Every
 * message has its English (the seed writes it from the code's catalog), so "not set in Greek" is
 * "not translated in Greek". Written as Payload's filter UI writes a condition, so the Filters
 * panel shows it ("Value", "exists", "false") and can change it; a path naming the language
 * (`value.el`), which the API also takes, breaks that panel. The list then shows the language's
 * (empty) values, and a row opens its form in that language.
 */
export function notTranslatedQuery(language: string): string {
  const params = new URLSearchParams();
  params.set("locale", language);
  params.set(CONDITION, "false");
  return `?${params.toString()}`;
}

/** The language the list is filtered on now, if its URL is this filter's query. */
export function filteredLanguage(searchParams: SearchParams | undefined): string | null {
  if (searchParams === undefined) return null;
  const locale = searchParams["locale"];
  if (typeof locale !== "string" || locale === DEFAULT_LOCALE) return null;
  const flat = searchParams[CONDITION];
  const nested = (
    searchParams["where"] as { or?: { and?: { value?: { exists?: unknown } }[] }[] } | undefined
  )?.or?.[0]?.and?.[0]?.value?.exists;
  return String(flat ?? nested) === "false" ? locale : null;
}

/**
 * "Not translated in …" above the `ui-strings` list (`admin.components.beforeListTable`, D107): a
 * link per open language, one language at a time, each the list of the messages English has and
 * that language lacks; and one back to every message.
 */
export async function NotTranslatedFilter({
  payload,
  searchParams,
}: {
  payload: Payload;
  searchParams?: SearchParams;
}) {
  const languages = await languagesBesidesEnglish((message) => payload.logger.warn(message));
  if (languages.length === 0) return null;
  const current = filteredLanguage(searchParams);
  return (
    <nav className="not-translated" aria-label="Not translated in">
      <span className="not-translated__label">Not translated in:</span>
      <ul className="not-translated__languages">
        {languages.map((language) => (
          <li key={language}>
            <a
              href={notTranslatedQuery(language)}
              aria-current={current === language ? "true" : undefined}
              lang={language}
            >
              {languageLabel(language)}
            </a>
          </li>
        ))}
        {current === null ? null : (
          <li>
            <a href="?">Every message</a>
          </li>
        )}
      </ul>
    </nav>
  );
}
