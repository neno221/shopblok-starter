import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { designSystemFixtures } from "@shopblok/fixtures";
import type { Route } from "next";
import Link from "next/link";

const copy = catalogs.en.designSystem;

/**
 * Links to the same page in the other locales (SPEC §9.6's locale toggle): the locale is a path
 * segment, not a query parameter, so every language is a static page. `hrefFor` gives the path of
 * the page in a locale. Each link says which market the locale renders with (D33).
 */
export function LocaleToggle({
  current,
  hrefFor,
}: {
  current: Locale;
  hrefFor: (locale: Locale) => string;
}) {
  return (
    <nav aria-label={copy.locale.label}>
      <ul className="flex flex-wrap gap-2">
        {LOCALES.map((locale) => {
          const { market } = designSystemFixtures[locale];
          const isCurrent = locale === current;
          return (
            <li key={locale}>
              <Link
                href={hrefFor(locale) as Route}
                prefetch={false}
                hrefLang={market.htmlLang}
                aria-current={isCurrent ? "page" : undefined}
                className="focus-visible:ring-ring inline-flex min-h-11 min-w-11 flex-col items-center justify-center rounded-md border px-3 text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground hover:bg-accent aria-[current=page]:hover:bg-primary focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="font-medium">{locale}</span>
                <span className="text-xs opacity-90">
                  {market.htmlLang} · {market.currency}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
