import { catalogs, type Locale } from "@shopblok/i18n";
import { entryPath, navigation, overviewPath } from "../catalog";
import type { DsEntry } from "../types";
import { NavLink } from "./nav-link";

const copy = catalogs.en.designSystem;

/** The navigation tree: the overview, then each group that has entries (SPEC §9.6). */
export function NavTree({ locale, entries }: { locale: Locale; entries?: readonly DsEntry[] }) {
  return (
    <nav aria-label={copy.navLabel}>
      <ul>
        <li>
          <NavLink href={overviewPath(locale)}>{copy.overview}</NavLink>
        </li>
      </ul>
      {navigation(entries).map(({ group, entries: members }) => (
        <div key={group} className="mt-4">
          <h2 className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">
            {copy.groups[group]}
          </h2>
          <ul className="mt-1">
            {members.map((entry) => (
              <li key={entry.id}>
                <NavLink href={entryPath(locale, entry)}>{entry.label}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
