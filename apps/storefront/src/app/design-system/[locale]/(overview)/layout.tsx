import type { ReactNode } from "react";
import { localeParams } from "../../../../design-system/catalog";
import { Document } from "../../../../design-system/components/document";
import { Shell } from "../../../../design-system/components/shell";
import { requireDesignSystemLocale, staticParams } from "../../../../design-system/gate";
import { designSystemMetadata } from "../../../../design-system/metadata";
import "../../../../styles/globals.css";

export const metadata = designSystemMetadata;

// The DS has three root layouts, one per kind of route (D33; the app has none at the top, and
// `(payload)`, `[market]` and `global-not-found` each bring their own). This one is for the
// overview, `/design-system/[locale]`; `locale` is its root param. With Cache Components every root
// param needs at least one value: the four locales (one when the flag is off, see `staticParams`).
// Every DS route is a 404 unless the flag is on (D33) and the locale is one of the four.
export function generateStaticParams() {
  return staticParams(localeParams());
}

export default async function OverviewRootLayout({ children }: { children: ReactNode }) {
  const locale = await requireDesignSystemLocale();
  return (
    <Document locale={locale}>
      <Shell locale={locale}>{children}</Shell>
    </Document>
  );
}
