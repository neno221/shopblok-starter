import { catalogs, type Locale } from "@shopblok/i18n";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { overviewPath } from "../catalog";
import { NavTree } from "./nav-tree";

const copy = catalogs.en.designSystem;

/**
 * The chrome around every page but the frames: a header, the navigation tree and the content. It is
 * English (D33), so it says so with `lang`.
 */
export function Shell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <div lang="en" className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#content"
        className="bg-background focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:z-(--z-toast) focus:m-2 focus:rounded-md focus:p-3 focus:ring-2"
      >
        {copy.skipToContent}
      </a>
      <aside className="border-b p-4 lg:w-64 lg:shrink-0 lg:border-e lg:border-b-0">
        <Link
          href={overviewPath(locale) as Route}
          prefetch={false}
          className="text-lg font-semibold"
        >
          {copy.title}
        </Link>
        <div className="mt-4">
          <NavTree locale={locale} />
        </div>
      </aside>
      <main id="content" className="min-w-0 flex-1 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
