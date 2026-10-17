import { catalogs } from "@shopblok/i18n";
import type { Route } from "next";
import Link from "next/link";
import { entryPath, navigation, overviewPath } from "../../../../design-system/catalog";
import { LocaleToggle } from "../../../../design-system/components/locale-toggle";
import { createContext } from "../../../../design-system/context";
import { requireDesignSystemLocale } from "../../../../design-system/gate";

const copy = catalogs.en.designSystem;

// D44: a build fails if anything on this page reads the request (ADR 0004).
export const ensureStatic = "navigation";

// `/design-system/[locale]`: what is in the system, by group.
export default async function Overview() {
  const locale = await requireDesignSystemLocale();
  const { fixture } = createContext(locale);
  return (
    <article>
      <h1 className="text-3xl font-semibold">{copy.title}</h1>
      <p className="mt-2 max-w-prose">{copy.overviewIntro}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <LocaleToggle current={locale} hrefFor={overviewPath} />
        <p className="text-muted-foreground text-sm">
          {copy.fixtures.market}: {fixture.market.key} · {copy.fixtures.currency}:{" "}
          {fixture.market.currency}
        </p>
      </div>
      {navigation().map(({ group, entries }) => (
        <section key={group} aria-labelledby={`group-${group}`} className="mt-10">
          <h2 id={`group-${group}`} className="text-xl font-semibold">
            {copy.groups[group]}
          </h2>
          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-4">
                <Link
                  href={entryPath(locale, entry) as Route}
                  prefetch={false}
                  className="font-medium underline"
                >
                  {entry.label}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm">{entry.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
